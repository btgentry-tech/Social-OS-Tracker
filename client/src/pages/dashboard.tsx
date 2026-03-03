import { usePersistedStore } from "@/lib/store";
import { Link } from "wouter";
import { AlertTriangle, Zap, Activity, CheckCircle2, ThumbsUp, ThumbsDown, Minus, Copy, Info, ChevronDown, ChevronUp, Target, TrendingUp, RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { PostPackage } from "@/lib/engine";
import { VideoData } from "@/lib/store";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function ExplainBox() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4 pt-4 border-t border-border/30">
      <button 
        onClick={() => setOpen(!open)} 
        className="flex items-center gap-1.5 text-[10px] uppercase font-mono text-muted-foreground hover:text-foreground transition-colors"
      >
        <Info className="w-3 h-3" /> How was this generated? {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {open && (
        <div className="mt-3 text-xs text-muted-foreground bg-secondary/20 p-4 rounded-md border border-border/20 leading-relaxed">
          <p className="mb-2"><strong>Intelligence Layer:</strong> This system uses deterministic heuristics to analyze your library.</p>
          <ul className="list-disc list-inside space-y-1 ml-1">
            <li><strong>Performance vs Average:</strong> Compares recent asset views against your historical baseline.</li>
            <li><strong>Repetition Fatigue:</strong> Detects if you've been posting the same inferred themes too frequently.</li>
            <li><strong>Freshness Decay:</strong> Prioritizes older high-performers for reposts and recent underperformers for quick fixes.</li>
            <li><strong>Context Awareness:</strong> Reads your library notes to avoid recommending time-sensitive or event-based content inappropriately.</li>
          </ul>
        </div>
      )}
    </div>
  );
}

function OpportunityCard({ 
  title, 
  badge,
  badgeColor,
  move, 
  type, 
  onExecute, 
  executions,
  video,
  isPrimary = false
}: { 
  title: string, 
  badge: string,
  badgeColor: string,
  move: PostPackage, 
  type: any, 
  onExecute: any, 
  executions: any[],
  video?: VideoData,
  isPrimary?: boolean
}) {
  const { toast } = useToast();
  
  const handleCopy = () => {
    const content = `Hook: ${move.hook}\nVariants:\n${move.hookVariants.map(v => `- ${v}`).join('\n')}\n\nCaption: ${move.captionStarter}\n\nCTAs:\n${move.ctaVariants.map(v => `- ${v}`).join('\n')}\n\nHashtags: ${move.hashtags}`;
    navigator.clipboard.writeText(content);
    toast({ title: "Copied to clipboard", description: "Package ready for posting." });
  };

  const hasExecuted = executions.some(e => e.type === type && (Date.now() - new Date(e.executedAt).getTime()) < 24 * 60 * 60 * 1000);

  const ConfidenceBadge = () => {
    const colors = {
      'High': 'text-green-500 bg-green-500/10 border-green-500/20',
      'Medium': 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20',
      'Experimental': 'text-purple-500 bg-purple-500/10 border-purple-500/20'
    };
    const c = colors[move.confidence] || colors['Medium'];
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border ${c}`}>
        {move.confidence} Confidence
      </span>
    );
  };

  return (
    <div className={`bg-card border ${isPrimary ? 'border-primary/50 shadow-[0_8px_30px_rgba(255,255,255,0.05)]' : 'border-border/50 shadow-lg'} rounded-xl p-5 md:p-8 flex flex-col relative group`}>
      
      {isPrimary && (
        <div className="absolute -top-3.5 left-6 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider rounded shadow-md">
          Do This Next
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${badgeColor}`}>
              {badge}
            </span>
            <ConfidenceBadge />
          </div>
          <h3 className="font-bold text-2xl md:text-3xl tracking-tight text-foreground">
            {title}
          </h3>
        </div>
      </div>

      {video && (
        <div className="flex gap-4 mb-6 p-4 rounded-xl border border-border/60 bg-background/80 items-center">
          {video.thumbnail ? (
            <img src={video.thumbnail} alt={video.title} className="w-32 h-20 object-cover rounded bg-secondary shrink-0 shadow-sm" />
          ) : (
            <div className="w-32 h-20 rounded bg-secondary flex items-center justify-center shrink-0 shadow-sm">
              <span className="text-xs text-muted-foreground">No image</span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-base line-clamp-2 leading-tight" title={video.title}>{video.title}</h4>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
              <span className="flex items-center gap-1 bg-secondary px-2 py-0.5 rounded"><Activity className="w-3 h-3" /> {video.viewCount.toLocaleString()} views</span>
              <span>•</span>
              <span>{video.freshness} days ago</span>
            </div>
            {video.notes && (
              <div className="mt-2 text-[10px] text-yellow-500/90 bg-yellow-500/10 px-2 py-1 rounded inline-block truncate max-w-full border border-yellow-500/20">
                Note: {video.notes}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="space-y-2">
          <h4 className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Target className="w-4 h-4" /> Diagnosis
          </h4>
          <p className="text-sm leading-relaxed">{move.diagnosis}</p>
        </div>
        <div className="space-y-2">
          <h4 className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" /> Action Plan
          </h4>
          <p className="text-sm leading-relaxed font-medium">{move.actionPlan}</p>
        </div>
      </div>

      <div className="bg-secondary/10 p-5 rounded-xl border border-border/40 mb-8 space-y-4">
        <h4 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Ready-to-use Assets</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="text-[10px] uppercase text-muted-foreground block mb-1">Suggested Hook</span>
            <span className="text-sm font-medium">{move.hook}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase text-muted-foreground block mb-1">Caption Starter</span>
            <span className="text-sm text-muted-foreground">{move.captionStarter || 'N/A'}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mt-auto">
        <button 
          onClick={() => onExecute(type)}
          disabled={hasExecuted}
          className={`flex-1 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${hasExecuted ? 'bg-green-500/20 text-green-500 border border-green-500/30 cursor-not-allowed' : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)]'}`}
        >
          {hasExecuted ? <CheckCircle2 className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
          {hasExecuted ? 'Marked as Done' : 'Mark Done'}
        </button>
        <button onClick={handleCopy} className="sm:w-auto w-full px-6 py-3 bg-secondary text-foreground hover:bg-secondary/80 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer border border-border">
          <Copy className="w-4 h-4" /> Copy Assets
        </button>
      </div>
      
      <ExplainBox />
    </div>
  );
}

export default function Dashboard() {
  const { brief, videos, lastSyncedAt, executeMove, addFeedback, executions } = usePersistedStore();
  const { toast } = useToast();

  if (!brief || videos.length === 0 || !brief.moves?.primary) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 mb-6 rounded-full bg-secondary/50 border border-border/50 flex items-center justify-center">
          <Activity className="w-10 h-10 text-muted-foreground opacity-50" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome to Social OS</h1>
        <p className="text-muted-foreground max-w-md mb-8">
          {!brief?.moves?.primary && videos.length > 0 
            ? "We've updated our strategic engine. Please head to Connect and sync again to generate your new opportunities."
            : "Connect your YouTube channel to see exactly what you should do next to grow your audience."}
        </p>
        <Link href="/connect">
          <button className="bg-primary text-primary-foreground px-6 py-3 rounded-md font-bold flex items-center gap-2 hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 cursor-pointer">
            <Zap className="w-5 h-5" />
            {(!brief?.moves?.primary && videos.length > 0) ? "Go to Connect" : "Connect YouTube"}
          </button>
        </Link>
      </div>
    );
  }

  const { moves, warnings, opportunityScore } = brief;

  const handleExecute = (type: any) => {
    executeMove({ videoId: '', type });
    toast({ title: "Action completed!", description: "Keep it up." });
  };

  const handleFeedback = (id: string, fb: 'better' | 'same' | 'worse') => {
    addFeedback(id, fb);
    toast({ title: "Feedback Recorded", description: "Thanks! We'll use this to improve future suggestions." });
  };

  const recentExecutions = executions.slice(-3).reverse();
  const hasExecutedRecently = executions.some(e => (Date.now() - new Date(e.executedAt).getTime()) < 3 * 24 * 60 * 60 * 1000);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 pt-8 md:pt-10 pb-20 animate-in slide-in-from-bottom-4 fade-in duration-500">
      
      {!hasExecutedRecently && executions.length > 0 && (
        <div className="mb-6 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex items-center gap-3 text-yellow-500 text-sm font-medium shadow-sm">
          <Activity className="w-5 h-5 shrink-0" />
          You haven't executed a growth action in 3 days. Pick one below to keep momentum going.
        </div>
      )}

      {warnings.length > 0 && (
        <div className="mb-8 bg-destructive/10 border border-destructive/30 rounded-xl p-5 flex flex-col gap-3 shadow-sm">
          <div className="flex items-center gap-2 text-destructive font-bold text-lg">
            <AlertTriangle className="w-5 h-5" />
            System Warning – Do Not Ignore
          </div>
          <ul className="list-disc list-inside space-y-1 text-destructive/90 ml-1 font-medium">
            {warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      <header className="mb-10 flex flex-col md:flex-row justify-between md:items-end gap-6 border-b border-border/40 pb-6">
        <div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">Action Feed</h1>
          <p className="text-muted-foreground text-lg">Here's exactly what to do with your content today.</p>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end text-right">
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-mono mb-1">
              Library Status
            </span>
            <div className="text-sm font-medium">
              {videos.length} items synced
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {lastSyncedAt ? formatDistanceToNow(new Date(lastSyncedAt)) : ''} ago
            </div>
          </div>
          
          <div className="w-px h-12 bg-border/50" />

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex flex-col items-end text-right cursor-help">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-mono mb-1 flex items-center gap-1.5">
                  Opportunity Score <Info className="w-3 h-3 text-muted-foreground/50" />
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold tracking-tighter text-yellow-500">{opportunityScore}</span>
                  <span className="text-sm text-muted-foreground">/100</span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs p-3">
              <p className="text-xs leading-relaxed">Score is calculated based on channel momentum, library novelty vs repetition, and overall freshness. Higher scores mean your audience is primed for action.</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </header>

      <div className="flex flex-col gap-10 mb-16">
        {/* Primary Action */}
        {moves.primary && (
          <OpportunityCard 
            title={moves.primary.type === 'repost' ? 'High-Probability Repost' : moves.primary.type === 'fix' ? 'Fix & Retry This' : 'Test This New Angle'}
            badge="Do This First"
            badgeColor="bg-primary/20 text-primary border-primary/30"
            move={moves.primary} 
            type={`primary_${moves.primary.type}`}
            onExecute={handleExecute} 
            executions={executions}
            video={moves.primary.sourceVideo}
            isPrimary={true}
          />
        )}

        <div className="flex items-center gap-4 my-2">
          <div className="h-px bg-border/50 flex-1" />
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Secondary Opportunities</span>
          <div className="h-px bg-border/50 flex-1" />
        </div>

        {/* Secondary Actions */}
        {moves.primary.type !== 'repost' && (
          <OpportunityCard 
            title="High-Probability Win"
            badge="Secondary"
            badgeColor="bg-secondary text-foreground border-border"
            move={moves.highProbability} 
            type="repost" 
            onExecute={handleExecute} 
            executions={executions}
            video={moves.highProbability.sourceVideo}
          />
        )}

        {moves.primary.type !== 'fix' && (
          <OpportunityCard 
            title="Fix & Retry This"
            badge="Secondary"
            badgeColor="bg-secondary text-foreground border-border"
            move={moves.fix} 
            type="fix" 
            onExecute={handleExecute} 
            executions={executions}
            video={moves.fix.sourceVideo}
          />
        )}

        {moves.primary.type !== 'newAngle' && (
          <OpportunityCard 
            title="New Idea You Should Test"
            badge="Secondary"
            badgeColor="bg-secondary text-foreground border-border"
            move={moves.newAngle} 
            type="new_angle" 
            onExecute={handleExecute} 
            executions={executions}
          />
        )}
      </div>

      {/* Feedback loop */}
      {recentExecutions.length > 0 && (
        <div className="mt-16 pt-8 border-t border-border/30">
          <h2 className="font-bold text-xl mb-6">Did these work for you?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentExecutions.map(ex => (
              <div key={ex.id} className="p-5 rounded-xl bg-card border border-border/50 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <span className="font-medium text-sm capitalize bg-secondary/50 px-2 py-1 rounded">{ex.type.replace('primary_', '').replace('_', ' ')}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">{formatDistanceToNow(new Date(ex.executedAt))} ago</span>
                </div>
                {!ex.feedback ? (
                  <div className="flex gap-2 w-full">
                    <button onClick={() => handleFeedback(ex.id, 'better')} className="flex-1 py-2 flex flex-col items-center gap-1 hover:bg-green-500/10 text-green-500/70 hover:text-green-500 rounded border border-border hover:border-green-500/30 transition-all"><ThumbsUp className="w-4 h-4" /><span className="text-[10px] font-bold">BETTER</span></button>
                    <button onClick={() => handleFeedback(ex.id, 'same')} className="flex-1 py-2 flex flex-col items-center gap-1 hover:bg-secondary text-muted-foreground rounded border border-border hover:border-foreground/20 transition-all"><Minus className="w-4 h-4" /><span className="text-[10px] font-bold">SAME</span></button>
                    <button onClick={() => handleFeedback(ex.id, 'worse')} className="flex-1 py-2 flex flex-col items-center gap-1 hover:bg-destructive/10 text-destructive/70 hover:text-destructive rounded border border-border hover:border-destructive/30 transition-all"><ThumbsDown className="w-4 h-4" /><span className="text-[10px] font-bold">WORSE</span></button>
                  </div>
                ) : (
                  <div className={`text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 py-2 rounded bg-secondary/20 ${ex.feedback === 'better' ? 'text-green-500' : ex.feedback === 'worse' ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {ex.feedback === 'better' ? <ThumbsUp className="w-4 h-4" /> : ex.feedback === 'worse' ? <ThumbsDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                    Result: {ex.feedback}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
