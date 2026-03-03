import { usePersistedStore } from "@/lib/store";
import { Link } from "wouter";
import { ArrowUpRight, TrendingUp, AlertTriangle, Zap, Activity, Clock, Target, ArrowRight, Copy, CheckCircle2, ListChecks, ThumbsUp, ThumbsDown, Minus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PostPackage } from "@/lib/engine";

function MoveBlock({ title, move, type, onExecute, executions }: { title: string, move: PostPackage, type: any, onExecute: any, executions: any[] }) {
  const { toast } = useToast();
  
  const handleCopy = () => {
    const content = `Hook: ${move.hook}\nVariants:\n${move.hookVariants.map(v => `- ${v}`).join('\n')}\n\nCaption: ${move.captionStarter}\n\nCTAs:\n${move.ctaVariants.map(v => `- ${v}`).join('\n')}\n\nHashtags: ${move.hashtags}`;
    navigator.clipboard.writeText(content);
    toast({ title: "Copied to clipboard", description: "Package ready for posting." });
  };

  const hasExecuted = executions.some(e => e.type === type && (Date.now() - new Date(e.executedAt).getTime()) < 24 * 60 * 60 * 1000);

  return (
    <div className="bg-card border border-border/50 rounded-xl p-6 shadow-lg flex flex-col h-full relative">
      <div className="flex justify-between items-start mb-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          {title}
        </h3>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="w-6 h-6 rounded-full bg-secondary/50 flex items-center justify-center text-muted-foreground text-xs cursor-help">
              ?
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p>{move.why}</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <p className="text-sm text-muted-foreground mb-6 leading-relaxed flex-1">
        {move.why}
      </p>

      <div className="space-y-4 mb-6 text-sm">
        <div className="bg-secondary/20 p-3 rounded-lg border border-border/30">
          <span className="text-xs font-mono text-muted-foreground uppercase mb-1 block">Primary Hook</span>
          <span className="font-medium">{move.hook}</span>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-secondary/20 p-3 rounded-lg border border-border/30">
            <span className="text-xs font-mono text-muted-foreground uppercase mb-1 block">Caption Starter</span>
            <span className="line-clamp-2 text-muted-foreground">{move.captionStarter || 'N/A'}</span>
          </div>
          <div className="bg-secondary/20 p-3 rounded-lg border border-border/30">
            <span className="text-xs font-mono text-muted-foreground uppercase mb-1 block">Hashtags</span>
            <span className="text-primary font-mono text-xs">{move.hashtags || 'N/A'}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-auto">
        <button onClick={handleCopy} className="flex-1 bg-secondary text-foreground hover:bg-secondary/80 px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer">
          <Copy className="w-4 h-4" /> Copy Package
        </button>
        <button 
          onClick={() => onExecute(type)}
          disabled={hasExecuted}
          className={`px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer ${hasExecuted ? 'bg-green-500/20 text-green-500 cursor-not-allowed' : 'bg-primary text-primary-foreground hover:bg-primary/90'}`}
        >
          {hasExecuted ? <CheckCircle2 className="w-4 h-4" /> : <Target className="w-4 h-4" />}
          {hasExecuted ? 'Executed' : 'Execute'}
        </button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { brief, videos, lastSyncedAt, executeMove, addFeedback, executions } = usePersistedStore();
  const { toast } = useToast();

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

  const { momentum, moves, warnings, penalties, postingWindows, todayGameplan, opportunityScore } = brief;

  const handleExecute = (type: any) => {
    executeMove({ videoId: '', type });
    toast({ title: "Move Logged", description: "This execution has been recorded for future analysis." });
  };

  const handleFeedback = (id: string, fb: 'better' | 'same' | 'worse') => {
    addFeedback(id, fb);
    toast({ title: "Feedback Recorded", description: "Engine weights updated." });
  };

  const recentExecutions = executions.slice(-3).reverse();

  return (
    <div className="max-w-7xl mx-auto p-8 pt-10 pb-20 animate-in slide-in-from-bottom-4 fade-in duration-500">
      {/* Top Banner */}
      <header className="bg-card border border-border/50 rounded-xl p-6 mb-8 shadow-lg flex flex-col md:flex-row justify-between md:items-center gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-secondary/60 border border-border text-xs font-mono text-muted-foreground mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            SYSTEM_ACTIVE
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Daily Growth Brief</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Analyzing {videos.length} videos. Last sync: {lastSyncedAt ? formatDistanceToNow(new Date(lastSyncedAt)) + ' ago' : 'Never'}
          </p>
        </div>

        <div className="flex gap-8">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-mono mb-1 flex items-center gap-1.5">
              Momentum <TrendingUp className="w-3 h-3" />
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tighter">{momentum.score}</span>
              <span className={`text-sm font-medium ${momentum.trend === 'up' ? 'text-green-500' : momentum.trend === 'down' ? 'text-destructive' : 'text-yellow-500'}`}>
                {momentum.label}
              </span>
            </div>
          </div>
          
          <div className="w-px bg-border/50 h-12 self-center" />

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex flex-col cursor-help">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-mono mb-1 flex items-center gap-1.5">
                  Opportunity <Zap className="w-3 h-3 text-yellow-500" />
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold tracking-tighter text-yellow-500">{opportunityScore}</span>
                  <span className="text-sm text-muted-foreground">/ 100</span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Calculated based on momentum and lack of recent theme repetition.</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </header>

      {warnings.length > 0 && warnings[0] !== "No critical warnings. Operations normal." && (
        <div className="mb-8 bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex items-start gap-3 text-destructive">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm mb-1">System Warnings</h4>
            <ul className="list-disc list-inside text-sm space-y-1 ml-4 text-destructive/90">
              {warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        </div>
      )}

      {/* Main Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MoveBlock title="Leverage Move" move={moves.leverage} type="leverage" onExecute={handleExecute} executions={executions} />
        <MoveBlock title="Reinforcement Move" move={moves.reinforcement} type="reinforcement" onExecute={handleExecute} executions={executions} />
        <MoveBlock title="Experiment Move" move={moves.experiment} type="experiment" onExecute={handleExecute} executions={executions} />
        <MoveBlock title="Structural Adj." move={moves.structural} type="structural" onExecute={handleExecute} executions={executions} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gameplan */}
        <div className="bg-card border border-border/50 rounded-xl p-6 shadow-lg lg:col-span-2">
          <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-wider mb-6 flex items-center gap-2">
            <ListChecks className="w-4 h-4" /> Today's Gameplan
          </h2>
          <div className="space-y-3">
            {todayGameplan.map((task, i) => (
              <label key={i} className="flex items-start gap-3 p-3 rounded-lg border border-border/30 bg-secondary/10 hover:bg-secondary/20 transition-colors cursor-pointer group">
                <input type="checkbox" className="mt-1 w-4 h-4 rounded border-border text-primary focus:ring-primary/20" />
                <span className="text-sm group-hover:text-foreground transition-colors">{task}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          {/* Posting Windows */}
          <div className="bg-card border border-border/50 rounded-xl p-6 shadow-lg">
            <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Optimal Windows
            </h2>
            <div className="space-y-2">
              {postingWindows.map((pw, i) => (
                <div key={i} className="flex justify-between items-center p-2 rounded bg-secondary/20 border border-border/30">
                  <span className="text-sm font-medium">{pw.day}</span>
                  <span className="text-sm font-mono text-primary">{pw.time}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Feedback loop */}
          {recentExecutions.length > 0 && (
            <div className="bg-card border border-border/50 rounded-xl p-6 shadow-lg">
              <h2 className="text-sm font-mono text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <Target className="w-4 h-4" /> Recent Executions
              </h2>
              <div className="space-y-3">
                {recentExecutions.map(ex => (
                  <div key={ex.id} className="text-xs p-3 rounded bg-secondary/10 border border-border/30">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-mono text-primary capitalize">{ex.type}</span>
                      <span className="text-muted-foreground">{formatDistanceToNow(new Date(ex.executedAt))} ago</span>
                    </div>
                    {!ex.feedback ? (
                      <div className="flex gap-1 pt-2 border-t border-border/30 mt-2">
                        <span className="text-[10px] text-muted-foreground mr-auto self-center">Result?</span>
                        <button onClick={() => handleFeedback(ex.id, 'better')} className="p-1.5 hover:bg-green-500/20 text-green-500 rounded"><ThumbsUp className="w-3 h-3" /></button>
                        <button onClick={() => handleFeedback(ex.id, 'same')} className="p-1.5 hover:bg-secondary text-muted-foreground rounded"><Minus className="w-3 h-3" /></button>
                        <button onClick={() => handleFeedback(ex.id, 'worse')} className="p-1.5 hover:bg-destructive/20 text-destructive rounded"><ThumbsDown className="w-3 h-3" /></button>
                      </div>
                    ) : (
                      <div className={`mt-2 pt-2 border-t border-border/30 text-[10px] uppercase tracking-wider font-mono ${ex.feedback === 'better' ? 'text-green-500' : ex.feedback === 'worse' ? 'text-destructive' : 'text-muted-foreground'}`}>
                        Feedback: {ex.feedback}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
