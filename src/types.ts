export interface SiteSignals {
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
  speedScore: number; // Mocked
}

export interface AuditStage {
  id: 'crawl' | 'analyze' | 'critic' | 'hitl' | 'final';
  status: 'idle' | 'running' | 'completed' | 'failed';
  data?: any;
  error?: string;
  confidence?: number;
}

export interface AuditResult {
  signals: SiteSignals;
  analysis: string;
  criticFeedback: string;
  confidenceScore: number;
  approved: boolean;
  finalReport?: string;
}
