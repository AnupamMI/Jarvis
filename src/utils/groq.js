// Strips anything outside printable ASCII (smart quotes, zero-width spaces,
// stray newlines, etc. picked up from copy/paste) — HTTP headers must be
// Latin-1, and a real Groq key is plain ASCII anyway, so this is safe.
function sanitizeApiKey(key) {
  return (key || '').replace(/[^\x20-\x7E]/g, '').trim();
}

const SYSTEM_PROMPT = `You are JARVIS, the artificial intelligence assistant built by Tony Stark.
Respond in a highly intelligent, polite, and slightly dry British manner.
Address the user as 'Sir'.
Keep spoken responses brief (no more than 3 sentences or 60 words) because they will be read aloud by a text-to-speech engine.
Avoid any markdown formatting such as bolding (**), asterisks, or lists, as they disrupt TTS reading.

You have tools to control the HUD interface and open websites. Use them whenever the user's request matches, even if their phrasing is loose, garbled, or contains speech-recognition noise (e.g. "google search" may come through as "google and" or "google and search" — treat these as a web search request regardless of the exact wording).

Never include a raw URL or web address in your response. The tool already opens the page for the user — just confirm what you did in natural spoken language (e.g. "I've opened that on YouTube for you, Sir"), since your reply is read aloud and a spelled-out link is meaningless to hear.`;

export const JARVIS_TOOLS = [
  {
    type: "function",
    function: {
      name: "search_web",
      description: "Search Google or YouTube for a query, or open the site's homepage if no query is given. Use this any time the user wants to search or browse the web, including garbled phrasing like 'google and X' or 'youtube search X'.",
      parameters: {
        type: "object",
        properties: {
          engine: { type: "string", enum: ["google", "youtube"], description: "Which site to search or open" },
          query: { type: "string", description: "The search query. Leave empty to just open the homepage." }
        },
        required: ["engine"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "set_theme",
      description: "Change the HUD color theme.",
      parameters: {
        type: "object",
        properties: {
          theme: { type: "string", enum: ["cyan", "red", "gold", "green"], description: "cyan=classic, red=alert, gold=hulkbuster, green=stealth" }
        },
        required: ["theme"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "trigger_red_alert",
      description: "Engage red alert lockdown mode with alarm.",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "trigger_self_destruct",
      description: "Engage the self destruct countdown sequence.",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "run_diagnostics",
      description: "Run a system diagnostics / status sweep.",
      parameters: { type: "object", properties: {} }
    }
  },
  {
    type: "function",
    function: {
      name: "clear_logs",
      description: "Clear the terminal log display.",
      parameters: { type: "object", properties: {} }
    }
  }
];

export async function askGroq(prompt, apiKey, model = 'openai/gpt-oss-20b', history = []) {
  const cleanKey = sanitizeApiKey(apiKey);
  if (!cleanKey) {
    throw new Error("Groq API Key is missing or invalid. Please re-enter it in Settings.");
  }

  const isReasoningModel = model.startsWith('openai/gpt-oss');

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history,
    { role: "user", content: prompt }
  ];

  const body = {
    model,
    messages,
    temperature: 0.7,
    max_tokens: 512,
    tools: JARVIS_TOOLS,
    tool_choice: "auto",
    ...(isReasoningModel ? { reasoning_effort: "low" } : {})
  };

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${cleanKey}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData?.error?.message || `HTTP error! Status: ${response.status}`;
      throw new Error(message);
    }

    const data = await response.json();
    const choice = data?.choices?.[0];
    const message = choice?.message;

    if (!message) {
      throw new Error("Invalid response structure from Groq API.");
    }

    // Tool call requested
    if (message.tool_calls && message.tool_calls.length > 0) {
      return {
        type: "tool_calls",
        toolCalls: message.tool_calls.map(tc => ({
          id: tc.id,
          name: tc.function.name,
          args: (() => {
            try { return JSON.parse(tc.function.arguments || "{}"); }
            catch { return {}; }
          })()
        })),
        assistantMessage: message
      };
    }

    // Plain text reply
    if (!message.content) {
      throw new Error("Invalid response structure from Groq API.");
    }

    return { type: "text", text: message.content.trim() };
  } catch (error) {
    console.error("Groq API error:", error);
    throw error;
  }
}

// Follow-up call after executing tool(s), so JARVIS can narrate the result in-voice
export async function askGroqToolFollowup(apiKey, model, history, assistantMessage, toolResults) {
  const cleanKey = sanitizeApiKey(apiKey);
  const isReasoningModel = model.startsWith('openai/gpt-oss');

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history,
    assistantMessage,
    ...toolResults.map(tr => ({
      role: "tool",
      tool_call_id: tr.id,
      name: tr.name,
      content: tr.result
    }))
  ];

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${cleanKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 256,
      ...(isReasoningModel ? { reasoning_effort: "low" } : {})
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `HTTP error! Status: ${response.status}`);
  }

  const data = await response.json();
  const reply = data?.choices?.[0]?.message?.content;
  return reply ? reply.trim() : "Done, Sir.";
}
