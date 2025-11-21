
import { GoogleGenAI, Type } from "@google/genai";
import { SignDetectionResult, SignLanguage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to clean base64 strings
const cleanBase64 = (data: string) => data.split(',')[1] || data;

// Helper to clean JSON markdown
const cleanJson = (text: string) => {
  if (!text) return "";
  return text.replace(/^```json\s*/, "").replace(/\s*```$/, "");
};

export const detectSignLanguage = async (base64Image: string, language: SignLanguage): Promise<SignDetectionResult> => {
  const langFull = language === 'ISL' ? 'Indian Sign Language (ISL)' : 'American Sign Language (ASL)';
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: cleanBase64(base64Image),
            },
          },
          {
            text: `Analyze this image for ${langFull}. 
            1. Identify the hand gesture. It could be a finger-spelled letter or a whole word.
            2. If the hand shape is clear, translate it. 
            3. If it looks like a natural gesture but not a strict sign, provide the closest meaning.
            4. Return 'isSign: false' ONLY if no hands are visible or the image is completely blurry.
            
            Output JSON.`
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isSign: { type: Type.BOOLEAN },
            translation: { type: Type.STRING },
            confidence: { type: Type.NUMBER, description: "Confidence score 0-1" },
            description: { type: Type.STRING }
          },
          required: ["isSign", "translation", "confidence"],
        },
        systemInstruction: `You are a helpful Sign Language Translator specialized in ${langFull}. You are lenient with imperfect signs and try your best to interpret the user's intent.`,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response text from AI");
    
    const cleanText = cleanJson(text);
    return JSON.parse(cleanText) as SignDetectionResult;

  } catch (error) {
    console.error("Gemini Word Error:", error);
    return { isSign: false, translation: "", confidence: 0, description: "Detection Error" };
  }
};

export const detectSignSentence = async (base64Images: string[], language: SignLanguage): Promise<SignDetectionResult> => {
  const langFull = language === 'ISL' ? 'Indian Sign Language (ISL)' : 'American Sign Language (ASL)';
  
  try {
    // Limit frames to max 15 to avoid payload limits, taking evenly spaced frames if more exist
    const framesToProcess = base64Images.length > 15 
      ? base64Images.filter((_, i) => i % Math.ceil(base64Images.length / 15) === 0)
      : base64Images;

    const imageParts = framesToProcess.map(img => ({
      inlineData: {
        mimeType: "image/jpeg",
        data: cleanBase64(img),
      }
    }));

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          ...imageParts,
          {
            text: `You are viewing a video sequence (chronological frames) of someone signing in ${langFull}.
            Your task is to translate the SEQUENCE of gestures into a complete, coherent English sentence.
            - Fix grammar and sentence structure.
            - Ignore transition frames (blur between signs).
            - If the gestures are just random, set isSign to false.
            - Return the full sentence in the 'translation' field.`
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isSign: { type: Type.BOOLEAN },
            translation: { type: Type.STRING, description: "The complete sentence" },
            confidence: { type: Type.NUMBER },
            description: { type: Type.STRING, description: "Brief explanation of the gestures seen" }
          },
          required: ["isSign", "translation"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response text from AI");

    const cleanText = cleanJson(text);
    return JSON.parse(cleanText) as SignDetectionResult;

  } catch (error) {
    console.error("Gemini Sentence Error:", error);
    return { isSign: false, translation: "", confidence: 0, description: "Error processing sentence" };
  }
};
