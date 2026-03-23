# Murf AI Voice Bot Starter

This is a hackathon-ready starter project for a browser-based voice bot using OpenRouter for LLM responses and Murf AI for text to speech.

## What it does

- Accepts spoken input with the browser Speech Recognition API
- Generates an AI reply with OpenRouter
- Sends that response to Murf AI for voice generation
- Plays the returned audio in the browser

## Quick start

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a `.env` file from `.env.example` and add your Murf API key and OpenRouter API key.

3. Start the app:

   ```bash
   npm start
   ```

4. Open `http://localhost:3000`

## Recommended keys

- `OPENROUTER_API_KEY`: OpenRouter API key for the chatbot brain
- `MURF_API_KEY`: Murf API key for voice output

## Notes

- If `OPENROUTER_API_KEY` is missing or OpenRouter fails, the app falls back to a simple rules-based response.
- Browser speech recognition works best in Chrome or Edge.
