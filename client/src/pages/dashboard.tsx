import { useStore } from "@/lib/store";
import { Link } from "wouter";
import { ArrowUpRight, TrendingUp, AlertTriangle, Zap, Activity, Clock, FileJson, ArrowRight, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Dashboard() {
  const { brief, videos, lastSyncedAt } = useStore();

  if (!brief || videos.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 mb-6 rounded-full bg-secondary/50 border border-border/50 flex items-center justify-center">
          <Activity className="w-10 h-10 text-muted-foreground opacity-50" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">No Intelligence Available</h1>
        <p className="text-muted-foreground max-w-md mb-8">
          Social OS needs data to generate your Daily Growth Brief. Connect a platform to begin the deterministic analysis.
        </p>
        <Link href="/connect">
          <button className="bg-primary text-primary-foreground px-6 py-3 rounded-md font-medium flex items-center gap-2 hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 cursor-pointer">
            <Zap className="w-4 h-4" />
            Connect Platform
          </button>
        </Link>
      </div>
    );
  }

  const { momentum, moves, warnings, penalties, postingWindows } = brief;

  return (
    <div className="max-w-6xl mx-auto p-8 pt-10 pb-20 animate-in slide-in-from-bottom-4 fade-in duration-500">
      <header className="flex justify-between items-end mb-10 border-b border-border/40 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-secondary/60 border border-border text-xs font-mono text-muted-foreground mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            SYSTEM_ACTIVE
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Daily Growth Brief</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            Deterministic analysis based on {videos.length} recent assets.
            {lastSyncedAt && (
              <span className="text-xs px-2 py-0.5 bg-secondary rounded-sm">
                Synced {formatDistanceToNow(new Date(lastSyncedAt))} ago
              </span>
            )}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Momentum Card */}
        <div className="col-span-1 md:col-span-2 bg-card border border-border/50 rounded-xl p-6 relative overflow-hidden group shadow-lg shadow-black/5">
          <div className="absolute top-0 right-0 p-32 opacity-5 pointer-events-none transition-transform duration-700 group-hover:scale-110">
            <TrendingUp className="w-full h-full" />
          </div>
          
          <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-wider mb-6 flex items-center gap-2">
            <Activity className="w-4 h-4" /> System Momentum
          </h2>
          
          <div className="flex items-end gap-6 mb-4">
            <div className="text-7xl font-bold tracking-tighter tabular-nums leading-none text-transparent bg-clip-text bg-gradient-to-br from-foreground to-foreground/50">
              {momentum.score}
            </div>
            <div className="mb-2">
              <div className={`text-lg font-medium flex items-center gap-1 ${
                momentum.trend === 'up' ? 'text-green-500' : momentum.trend === 'down' ? 'text-destructive' : 'text-yellow-500'
              }`}>
                {momentum.trend === 'up' ? <ArrowUpRight className="w-5 h-5" /> : momentum.trend === 'down' ? <ArrowUpRight className="w-5 h-5 rotate-90" /> : <ArrowRight className="w-5 h-5" />}
                {momentum.label}
              </div>
            </div>
          </div>
          
          <p className="text-muted-foreground max-w-md">{momentum.details}</p>
        </div>

        {/* Penalties */}
        <div className="bg-card border border-border/50 rounded-xl p-6 shadow-lg shadow-black/5 flex flex-col justify-between">
          <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-wider mb-6 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Friction Metrics
          </h2>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-muted-foreground">Format Fatigue</span>
                <span className="font-mono">{penalties.fatigue}%</span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 rounded-full" style={{ width: `${penalties.fatigue}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-muted-foreground">Novelty Decay</span>
                <span className="font-mono">{penalties.novelty}%</span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${penalties.novelty}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-muted-foreground">Repetition Penalty</span>
                <span className="font-mono">{penalties.repetition}%</span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-red-500 rounded-full" style={{ width: `${penalties.repetition}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Strategic Moves */}
        <div className="bg-card border border-border/50 rounded-xl p-6 shadow-lg shadow-black/5">
          <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-wider mb-6 flex items-center gap-2">
            <Zap className="w-4 h-4" /> Recommended Moves
          </h2>
          
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="shrink-0 w-8 h-8 rounded bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">L</div>
              <div>
                <h3 className="font-semibold mb-1 text-sm text-primary">Leverage Move</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{moves.leverage}</p>
              </div>
            </div>
            
            <div className="w-full h-px bg-border/40" />
            
            <div className="flex gap-4">
              <div className="shrink-0 w-8 h-8 rounded bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-sm">R</div>
              <div>
                <h3 className="font-semibold mb-1 text-sm text-blue-500">Reinforcement Move</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{moves.reinforcement}</p>
              </div>
            </div>

            <div className="w-full h-px bg-border/40" />

            <div className="flex gap-4">
              <div className="shrink-0 w-8 h-8 rounded bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold text-sm">E</div>
              <div>
                <h3 className="font-semibold mb-1 text-sm text-purple-500">Experiment Move</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{moves.experiment}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 flex flex-col">
          {/* Warnings */}
          <div className="bg-card border border-border/50 rounded-xl p-6 shadow-lg shadow-black/5 flex-1">
            <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-wider mb-6 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> System Warnings
            </h2>
            <ul className="space-y-3">
              {warnings.map((w, i) => (
                <li key={i} className="flex gap-3 text-sm text-muted-foreground bg-secondary/30 p-3 rounded-lg border border-border/50">
                  <div className="mt-0.5 text-yellow-500"><AlertTriangle className="w-4 h-4" /></div>
                  <span className="leading-relaxed">{w}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Posting Windows */}
          <div className="bg-card border border-border/50 rounded-xl p-6 shadow-lg shadow-black/5 flex-1">
            <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-wider mb-6 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Optimal Release Windows
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {postingWindows.map((pw, i) => (
                <div key={i} className="border border-border/50 bg-secondary/20 p-4 rounded-lg text-center flex flex-col items-center justify-center">
                  <span className="font-semibold block">{pw.day}</span>
                  <span className="text-2xl font-mono text-primary font-light tracking-tighter my-1">{pw.time}</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{pw.confidence}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {/* Raw Data Dump (Proving it's not mockup) */}
      <div className="mt-12 bg-black border border-border/50 rounded-xl p-6 overflow-hidden relative">
        <h2 className="text-xs font-mono text-muted-foreground mb-4 flex items-center gap-2">
          <FileJson className="w-3 h-3" /> Raw JSON Persisted State
        </h2>
        <div className="max-h-48 overflow-y-auto font-mono text-[10px] text-muted-foreground/60 p-4 bg-[#0a0a0a] rounded border border-white/5">
          <pre>{JSON.stringify(videos, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}
