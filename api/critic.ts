import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { signals, analysis } = req.body;

  if (!signals || !analysis) {
    return res.status(400).json({ error: 'Signals and analysis are required' });
  }

  try {
    const prompt = `
      You are a critical site audit reviewer. Your job is to find flaws, hallucinations, or generic advice in the analysis provided.
      
      Original Signals:
      ` + JSON.stringify(signals, null, 2) + `
      
      Proposed Analysis:
      ` + analysis + `
      
      Tasks:
      1. Identify any generic "filler" statements.
      2. Check if the analysis matches the data.
      3. Assign a confidence score from 0-100.
      4. Suggest specific improvements to make it more persuasive for a sales pitch.
      
      Output in JSON format matching the requested schema.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            criticism: { type: Type.STRING },
            confidenceScore: { type: Type.NUMBER },
            improvements: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["criticism", "confidenceScore", "improvements"]
        }
      }
    });

    return res.status(200).json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.error('Critic error:', error.message);
    return res.status(500).json({ error: `Criticism failed: ${error.message}` });
  }
}
