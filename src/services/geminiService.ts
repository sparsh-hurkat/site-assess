import { SiteSignals } from "../types";

export async function analyzeSiteSignals(signals: SiteSignals): Promise<string> {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ signals }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to analyze site');
  }

  const data = await response.json();
  return data.text;
}

export async function criticizeAnalysis(signals: SiteSignals, currentAnalysis: string) {
  const response = await fetch('/api/critic', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ signals, analysis: currentAnalysis }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to criticize analysis');
  }

  return response.json();
}
