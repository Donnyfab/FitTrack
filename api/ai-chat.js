import { createClient } from "@supabase/supabase-js";

const jsonHeaders = { "Content-Type": "application/json" };

function getBearerToken(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : "";
}

function getTextContent(content) {
  if (Array.isArray(content)) {
    return content.map((block) => block?.text || "").join("").trim();
  }
  return String(content || "");
}

async function verifyUser(req) {
  const token = getBearerToken(req);
  if (!token) return null;

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
  });
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return null;
  return data.user;
}

async function callOpenAI({ messages, model, temperature, response_format }) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      ...jsonHeaders,
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: model || "gpt-4o-mini",
      messages,
      temperature,
      ...(response_format ? { response_format } : {}),
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `OpenAI request failed with ${response.status}`);
  }

  const data = await response.json();
  return {
    content: data.choices?.[0]?.message?.content || "",
    choices: data.choices || [],
    provider: "openai",
  };
}

async function callAnthropic({ messages, temperature, response_format }) {
  const systemMessages = messages.filter((message) => message.role === "system");
  const chatMessages = messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: getTextContent(message.content),
    }));
  const system = [
    ...systemMessages.map((message) => getTextContent(message.content)),
    response_format?.type === "json_object"
      ? "Return one valid JSON object only. Do not wrap it in markdown."
      : "",
  ].filter(Boolean).join("\n\n");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      ...jsonHeaders,
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6",
      max_tokens: Number(process.env.ANTHROPIC_MAX_TOKENS || 6000),
      temperature,
      system,
      messages: chatMessages,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Anthropic request failed with ${response.status}`);
  }

  const data = await response.json();
  return {
    content: getTextContent(data.content),
    choices: [],
    provider: "anthropic",
  };
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const user = await verifyUser(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const payload = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const { messages = [], model = "gpt-4o-mini", temperature = 0.7, response_format } = payload;
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "Messages are required" });
      return;
    }

    if (process.env.OPENAI_API_KEY) {
      res.status(200).json(await callOpenAI({ messages, model, temperature, response_format }));
      return;
    }

    if (process.env.ANTHROPIC_API_KEY) {
      res.status(200).json(await callAnthropic({ messages, temperature, response_format }));
      return;
    }

    res.status(500).json({ error: "No AI API key configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY." });
  } catch (error) {
    res.status(500).json({ error: error?.message || "AI request failed" });
  }
}
