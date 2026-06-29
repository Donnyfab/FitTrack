import { supabase } from '@/lib/supabase';

/**
 * AI chat via Vercel API with Supabase Edge Function fallback.
 * Keeps OpenAI/Anthropic keys off the client.
 * Configure `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` on the server runtime.
 */
export async function chatCompletion(messages, options = {}) {
  const body = {
    messages,
    model: options.model || 'gpt-4o-mini',
    temperature: options.temperature ?? 0.7,
    response_format: options.response_format,
  };
  let apiError = null;

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const response = await fetch('/api/ai-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify(body),
    });

    const isJson = response.headers.get('content-type')?.includes('application/json');
    if (response.ok && isJson) {
      return response.json();
    }

    if (response.status !== 404 && isJson) {
      const payload = await response.json().catch(() => ({}));
      apiError = new Error(payload.error || `AI request failed with ${response.status}`);
    }
  } catch (error) {
    apiError = error;
  }

  const { data, error } = await supabase.functions.invoke('openai-chat', {
    body,
  });

  if (error) {
    throw apiError || new Error(error.message || 'AI request failed');
  }

  return data;
}

export async function chatJSON(systemPrompt, userPrompt, options = {}) {
  const result = await chatCompletion(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    {
      ...options,
      response_format: { type: 'json_object' },
    }
  );

  const content = result?.content ?? result?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Empty response from AI provider');
  }

  return JSON.parse(content);
}
