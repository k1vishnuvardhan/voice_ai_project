const express = require("express");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";
const MURF_API_KEY = process.env.MURF_API_KEY;
const MURF_VOICE_ID = process.env.MURF_VOICE_ID || "en-US-natalie";
const MURF_API_URL = "https://api.murf.ai/v1/speech/generate";
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL || "openrouter/auto";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function generateBotReply(message) {
  const normalized = message.toLowerCase();

  if (normalized.includes("hello") || normalized.includes("hi")) {
    return "Hello! I am your voice assistant. How can I help you today?";
  }

  if (normalized.includes("who are you") || normalized.includes("what can you do")) {
    return "I am a browser based voice assistant that can answer questions, help with ideas, and speak responses aloud using AI voice synthesis.";
  }

  if (normalized.includes("time")) {
    return "I cannot check your local clock directly, but I can still help with questions, explanations, and spoken responses.";
  }

  if (normalized.includes("weather")) {
    return "I do not have live weather data connected right now, but I can still help with general questions and conversation.";
  }

  if (normalized.includes("bye")) {
    return "Goodbye. I am here whenever you need me again.";
  }

  return `You said: ${message}. I can help with general questions, simple brainstorming, explanations, and spoken replies.`;
}

async function generateOpenRouterReply(message) {
  if (!OPENROUTER_API_KEY) {
    return generateBotReply(message);
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "Murf Voice Bot Hackathon"
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      temperature: 0.5,
      max_tokens: 180,
      messages: [
        {
          role: "system",
          content:
            "You are a friendly general-purpose voice assistant. Give concise, natural spoken replies. Keep answers under 3 short sentences unless the user asks for more detail."
        },
        {
          role: "user",
          content: message
        }
      ]
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "OpenRouter API request failed.");
  }

  return data.choices?.[0]?.message?.content?.trim() || generateBotReply(message);
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    murfConfigured: Boolean(MURF_API_KEY),
    openRouterConfigured: Boolean(OPENROUTER_API_KEY),
    voiceId: MURF_VOICE_ID,
    llmModel: OPENROUTER_MODEL
  });
});

app.post("/api/chat", async (req, res) => {
  const { message } = req.body;

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "A message string is required." });
  }

  try {
    const reply = await generateOpenRouterReply(message.trim());
    return res.json({
      reply,
      provider: OPENROUTER_API_KEY ? "openrouter" : "fallback"
    });
  } catch (error) {
    const fallbackReply = generateBotReply(message.trim());
    return res.json({
      reply: fallbackReply,
      provider: "fallback",
      warning: `OpenRouter unavailable: ${error.message}`
    });
  }
});

app.post("/api/voice", async (req, res) => {
  const { text } = req.body;

  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "A text string is required." });
  }

  if (!MURF_API_KEY) {
    return res.status(500).json({
      error: "Missing MURF_API_KEY. Add it to your .env file before using voice output."
    });
  }

  try {
    const response = await fetch(MURF_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": MURF_API_KEY
      },
      body: JSON.stringify({
        text,
        voiceId: MURF_VOICE_ID,
        format: "MP3"
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.message || "Murf API request failed.",
        details: data
      });
    }

    return res.json({
      audioUrl: data.audioFile,
      encodedAudio: data.encodedAudio || null,
      duration: data.audioLengthInSeconds || null
    });
  } catch (error) {
    return res.status(500).json({
      error: "Unable to reach Murf API.",
      details: error.message
    });
  }
});

app.listen(PORT, HOST, () => {
  console.log(`Voice bot running on ${HOST}:${PORT}`);
});
