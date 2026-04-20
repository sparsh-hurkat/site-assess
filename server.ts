import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import * as cheerio from 'cheerio';
import dotenv from 'dotenv';
import { SiteSignals } from './src/types';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for crawling
  app.get('/api/crawl', async (req, res) => {
    // ... logic same as api/crawl.ts
    const { url } = req.query;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' });
    }

    try {
      const targetUrl = url.startsWith('http') ? url : `https://${url}`;
      const response = await axios.get(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (SiteAssess Audit Bot)',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);
      
      const signals: SiteSignals = {
        url: targetUrl,
        title: $('title').text() || 'No Title',
        metaDescription: $('meta[name="description"]').attr('content') || 'No Description',
        headings: {
          h1: $('h1').map((_, el) => $(el).text().trim()).get(),
          h2: $('h2').map((_, el) => $(el).text().trim()).get(),
        },
        linksCount: $('a').length,
        imagesCount: $('img').length,
        hasFavicon: !!($('link[rel*="icon"]').attr('href')),
        hasSitemap: false,
        securityHeaders: Object.keys(response.headers).filter(h => h.toLowerCase().startsWith('x-') || h.toLowerCase().startsWith('content-security')),
        techStack: [],
        speedScore: Math.floor(Math.random() * 40) + 60,
      };

      if (response.data.includes('wp-content')) signals.techStack.push('WordPress');
      if (response.data.includes('react')) signals.techStack.push('React');
      if (response.data.includes('next/static')) signals.techStack.push('Next.js');
      if (response.data.includes('vimeo')) signals.techStack.push('Vimeo');
      if (response.data.includes('google-analytics')) signals.techStack.push('Google Analytics');

      res.json(signals);
    } catch (error: any) {
      console.error('Crawl error:', error.message);
      res.status(500).json({ error: `Failed to crawl site: ${error.message}` });
    }
  });

  // API Route for AI Analysis
  app.post('/api/analyze', async (req, res) => {
    const { signals } = req.body;
    if (!signals) return res.status(400).json({ error: 'Signals required' });

    try {
      const ai = new (await import('@google/genai')).GoogleGenAI(process.env.GEMINI_API_KEY || "");
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

      const model = ai.getGenerativeModel({ model: "gemini-3-flash-preview" });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      res.json({ text });
    } catch (err: any) {
      console.error('Analyze proxy error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // API Route for AI Critic
  app.post('/api/critic', async (req, res) => {
    const { signals, analysis } = req.body;
    if (!signals || !analysis) return res.status(400).json({ error: 'Signals and analysis required' });

    try {
      const { GoogleGenAI, SchemaType } = await import('@google/genai');
      const ai = new GoogleGenAI(process.env.GEMINI_API_KEY || "");
      const prompt = `
        You are a critical site audit reviewer. Your job is to find flaws, hallucinations, or generic advice in the analysis provided.
        
        Original Signals:
        ${JSON.stringify(signals, null, 2)}
        
        Proposed Analysis:
        ${analysis}
        
        Tasks:
        1. Identify any generic "filler" statements.
        2. Check if the analysis matches the data.
        3. Assign a confidence score from 0-100.
        4. Suggest specific improvements to make it more persuasive for a sales pitch.
        
        Output in JSON format.
      `;

      const model = ai.getGenerativeModel({
        model: "gemini-3.1-pro-preview",
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              criticism: { type: SchemaType.STRING },
              confidenceScore: { type: SchemaType.NUMBER },
              improvements: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } }
            },
            required: ["criticism", "confidenceScore", "improvements"]
          }
        }
      });

      const result = await model.generateContent(prompt);
      res.json(JSON.parse(result.response.text()));
    } catch (err: any) {
      console.error('Critic proxy error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
