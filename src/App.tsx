import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Shield, 
  Zap, 
  Layout, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  RefreshCcw, 
  ChevronRight,
  Eye,
  FileText,
  UserCheck,
  BarChart3
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import { SiteSignals, AuditStage } from './types';
import { analyzeSiteSignals, criticizeAnalysis } from './services/geminiService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [url, setUrl] = useState('');
  const [stages, setStages] = useState<AuditStage[]>([
    { id: 'crawl', status: 'idle' },
    { id: 'analyze', status: 'idle' },
    { id: 'critic', status: 'idle' },
    { id: 'hitl', status: 'idle' },
    { id: 'final', status: 'idle' },
  ]);
  const [signals, setSignals] = useState<SiteSignals | null>(null);
  const [analysis, setAnalysis] = useState<string>('');
  const [criticData, setCriticData] = useState<{ criticism: string; confidenceScore: number; improvements: string[] } | null>(null);
  const [isApproved, setIsApproved] = useState(false);

  const updateStage = (id: AuditStage['id'], status: AuditStage['status'], data?: any, error?: string) => {
    setStages(prev => prev.map(s => s.id === id ? { ...s, status, data, error } : s));
  };

  const handleAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    // Reset
    setStages(prev => prev.map(s => ({ ...s, status: 'idle', error: undefined })));
    setSignals(null);
    setAnalysis('');
    setCriticData(null);
    setIsApproved(false);

    try {
      // 1. Crawl
      updateStage('crawl', 'running');
      const crawlRes = await fetch(`/api/crawl?url=${encodeURIComponent(url)}`);
      if (!crawlRes.ok) throw new Error('Failed to crawl site');
      const signalsData: SiteSignals = await crawlRes.json();
      setSignals(signalsData);
      updateStage('crawl', 'completed', signalsData);

      // 2. Analyze
      updateStage('analyze', 'running');
      const analysisContent = await analyzeSiteSignals(signalsData);
      setAnalysis(analysisContent || '');
      updateStage('analyze', 'completed', analysisContent);

      // 3. Critic
      updateStage('critic', 'running');
      const critic = await criticizeAnalysis(signalsData, analysisContent || '');
      setCriticData(critic);
      updateStage('critic', 'completed', critic);

      // 4. HITL (Human-in-the-loop)
      updateStage('hitl', 'running');
    } catch (err: any) {
      console.error(err);
      const activeStage = stages.find(s => s.status === 'running')?.id || 'crawl';
      updateStage(activeStage, 'failed', undefined, err.message);
    }
  };

  const handleApprove = () => {
    setIsApproved(true);
    updateStage('hitl', 'completed');
    updateStage('final', 'completed');
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text(`Site Audit: ${signals?.url}`, 10, 20);
    doc.setFontSize(12);
    doc.text(`Title: ${signals?.title}`, 10, 30);
    doc.text(`Score: ${signals?.speedScore}/100`, 10, 40);
    
    doc.setFontSize(14);
    doc.text('Key Findings:', 10, 55);
    doc.setFontSize(10);
    
    const splitAnalysis = doc.splitTextToSize(analysis, 180);
    doc.text(splitAnalysis, 10, 65);
    
    doc.save(`Audit-${signals?.url.replace(/https?:\/\//, '').replace(/\//g, '-')}.pdf`);
  };

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text-primary font-sans selection:bg-brand-accent selection:text-white p-4 md:p-10">
      {/* Header */}
      <header className="max-w-7xl mx-auto mb-10 flex justify-between items-center bg-brand-card/50 backdrop-blur-md border border-brand-border p-6 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-accent rounded-xl flex items-center justify-center shadow-lg shadow-brand-accent/20">
            <BarChart3 className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-serif italic tracking-tight leading-none text-brand-text-primary">AuditAI</h1>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-brand-text-secondary">Agent Network Online</span>
            </div>
          </div>
        </div>
        <div className="hidden md:block font-mono text-[10px] uppercase tracking-widest text-brand-text-secondary opacity-50 px-4 py-2 border border-brand-border rounded-full">
          High-Value Signal Processor // V1.0
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-8">
        {/* Left Column: Control Panel */}
        <div className="space-y-6">
          <section className="bg-brand-card p-6 rounded-2xl border border-brand-border shadow-2xl">
            <label className="block font-mono text-[10px] uppercase tracking-widest text-brand-text-secondary mb-4 font-bold">Target Website URL</label>
            <form onSubmit={handleAudit} className="space-y-4">
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="https://vortex-solutions.io"
                  className="w-full bg-brand-bg border border-brand-border p-4 pl-12 rounded-xl font-mono text-sm focus:outline-none focus:border-brand-accent transition-colors text-brand-text-primary"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-secondary" />
              </div>
              <button 
                type="submit"
                className="w-full bg-brand-accent text-white p-4 rounded-xl font-semibold hover:bg-opacity-90 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                disabled={stages.some(s => s.status === 'running')}
              >
                {stages.some(s => s.status === 'running') ? (
                  <RefreshCcw className="w-5 h-5 animate-spin" />
                ) : (
                  <>Analyze & Generate Audit <ChevronRight className="w-5 h-5" /></>
                )}
              </button>
            </form>
            <div className="mt-8 space-y-2 opacity-60">
              <p className="font-mono text-[10px] uppercase tracking-widest text-brand-text-secondary">System Prompt</p>
              <p className="text-xs leading-relaxed italic pr-4">
                "Generate a high-impact sales assessment identifying conversion leaks and competitive gaps. Prioritize visual UX and messaging clarity."
              </p>
            </div>
          </section>

          {/* Workflow visualization */}
          <section className="bg-brand-card p-6 rounded-2xl border border-brand-border">
            <h2 className="font-serif italic text-xl mb-6 text-brand-text-primary text-left">Pipeline Status</h2>
            <div className="space-y-2">
              {stages.map((stage, idx) => (
                <div key={stage.id} className={cn(
                  "p-4 rounded-xl border transition-all flex items-center gap-4",
                  stage.status === 'completed' ? "bg-green-500/5 border-green-500/20" : 
                  stage.status === 'running' ? "bg-brand-accent/5 border-brand-accent" : 
                  "bg-transparent border-brand-border opacity-50"
                )}>
                  <div className={cn(
                    "w-6 h-6 rounded-lg flex items-center justify-center font-mono text-[10px]",
                    stage.status === 'completed' ? "bg-green-500 text-white" : 
                    stage.status === 'running' ? "bg-brand-accent text-white" : 
                    "bg-brand-border text-brand-text-secondary"
                  )}>
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider">{stage.id}</p>
                    <p className={cn(
                      "text-[10px] font-mono",
                      stage.status === 'running' ? "text-brand-accent animate-pulse" : "text-brand-text-secondary"
                    )}>
                      {stage.status === 'idle' ? 'QUEUED' : stage.status.toUpperCase()}
                    </p>
                  </div>
                  {stage.id === 'critic' && <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1.5 py-0.5 rounded text-[8px] font-bold">AI</span>}
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Dynamic Terminal & Results */}
        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {!signals && !stages.some(s => s.status === 'running') ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full min-h-[500px] bg-brand-card rounded-2xl border border-brand-border flex flex-col items-center justify-center p-12 text-center"
              >
                <div className="w-20 h-20 bg-brand-border rounded-full flex items-center justify-center mb-6">
                  <Eye className="w-8 h-8 text-brand-text-secondary" />
                </div>
                <h3 className="text-2xl font-serif italic mb-2">Awaiting Target</h3>
                <p className="text-brand-text-secondary max-w-xs mx-auto text-sm leading-relaxed">
                  Enter a URL to begin the automated agentic audit process. Our network of agents will crawl, analyze, and critique the site in real-time.
                </p>
              </motion.div>
            ) : (
              <motion.div 
                key="results"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                {/* Signals Overview */}
                {signals && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <SignalCard icon={<Layout />} label="Experience" value={signals.title} sub={`${signals.imagesCount} images // ${signals.linksCount} links`} />
                    <SignalCard icon={<Zap />} label="Performance" value={`${signals.speedScore}/100`} sub="Calculated Signal Level" status={signals.speedScore > 80 ? 'good' : 'warning'} />
                    <SignalCard icon={<Shield />} label="Foundation" value={signals.techStack[0] || 'Custom'} sub={signals.hasFavicon ? 'Verified ID' : 'Missing Identity'} />
                  </div>
                )}

                {/* Main Analysis Window */}
                <section className="bg-brand-card rounded-2xl border border-brand-border overflow-hidden relative min-h-[400px] flex flex-col">
                  {/* Critic Score Overlay */}
                  {criticData && (
                    <div className="absolute top-8 right-8 text-right z-10 bg-brand-card/80 backdrop-blur-md p-4 rounded-xl border border-brand-border">
                      <div className="text-4xl font-serif italic text-brand-accent leading-none mb-1">{criticData.confidenceScore}%</div>
                      <div className="text-[10px] font-mono tracking-widest text-brand-text-secondary uppercase">Critic Confidence</div>
                    </div>
                  )}

                  <div className="p-8 pb-4 flex items-center justify-between border-b border-brand-border">
                    <div className="flex items-center gap-3">
                      <div className={cn("w-2 h-2 rounded-full", analysis ? "bg-green-500" : "bg-brand-accent animate-pulse")}></div>
                      <h2 className="text-xl font-serif italic leading-none">Analysis Pipeline</h2>
                    </div>
                  </div>

                  <div className="flex-1 p-8 font-mono text-xs leading-relaxed text-brand-text-primary/90 space-y-4">
                    {analysis ? (
                      <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap font-sans text-brand-text-primary text-base">
                        {analysis}
                      </div>
                    ) : (
                      <div className="space-y-2 opacity-50">
                        <p>[18:05:12] INFO: Initializing crawler stage...</p>
                        <p>[18:05:14] AGENT: Semantic reasoner exploring DOM hierarchy...</p>
                        <p className="animate-pulse">_</p>
                      </div>
                    )}

                    {criticData && (
                      <div className="mt-12 bg-black/40 border border-brand-border p-6 rounded-xl">
                        <div className="flex items-center gap-2 mb-3 text-amber-400">
                          <AlertCircle className="w-3 h-3" />
                          <span className="font-mono text-[10px] uppercase tracking-widest font-bold">Critic Reflection</span>
                        </div>
                        <p className="italic text-brand-text-secondary text-sm">"{criticData.criticism}"</p>
                      </div>
                    )}
                  </div>

                  {/* HITL Interaction */}
                  {stages.find(s => s.id === 'hitl')?.status === 'running' && (
                    <div className="p-6 bg-brand-accent/5 border-t border-brand-border flex items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                        <div className="flex -space-x-3">
                          <div className="w-8 h-8 rounded-full border-2 border-brand-card bg-brand-accent shadow-xl"></div>
                          <div className="w-8 h-8 rounded-full border-2 border-brand-card bg-pink-500 shadow-xl"></div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold">Awaiting Final Approval</p>
                          <p className="text-[10px] text-brand-text-secondary">Validation required to finalize report</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!isApproved ? (
                          <>
                            <button onClick={handleApprove} className="bg-brand-accent text-white px-5 py-2.5 rounded-lg text-xs font-semibold hover:bg-opacity-90 active:scale-95 transition-all">
                              Approve Audit
                            </button>
                            <button onClick={() => window.alert('V2 Feature')} className="px-5 py-2.5 rounded-lg text-xs font-semibold border border-brand-border hover:bg-white/5 transition-all">
                              Edit Draft
                            </button>
                          </>
                        ) : (
                          <button 
                            onClick={exportPDF}
                            className="bg-green-600 text-white px-6 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 hover:bg-green-700 transition-all shadow-lg shadow-green-600/20"
                          >
                            <Download className="w-3 h-3" /> Export PDF
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </section>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto mt-16 pt-8 border-t border-brand-border flex flex-col md:flex-row justify-between items-center gap-4 text-brand-text-secondary/40 font-mono text-[9px] uppercase tracking-[0.2em]">
        <div>AuditAI Signals // Neural Lab Access</div>
        <div className="flex gap-8">
          <span className="flex items-center gap-1.5"><Shield className="w-2.5 h-2.5" /> Bit-Stream Encrypted</span>
          <span>© 2026 // Audit Infrastructure</span>
        </div>
      </footer>
    </div>
  );
}

function SignalCard({ icon, label, value, sub, status = 'default' }: { icon: React.ReactNode, label: string, value: string, sub: string, status?: 'default' | 'good' | 'warning' }) {
  return (
    <div className="bg-brand-card p-5 rounded-2xl border border-brand-border group hover:border-brand-accent/50 transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className="w-8 h-8 rounded-lg bg-brand-bg border border-brand-border flex items-center justify-center text-brand-text-secondary group-hover:text-brand-accent transition-colors">
          {React.cloneElement(icon as React.ReactElement, { size: 14 })}
        </div>
        <div className={cn(
          "w-1.5 h-1.5 rounded-full",
          status === 'good' ? "bg-green-500" : status === 'warning' ? "bg-amber-500" : "bg-brand-text-secondary/30"
        )}></div>
      </div>
      <p className="font-mono text-[10px] uppercase tracking-widest text-brand-text-secondary mb-1">{label}</p>
      <h3 className="text-lg font-serif italic leading-tight mb-1 truncate text-brand-text-primary">{value}</h3>
      <p className="text-[10px] text-brand-text-secondary font-mono opacity-60 tracking-tighter">{sub}</p>
    </div>
  );
}
