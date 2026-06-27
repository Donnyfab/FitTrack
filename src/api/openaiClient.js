import { supabase } from '@/lib/supabase';

/**
 * ChatGPT API via Supabase Edge Function (keeps OPENAI_API_KEY off the client).
 * Configure the `openai-chat` function in supabase/functions/openai-chat.
 */
export async function chatCompletion(messages, options = {}) {
  const { data, error } = await supabase.functions.invoke('openai-chat', {
    body: {
      messages,
      model: options.model || 'gpt-4o-mini',
      temperature: options.temperature ?? 0.7,
      response_format: options.response_format,
    },
  });

  if (error) {
    throw new Error(error.message || 'OpenAI request failed');
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
    throw new Error('Empty response from ChatGPT');
  }

  return JSON.parse(content);
}
