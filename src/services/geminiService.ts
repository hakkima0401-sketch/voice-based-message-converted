import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const CONVERSION_STYLES = [
  { id: 'professional', name: 'Professional', icon: 'Briefcase', prompt: 'Convert this message into a professional, polite business email format.' },
  { id: 'casual', name: 'Casual', icon: 'MessageCircle', prompt: 'Convert this message into a friendly, casual text message style.' },
  { id: 'pirate', name: 'Pirate', icon: 'Skull', prompt: 'Convert this message into pirate speak. Arrr!' },
  { id: 'shakespeare', name: 'Shakespeare', icon: 'Scroll', prompt: 'Convert this message into Old English Shakespearean style.' },
  { id: 'emoji', name: 'Emoji-fied', icon: 'Smile', prompt: 'Convert this message into a version filled with relevant emojis.' },
  { id: 'summary', name: 'Summary', icon: 'FileText', prompt: 'Summarize this message into a single concise sentence.' },
];

export async function transcribeAndConvert(audioBase64: string, mimeType: string, stylePrompt: string) {
  const model = ai.models.generateContent({
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
            text: `First, transcribe the audio exactly. Then, ${stylePrompt}. Return the result in JSON format with two fields: "transcription" and "convertedText".`,
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
    },
  });

  const result = await model;
  try {
    return JSON.parse(result.text || "{}");
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    return { transcription: "Error transcribing", convertedText: "Error converting" };
  }
}

export async function textToSpeech(text: string, voiceName: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr' = 'Kore') {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (base64Audio) {
    return `data:audio/mp3;base64,${base64Audio}`;
  }
  return null;
}
