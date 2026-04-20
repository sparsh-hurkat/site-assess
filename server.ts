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
        hasSitemap: false, // Hard to check purely from DOM
        securityHeaders: Object.keys(response.headers).filter(h => h.toLowerCase().startsWith('x-') || h.toLowerCase().startsWith('content-security')),
        techStack: [], // Would need more sophisticated sniffing
        speedScore: Math.floor(Math.random() * 40) + 60, // Mocked speed score
      };

      // Simple tech stack detection
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
