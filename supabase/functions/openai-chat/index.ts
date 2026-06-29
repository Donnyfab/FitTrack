import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import OpenAI from "npm:openai@4";
import Anthropic from "npm:@anthropic-ai/sdk@0.32.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization") ?? "" },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, model = "gpt-4o-mini", temperature = 0.7, response_format } =
      await req.json();

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    let completion;
    let content = "";

    if (openaiKey) {
      const openai = new OpenAI({ apiKey: openaiKey });
      completion = await openai.chat.completions.create({
        model,
        messages,
        temperature,
        ...(response_format ? { response_format } : {}),
      });
      content = completion.choices[0]?.message?.content ?? "";
    } else if (anthropicKey) {
      const anthropic = new Anthropic({ apiKey: anthropicKey });
      const systemMessages = messages.filter((message) => message.role === "system");
      const chatMessages = messages
        .filter((message) => message.role !== "system")
        .map((message) => ({
          role: message.role === "assistant" ? "assistant" : "user",
          content: String(message.content ?? ""),
        }));
      const system = [
        ...systemMessages.map((message) => String(message.content ?? "")),
        response_format?.type === "json_object"
          ? "Return one valid JSON object only. Do not wrap it in markdown."
          : "",
      ].filter(Boolean).join("\n\n");

      completion = await anthropic.messages.create({
        model: Deno.env.get("ANTHROPIC_MODEL") || "claude-sonnet-4-6",
        max_tokens: 2500,
        temperature,
        system,
        messages: chatMessages,
      });
      content = completion.content
        ?.map((block) => block.type === "text" ? block.text : "")
        .join("")
        .trim() ?? "";
    } else {
      return new Response(JSON.stringify({ error: "No AI API key configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ content, choices: completion.choices ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message ?? "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
