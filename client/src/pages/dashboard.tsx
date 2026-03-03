import { usePersistedStore } from "@/lib/store";
import { Link } from "wouter";
import { AlertTriangle, Zap, Activity, CheckCircle2, ThumbsUp, ThumbsDown, Minus, Copy, Info, ChevronDown, ChevronUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { PostPackage } from "@/lib/engine";
import { VideoData } from "@/lib/store";

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
        <div className="mt-2 text-xs text-muted-foreground bg-secondary/20 p-3 rounded-md border border-border/20">
          This system uses <strong>heuristics</strong> (math + rules), not AI. It looks at your video titles, view counts compared to your average, and how long ago you posted. It builds these suggestions by slotting your topics into proven templates.
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
  video
}: { 
  title: string, 
  badge: string,
  badgeColor: string,
  move: PostPackage, 
  type: any, 
  onExecute: any, 
  executions: any[],
  video?: VideoData
}) {
  const { toast } = useToast();
  
  const handleCopy = () => {
    const content = `Hook: ${move.hook}\nVariants:\n${move.hookVariants.map(v => `- ${v}`).join('\n')}\n\nCaption: ${move.captionStarter}\n\nCTAs:\n${move.ctaVariants.map(v => `- ${v}`).join('\n')}\n\nHashtags: ${move.hashtags}`;
    navigator.clipboard.writeText(content);
    toast({ title: "Copied to clipboard", description: "Package ready for posting." });
  };

  const hasExecuted = executions.some(e => e.type === type && (Date.now() - new Date(e.executedAt).getTime()) < 24 * 60 * 60 * 1000);

  return (
    <div className="bg-card border border-border/50 rounded-xl p-5 md:p-6 shadow-lg flex flex-col relative group">
      
      <div className="flex items-start justify-between mb-4">
        <div>
          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider mb-2 ${badgeColor}`}>
            {badge}
          </span>
          <h3 className="font-bold text-xl md:text-2xl tracking-tight text-foreground">
            {title}
          </h3>
        </div>
      </div>

      <p className="text-muted-foreground text-sm leading-relaxed mb-6 bg-secondary/10 p-3 rounded-lg border border-border/30">
        {move.why}
      </p>

      {video && (
        <div className="flex gap-4 mb-6 p-3 rounded-lg border border-border/40 bg-background/50 items-center">
          {video.thumbnail ? (
            <img src={video.thumbnail} alt={video.title} className="w-24 h-16 object-cover rounded bg-secondary shrink-0" />
          ) : (
            <div className="w-24 h-16 rounded bg-secondary flex items-center justify-center shrink-0">
              <span className="text-xs text-muted-foreground">No image</span>
            </div>
          )}
          <div className="min-w-0">
            <h4 className="font-semibold text-sm truncate" title={video.title}>{video.title}</h4>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
              <span>{video.viewCount.toLocaleString()} views</span>
              <span>•</span>
              <span>{video.freshness}d ago</span>
            </div>
            {video.notes && (
              <div className="mt-1 text-[10px] text-yellow-500/80 bg-yellow-500/10 px-1.5 py-0.5 rounded inline-block truncate max-w-full">
                Note: {video.notes}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-3 mb-6 flex-1">
        <div className="bg-secondary/20 p-3 rounded-lg border border-border/30">
          <span className="text-xs font-mono text-muted-foreground uppercase mb-1 block">Try This Hook</span>
          <span className="font-medium text-sm">{move.hook}</span>
        </div>
        <div className="bg-secondary/20 p-3 rounded-lg border border-border/30">
          <span className="text-xs font-mono text-muted-foreground uppercase mb-1 block">Caption Starter</span>
          <span className="text-sm text-muted-foreground">{move.captionStarter || 'N/A'}</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mt-auto">
        <button 
          onClick={() => onExecute(type)}
          disabled={hasExecuted}
          className={`flex-1 py-2.5 rounded-md text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer ${hasExecuted ? 'bg-green-500/20 text-green-500 border border-green-500/30 cursor-not-allowed' : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(255,255,255,0.1)]'}`}
        >
          {hasExecuted ? <CheckCircle2 className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
          {hasExecuted ? 'Marked as Done' : 'Mark Done'}
        </button>
        <button onClick={handleCopy} className="sm:w-auto w-full px-4 py-2.5 bg-secondary text-foreground hover:bg-secondary/80 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer border border-border">
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

  // Check if we have data, and if the brief matches the current schema (e.g. has moves.repost)
  if (!brief || videos.length === 0 || !brief.moves?.repost) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 mb-6 rounded-full bg-secondary/50 border border-border/50 flex items-center justify-center">
          <Activity className="w-10 h-10 text-muted-foreground opacity-50" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome to Social OS</h1>
        <p className="text-muted-foreground max-w-md mb-8">
          {!brief?.moves?.repost && videos.length > 0 
            ? "We've updated our strategic engine. Please head to Connect and sync again to generate your new opportunities."
            : "Connect your YouTube channel to see exactly what you should do next to grow your audience."}
        </p>
        <Link href="/connect">
          <button className="bg-primary text-primary-foreground px-6 py-3 rounded-md font-bold flex items-center gap-2 hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 cursor-pointer">
            <Zap className="w-5 h-5" />
            {(!brief?.moves?.repost && videos.length > 0) ? "Go to Connect" : "Connect YouTube"}
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
  
  // Notification check
  const hasExecutedRecently = executions.some(e => (Date.now() - new Date(e.executedAt).getTime()) < 3 * 24 * 60 * 60 * 1000);

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 pt-8 md:pt-10 pb-20 animate-in slide-in-from-bottom-4 fade-in duration-500">
      
      {!hasExecutedRecently && executions.length > 0 && (
        <div className="mb-6 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-center gap-3 text-yellow-500 text-sm font-medium">
          <Activity className="w-4 h-4" />
          You haven't executed a growth action in 3 days. Pick one below to keep momentum going.
        </div>
      )}

      {warnings.length > 0 && (
        <div className="mb-6 bg-destructive/10 border border-destructive/30 rounded-xl p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-destructive font-bold">
            <AlertTriangle className="w-5 h-5" />
            System Warning – Do Not Ignore
          </div>
          <ul className="list-disc list-inside text-sm space-y-1 text-destructive/90 ml-1">
            {warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Yo. Here's what to do today.</h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-secondary/50 border border-border/50">
            <Activity className="w-3 h-3 text-primary" />
            Score: <strong className="text-foreground">{opportunityScore}/100</strong>
          </span>
          <span className="opacity-50">•</span>
          <span>Based on {videos.length} videos</span>
          <span className="opacity-50">•</span>
          <span>Synced {lastSyncedAt ? formatDistanceToNow(new Date(lastSyncedAt)) : ''} ago</span>
        </div>
      </header>

      <div className="flex flex-col gap-8 mb-12">
        {/* Primary Action */}
        <OpportunityCard 
          title="Repost This (High Probability)"
          badge="Do This First"
          badgeColor="bg-green-500/20 text-green-500 border-green-500/30"
          move={moves.repost} 
          type="repost" 
          onExecute={handleExecute} 
          executions={executions}
          video={moves.repost.sourceVideo}
        />

        {/* Secondary Actions */}
        <OpportunityCard 
          title="Fix & Retry This"
          badge="Secondary Opportunity"
          badgeColor="bg-yellow-500/20 text-yellow-500 border-yellow-500/30"
          move={moves.fix} 
          type="fix" 
          onExecute={handleExecute} 
          executions={executions}
          video={moves.fix.sourceVideo}
        />

        <OpportunityCard 
          title="Try This New Angle"
          badge="Secondary Opportunity"
          badgeColor="bg-blue-500/20 text-blue-500 border-blue-500/30"
          move={moves.newAngle} 
          type="new_angle" 
          onExecute={handleExecute} 
          executions={executions}
        />
      </div>

      {/* Feedback loop */}
      {recentExecutions.length > 0 && (
        <div className="mt-12">
          <h2 className="font-bold text-lg mb-4">Did these work for you?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {recentExecutions.map(ex => (
              <div key={ex.id} className="p-4 rounded-xl bg-card border border-border/50 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <span className="font-medium text-sm capitalize">{ex.type.replace('_', ' ')}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">{formatDistanceToNow(new Date(ex.executedAt))} ago</span>
                </div>
                {!ex.feedback ? (
                  <div className="flex gap-2 w-full">
                    <button onClick={() => handleFeedback(ex.id, 'better')} className="flex-1 py-1.5 flex justify-center hover:bg-green-500/20 text-green-500 rounded border border-transparent hover:border-green-500/30 transition-colors"><ThumbsUp className="w-4 h-4" /></button>
                    <button onClick={() => handleFeedback(ex.id, 'same')} className="flex-1 py-1.5 flex justify-center hover:bg-secondary text-muted-foreground rounded border border-transparent hover:border-border transition-colors"><Minus className="w-4 h-4" /></button>
                    <button onClick={() => handleFeedback(ex.id, 'worse')} className="flex-1 py-1.5 flex justify-center hover:bg-destructive/20 text-destructive rounded border border-transparent hover:border-destructive/30 transition-colors"><ThumbsDown className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <div className={`text-xs font-bold uppercase tracking-wider ${ex.feedback === 'better' ? 'text-green-500' : ex.feedback === 'worse' ? 'text-destructive' : 'text-muted-foreground'}`}>
                    You said: {ex.feedback}
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
