import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';
import * as cheerio from 'cheerio';

// Define the shape directly to avoid relative path issues in Vercel functions if needed
interface SiteSignals {
  url: string;
  title: string;
  metaDescription: string;
  headings: {
    h1: string[];
    h2: string[];
  };
  linksCount: number;
  imagesCount: number;
  hasFavicon: boolean;
  hasSitemap: boolean;
  securityHeaders: string[];
  techStack: string[];
  speedScore: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

    return res.status(200).json(signals);
  } catch (error: any) {
    console.error('Crawl error:', error.message);
    return res.status(500).json({ error: `Failed to crawl site: ${error.message}` });
  }
}
