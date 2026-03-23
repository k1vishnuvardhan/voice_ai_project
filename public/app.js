const statusBadge = document.getElementById("statusBadge");
const voiceInfo = document.getElementById("voiceInfo");
const textInput = document.getElementById("textInput");
const userText = document.getElementById("userText");
const botText = document.getElementById("botText");
const listenBtn = document.getElementById("listenBtn");
const sendBtn = document.getElementById("sendBtn");
const stopAudioBtn = document.getElementById("stopAudioBtn");

const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

let recognition;
let currentAudio;
let isListening = false;

async function loadHealth() {
  try {
    const response = await fetch("/api/health");
    const data = await response.json();

    const murfStatus = data.murfConfigured ? "Murf connected" : "Murf key missing";
    const llmStatus = data.openRouterConfigured
      ? "OpenRouter connected"
      : "OpenRouter key missing";

    statusBadge.textContent = `${murfStatus} | ${llmStatus}`;
    voiceInfo.textContent = `Voice: ${data.voiceId} | LLM: ${data.llmModel}`;
  } catch (error) {
    statusBadge.textContent = "Server unavailable";
    voiceInfo.textContent = error.message;
  }
}

async function sendMessage(message) {
  userText.textContent = message;
  botText.textContent = "Thinking...";

  const chatResponse = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message })
  });

  const chatData = await chatResponse.json();

  if (!chatResponse.ok) {
    botText.textContent = chatData.error || "Unable to generate a bot reply.";
    return;
  }

  botText.textContent = chatData.reply;

  if (chatData.warning) {
    botText.textContent += `\n\n${chatData.warning}`;
  }

  await speakReply(chatData.reply);
}

async function speakReply(text) {
  try {
    const response = await fetch("/api/voice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text })
    });

    const data = await response.json();

    if (!response.ok) {
      botText.textContent += `\n\nVoice error: ${data.error || "Unknown error"}`;
      return;
    }

    const src = data.audioUrl
      || (data.encodedAudio ? `data:audio/mp3;base64,${data.encodedAudio}` : null);

    if (!src) {
      botText.textContent += "\n\nVoice error: No playable audio returned.";
      return;
    }

    if (currentAudio) {
      currentAudio.pause();
    }

    currentAudio = new Audio(src);
    await currentAudio.play();
  } catch (error) {
    botText.textContent += `\n\nVoice error: ${error.message}`;
  }
}

function setupRecognition() {
  if (!SpeechRecognition) {
    listenBtn.disabled = true;
    listenBtn.textContent = "Speech Recognition Unsupported";
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    isListening = true;
    listenBtn.textContent = "Listening...";
    statusBadge.textContent = "Listening";
  };

  recognition.onresult = async (event) => {
    const transcript = event.results[0][0].transcript;
    textInput.value = transcript;
    await sendMessage(transcript);
  };

  recognition.onerror = (event) => {
    statusBadge.textContent = `Mic error: ${event.error}`;
  };

  recognition.onend = () => {
    isListening = false;
    listenBtn.textContent = "Start Listening";
    loadHealth();
  };
}

listenBtn.addEventListener("click", () => {
  if (!recognition) {
    return;
  }

  if (isListening) {
    recognition.stop();
    return;
  }

  recognition.start();
});

sendBtn.addEventListener("click", async () => {
  const message = textInput.value.trim();

  if (!message) {
    userText.textContent = "Type or speak a message first.";
    return;
  }

  await sendMessage(message);
});

stopAudioBtn.addEventListener("click", () => {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
  }
});

setupRecognition();
loadHealth();
