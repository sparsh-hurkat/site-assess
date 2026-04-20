import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { signals } = req.body;

  if (!signals) {
    return res.status(400).json({ error: 'Signals are required' });
  }

  try {
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

    return res.status(200).json({ text: response.text });
  } catch (error: any) {
    console.error('Analyze error:', error.message);
    return res.status(500).json({ error: `Analysis failed: ${error.message}` });
  }
}
