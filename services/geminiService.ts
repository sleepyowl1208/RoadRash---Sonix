import { GoogleGenAI } from "@google/genai";

let ai: GoogleGenAI | null = null;

if (process.env.API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
} else {
  console.warn("Gemini API Key is missing. AI features will be disabled.");
}

const MODEL_NAME = "gemini-3-flash-preview";

export const generateRivalProfile = async (): Promise<{ name: string; personality: string; intro: string }> => {
  if (!ai) return { name: "Viper", personality: "Aggressive", intro: "Eat my dust!" };

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: "Generate a profile for a cyberpunk biker rival in a futuristic road rash game. Return JSON with keys: name, personality (adjective), intro (short threat).",
      config: {
        responseMimeType: "application/json",
      }
    });
    
    const text = response.text;
    if (text) {
        return JSON.parse(text);
    }
    return { name: "Cipher", personality: "Cold", intro: "Calculated elimination." };
  } catch (error) {
    console.error("Gemini Error:", error);
    return { name: "Glitch", personality: "Unstable", intro: "System error..." };
  }
};

export const generateCombatBark = async (rivalName: string, action: 'hit_player' | 'hit_rival' | 'crash'): Promise<string> => {
  if (!ai) return "Watch it!";

  const prompts = {
    hit_player: `You are ${rivalName}. You just kicked the player. Scream a short 3-5 word insult.`,
    hit_rival: `You are ${rivalName}. The player just hit you with a chain. Scream a short 3-5 word reaction of pain and anger.`,
    crash: `You are ${rivalName}. You just saw the player crash. Laugh at them in 3-5 words.`
  };

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompts[action],
      config: {
        maxOutputTokens: 20,
      }
    });
    return response.text || "!!!";
  } catch (error) {
    return "Argh!";
  }
};

export const generateRaceSummary = async (won: boolean, score: number): Promise<string> => {
    if (!ai) return won ? "You are the champion!" : "Wasted.";

    const prompt = `Write a 2-sentence newspaper headline for a futuristic racing event called 'Neon Vengeance'. The player ${won ? 'WON' : 'LOST'} the race with a violence score of ${score}. Make it sound cyberpunk and dystopian.`;

    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
             config: {
                maxOutputTokens: 60,
            }
        });
        return response.text || (won ? "Racer Dominates Streets" : "Racer Wipes Out Tragicall");
    } catch (error) {
        return won ? "Victory Achieved" : "Critical Failure";
    }
}
