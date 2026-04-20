import { GoogleGenAI, Type } from "@google/genai";
import { SiteSignals } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function analyzeSiteSignals(signals: SiteSignals) {
  const prompt = `
    Analyze the following website signals and provide a structured site audit for a sales team.
    The goal is to identify pain points and a "hook" for a booking meeting.
    
    Signals:
    URL: ${signals.url}
    Title: ${signals.title}
    Description: ${signals.metaDescription}
    Primary Headers: ${signals.headings.h1.join(', ')}
    Secondary Headers: ${signals.headings.h2.slice(0, 5).join(', ')}
    Links: ${signals.linksCount}, Images: ${signals.imagesCount}
    Tech Stack: ${signals.techStack.join(', ')}
    Accessibility/Speed Indicators: Speed Score: ${signals.speedScore}
    
    Focus on:
    1. Conversion potential (UX friction).
    2. SEO/Hierarchy clarity.
    3. Competitive differentiator or lack thereof.
    4. Technical debt (speed, missing tags).
    
    Format the output as a clean, professional markdown report.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });

  return response.text;
}

export async function criticizeAnalysis(signals: SiteSignals, currentAnalysis: string) {
  const prompt = `
    You are a critical site audit reviewer. Your job is to find flaws, hallucinations, or generic advice in the analysis provided.
    
    Original Signals:
    ${JSON.stringify(signals, null, 2)}
    
    Proposed Analysis:
    ${currentAnalysis}
    
    Tasks:
    1. Identify any generic "filler" statements.
    2. Check if the analysis matches the data (e.g., if signals say 0 images, but analysis mentions image optimization).
    3. Assign a confidence score from 0-100.
    4. Suggest specific improvements to make it more persuasive for a sales pitch.
    
    Output in JSON format.
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

  return JSON.parse(response.text || "{}");
}
