
import { GoogleGenAI } from "@google/genai";

const TEXT_MODEL = "gemini-3-flash-preview";
const IMAGE_MODEL = "gemini-3-pro-image-preview"; // Nano Banana Pro / Image Preview
const VIDEO_MODEL = "veo-3.1-fast-generate-preview";

// Helper to ensure we always use the latest key available in the environment
const getAiClient = () => {
  // process.env.API_KEY is automatically updated when the user selects a key via window.aistudio
  if (!process.env.API_KEY) return null;
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// --- TEXT ---

export const generateRivalProfile = async (): Promise<{ name: string; personality: string; intro: string }> => {
  const ai = getAiClient();
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
    // Efficiency: Early exit on empty prompt
    if (!prompt || prompt.trim() === "") return null;

    // 1. Mandatory Key Selection for High-Quality Models
    if (typeof window !== 'undefined' && (window as any).aistudio) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) {
            try {
                await (window as any).aistudio.openSelectKey();
            } catch (e) {
                console.error("Key selection failed", e);
                return null;
            }
        }
    }

    // 2. Re-instantiate client to grab the selected key
    const ai = getAiClient();
    if (!ai) return null;
    
    try {
        const fullPrompt = `Cyberpunk motorcycle rider, neon aesthetics, futuristic helmet, detailed armor: ${prompt}`;
        
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
    // Efficiency: Validate input
    if (!imageBase64) return null;

    // 1. Mandatory Key Selection
    if (typeof window !== 'undefined' && (window as any).aistudio) {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) {
            try {
                await (window as any).aistudio.openSelectKey();
            } catch (e) {
                console.error("Key selection failed", e);
                return null;
            }
        }
    }

    // 2. Re-instantiate client
    const ai = getAiClient();
    if (!ai) return null;

    try {
        // Strip prefix if present for raw bytes
        const base64Data = imageBase64.split(',')[1] || imageBase64;

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
