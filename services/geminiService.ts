
import { GoogleGenAI } from "@google/genai";

let ai: GoogleGenAI | null = null;

// Initialize if API Key exists
if (process.env.API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
}

const TEXT_MODEL = "gemini-3-flash-preview";
const IMAGE_MODEL = "gemini-3-pro-image-preview"; // Nano Banana Pro / Image Preview
const VIDEO_MODEL = "veo-3.1-fast-generate-preview";

// --- TEXT ---

export const generateRivalProfile = async (): Promise<{ name: string; personality: string; intro: string }> => {
  if (!ai) return { name: "Viper", personality: "Aggressive", intro: "Eat my dust!" };

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: "Generate a profile for a cyberpunk biker rival. JSON keys: name, personality, intro.",
      config: { responseMimeType: "application/json" }
    });
    return response.text ? JSON.parse(response.text) : { name: "Cipher", personality: "Cold", intro: "Calculated." };
  } catch (error) {
    console.error("Gemini Text Error:", error);
    return { name: "Glitch", personality: "Unstable", intro: "System error..." };
  }
};

// --- IMAGE (Nano Banana Pro) ---

export const generateRiderImage = async (prompt: string, size: '1K' | '2K' | '4K' = '1K'): Promise<string | null> => {
    if (!ai) return null;
    
    try {
        const fullPrompt = `Cyberpunk motorcycle rider, neon aesthetics, futuristic helmet, detailed armor: ${prompt}`;
        
        // Using generateContent for image generation as per guidelines for nano banana series
        // Note: Guideline says 'gemini-3-pro-image-preview' supports size config
        const response = await ai.models.generateContent({
            model: IMAGE_MODEL,
            contents: {
                parts: [{ text: fullPrompt }]
            },
            config: {
                imageConfig: {
                    aspectRatio: "1:1",
                    imageSize: size
                }
            }
        });

        // Extract image from response
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }
        return null;
    } catch (e) {
        console.error("Gemini Image Gen Error:", e);
        return null;
    }
}

// --- VIDEO (Veo) ---

export const generateVictoryVideo = async (imageBase64: string): Promise<string | null> => {
    // Veo requires specific key handling check as per guidelines
    if (typeof window !== 'undefined' && (window as any).aistudio) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) {
            await (window as any).aistudio.openSelectKey();
            // Race condition mitigation: assume success after modal
        }
    }

    // Re-init AI with potentially new key if we were in a specific env, 
    // but here we stick to the process.env key unless we are in the specific demo env.
    // Assuming process.env.API_KEY is the paid key for this feature.
    if (!ai) return null;

    try {
        // Strip prefix if present for raw bytes
        const base64Data = imageBase64.split(',')[1];

        let operation = await ai.models.generateVideos({
            model: VIDEO_MODEL,
            prompt: "Cinematic shot of this cyberpunk racer speeding through a neon city at night, victory celebration, sparks flying, ultra realistic, 4k",
            image: {
                imageBytes: base64Data,
                mimeType: 'image/png' 
            },
            config: {
                numberOfVideos: 1,
                resolution: '720p', // Veo fast preview limit
                aspectRatio: '16:9'
            }
        });

        // Polling loop
        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }

        const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (videoUri) {
            // Fetch the actual bytes using the key
            const videoRes = await fetch(`${videoUri}&key=${process.env.API_KEY}`);
            const blob = await videoRes.blob();
            return URL.createObjectURL(blob);
        }
        return null;

    } catch (e) {
        console.error("Veo Video Gen Error:", e);
        return null;
    }
}
