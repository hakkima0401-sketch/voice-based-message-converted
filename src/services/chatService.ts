import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const FAQ_CONTEXT = `
You are a helpful FAQ assistant for "SmartFAQ". 
Here is some specific information about our service:
- SmartFAQ is an AI-powered chatbot.
- It uses Google's Gemini models for natural language understanding.
- It supports both text and voice interactions.
- Users can ask about anything, but you should prioritize being helpful, concise, and polite.
- If you don't know an answer specifically about the company, you can use your general knowledge but mention you are an AI assistant.
- Our mission is to make information accessible through simple conversation.
`;

export async function getChatResponse(message: string, history: { role: 'user' | 'model'; parts: { text: string }[] }[]) {
  const chat = ai.chats.create({
    model: "gemini-3-flash-preview",
    config: {
      systemInstruction: FAQ_CONTEXT,
    },
    history: history,
  });

  const response = await chat.sendMessage({ message });
  return response.text;
}

export async function transcribeAudio(audioBase64: string, mimeType: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        parts: [
          {
            inlineData: {
              data: audioBase64,
              mimeType: mimeType,
            },
          },
          {
            text: "Transcribe this audio exactly. Return only the transcription text.",
          },
        ],
      },
    ],
  });

  return response.text;
}
