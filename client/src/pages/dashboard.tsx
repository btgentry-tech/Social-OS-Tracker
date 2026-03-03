import { usePersistedStore, useSessionStore } from "@/lib/store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { AlertTriangle, Zap, Activity, CheckCircle2, ThumbsUp, ThumbsDown, Minus, Copy, Info, ChevronDown, ChevronUp, Target, TrendingUp, RefreshCw, ListChecks } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function ScoreBreakdown({ breakdown }: { breakdown: any }) {
  const [open, setOpen] = useState(false);
  if (!breakdown) return null;
  return (
    <div className="mt-4 pt-4 border-t border-border/30">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[10px] uppercase font-mono text-muted-foreground hover:text-foreground transition-colors"
        data-testid="button-score-breakdown"
      >
        <Info className="w-3 h-3" /> How we decided {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {open && (
        <div className="mt-3 text-xs text-muted-foreground bg-secondary/20 p-4 rounded-md border border-border/20 leading-relaxed space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div><span className="font-medium text-foreground">Performance Ratio:</span> {breakdown.performanceRatio}x avg</div>
            <div><span className="font-medium text-foreground">Freshness:</span> {breakdown.freshness} days</div>
            <div><span className="font-medium text-foreground">Hook Quality:</span> {breakdown.hookQuality}/100</div>
            <div><span className="font-medium text-foreground">Thumbnail Quality:</span> {breakdown.thumbnailQuality}/100</div>
            <div><span className="font-medium text-foreground">Novelty:</span> {breakdown.novelty}%</div>
            <div><span className="font-medium text-foreground">Fatigue Penalty:</span> -{breakdown.fatiguePenalty}%</div>
          </div>
        </div>
      )}
    </div>
  );
}

function OpportunityCard({
  title, badge, badgeColor, item, onExecute, isPrimary = false
}: {
  title: string;
  badge: string;
  badgeColor: string;
  item: any;
  onExecute: (type: string, videoId?: string) => void;
  isPrimary?: boolean;
}) {
  const { toast } = useToast();
  const pkg = item.package;
  const video = item.video;

  const handleCopy = () => {
    const content = `Hook: ${pkg.hook}\nVariants:\n${pkg.hookVariants.map((v: string) => `- ${v}`).join("\n")}\n\nCaption: ${pkg.captionStarter}\n\nCTAs:\n${pkg.ctaVariants.map((v: string) => `- ${v}`).join("\n")}\n\nHashtags: ${pkg.hashtags}`;
    navigator.clipboard.writeText(content);
    toast({ title: "Copied to clipboard", description: "Package ready for posting." });
  };

  const confidenceColors: Record<string, string> = {
    High: "text-green-500 bg-green-500/10 border-green-500/20",
    Medium: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
    Experimental: "text-purple-500 bg-purple-500/10 border-purple-500/20",
  };

  return (
    <div className={`bg-card border ${isPrimary ? "border-primary/50 shadow-[0_8px_30px_rgba(255,255,255,0.05)]" : "border-border/50 shadow-lg"} rounded-xl p-5 md:p-8 flex flex-col relative group`} data-testid={`card-action-${item.section}`}>
      {isPrimary && (
        <div className="absolute -top-3.5 left-6 px-3 py-1 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider rounded shadow-md">
          Do This Next
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${badgeColor}`} data-testid={`badge-${item.section}`}>
              {badge}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border ${confidenceColors[pkg.confidence] || confidenceColors.Medium}`}>
              {pkg.confidence} Confidence
            </span>
          </div>
          <h3 className="font-bold text-2xl md:text-3xl tracking-tight text-foreground" data-testid={`text-title-${item.section}`}>
            {title}
          </h3>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="text-right cursor-help">
              <span className="text-[10px] text-muted-foreground uppercase font-mono">Score</span>
              <div className="text-2xl font-bold text-yellow-500">{pkg.opportunityScore}</div>
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs p-3">
            <p className="text-xs leading-relaxed">Composite score based on performance ratio, hook quality, thumbnail impact, novelty, and fatigue signals.</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {video && (
        <div className="flex gap-4 mb-6 p-4 rounded-xl border border-border/60 bg-background/80 items-center">
          {video.thumbnailUrl ? (
            <img src={video.thumbnailUrl} alt={video.title} className="w-32 h-20 object-cover rounded bg-secondary shrink-0 shadow-sm" data-testid={`img-thumbnail-${video.id}`} />
          ) : (
            <div className="w-32 h-20 rounded bg-secondary flex items-center justify-center shrink-0 shadow-sm">
              <span className="text-xs text-muted-foreground">No image</span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-base line-clamp-2 leading-tight" title={video.title}>{video.title}</h4>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
              <span className="flex items-center gap-1 bg-secondary px-2 py-0.5 rounded"><Activity className="w-3 h-3" /> {video.viewCount?.toLocaleString()} views</span>
              {video.hookScore > 0 && <span className="bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded">Hook: {Math.round(video.hookScore)}</span>}
              {video.thumbnailScore > 0 && <span className="bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded">Thumb: {Math.round(video.thumbnailScore)}</span>}
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
          <p className="text-sm leading-relaxed">{pkg.diagnosis}</p>
        </div>
        <div className="space-y-2">
          <h4 className="text-xs font-mono text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" /> Action Plan
          </h4>
          <p className="text-sm leading-relaxed font-medium">{pkg.actionPlan}</p>
        </div>
      </div>

      <div className="bg-secondary/10 p-5 rounded-xl border border-border/40 mb-8 space-y-4">
        <h4 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Ready-to-use Assets</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="text-[10px] uppercase text-muted-foreground block mb-1">Suggested Hook</span>
            <span className="text-sm font-medium">{pkg.hook}</span>
          </div>
          <div>
            <span className="text-[10px] uppercase text-muted-foreground block mb-1">Caption Starter</span>
            <span className="text-sm text-muted-foreground">{pkg.captionStarter}</span>
          </div>
        </div>
        {pkg.hookVariants && pkg.hookVariants.length > 0 && (
          <div>
            <span className="text-[10px] uppercase text-muted-foreground block mb-1">Hook Variants</span>
            <ul className="text-sm space-y-1">
              {pkg.hookVariants.map((v: string, i: number) => (
                <li key={i} className="text-muted-foreground">• {v}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mt-auto">
        <button
          onClick={() => onExecute(item.section, video?.id)}
          className="flex-1 py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)]"
          data-testid={`button-execute-${item.section}`}
        >
          <Zap className="w-5 h-5" />
          Mark Done
        </button>
        <button onClick={handleCopy} className="sm:w-auto w-full px-6 py-3 bg-secondary text-foreground hover:bg-secondary/80 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer border border-border" data-testid={`button-copy-${item.section}`}>
          <Copy className="w-4 h-4" /> Copy Assets
        </button>
      </div>

      <ScoreBreakdown breakdown={pkg.scoreBreakdown} />
    </div>
  );
}

export default function Dashboard() {
  const { youtubeChannelId } = usePersistedStore();
  const { isAnalyzing, setAnalyzing } = useSessionStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: feed, isLoading } = useQuery({
    queryKey: ["/api/analyze", youtubeChannelId],
    queryFn: async () => {
      if (!youtubeChannelId) return null;
      const res = await apiRequest("POST", "/api/analyze", { channelId: youtubeChannelId });
      return res.json();
    },
    enabled: !!youtubeChannelId,
    staleTime: 60000,
  });

  const { data: executions = [] } = useQuery({
    queryKey: ["/api/executions", youtubeChannelId],
    queryFn: async () => {
      if (!youtubeChannelId) return [];
      const res = await fetch(`/api/executions?channelId=${youtubeChannelId}`);
      return res.json();
    },
    enabled: !!youtubeChannelId,
  });

  const executeMutation = useMutation({
    mutationFn: async ({ type, videoId }: { type: string; videoId?: string }) => {
      return apiRequest("POST", "/api/execute", {
        channelId: youtubeChannelId,
        videoId: videoId || null,
        type,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/executions"] });
      toast({ title: "Action completed!", description: "Come back later to rate the result." });
    },
  });

  const feedbackMutation = useMutation({
    mutationFn: async ({ executionId, result }: { executionId: string; result: string }) => {
      return apiRequest("POST", "/api/feedback", {
        executionId,
        channelId: youtubeChannelId,
        result,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feedback"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analyze"] });
      toast({ title: "Feedback Recorded", description: "The engine will adjust future recommendations." });
    },
  });

  if (!youtubeChannelId || (!feed && !isLoading)) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 mb-6 rounded-full bg-secondary/50 border border-border/50 flex items-center justify-center">
          <Activity className="w-10 h-10 text-muted-foreground opacity-50" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-2" data-testid="text-welcome">Welcome to Creator OS</h1>
        <p className="text-muted-foreground max-w-md mb-8">
          Connect your YouTube channel to see exactly what you should do next to grow your audience.
        </p>
        <Link href="/connect">
          <button className="bg-primary text-primary-foreground px-6 py-3 rounded-md font-bold flex items-center gap-2 hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 cursor-pointer" data-testid="button-connect">
            <Zap className="w-5 h-5" />
            Connect YouTube
          </button>
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-8 pt-8 pb-20 animate-pulse">
        <div className="h-10 bg-secondary/30 rounded w-1/3 mb-4" />
        <div className="h-6 bg-secondary/20 rounded w-2/3 mb-10" />
        <div className="space-y-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-card border border-border/30 rounded-xl p-8">
              <div className="h-6 bg-secondary/20 rounded w-1/4 mb-4" />
              <div className="h-8 bg-secondary/30 rounded w-1/2 mb-6" />
              <div className="h-20 bg-secondary/10 rounded mb-4" />
              <div className="h-32 bg-secondary/10 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!feed || !feed.items || feed.items.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center">
        <Activity className="w-10 h-10 text-muted-foreground opacity-50 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Not enough data yet</h1>
        <p className="text-muted-foreground mb-6">Sync at least 3 videos to generate your action feed.</p>
        <Link href="/connect">
          <button className="bg-primary text-primary-foreground px-6 py-3 rounded-md font-bold" data-testid="button-sync-more">
            Go to Connect
          </button>
        </Link>
      </div>
    );
  }

  const { momentum, items, warnings, gameplan, overallOpportunityScore, videoCount, lastSync } = feed;
  const primaryItem = items[0];
  const secondaryItems = items.slice(1);

  const handleExecute = (type: string, videoId?: string) => {
    executeMutation.mutate({ type, videoId });
  };

  const recentExecs = executions.slice(0, 3);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 pt-8 md:pt-10 pb-20 animate-in slide-in-from-bottom-4 fade-in duration-500">
      {warnings.length > 0 && (
        <div className="mb-8 bg-destructive/10 border border-destructive/30 rounded-xl p-5 flex flex-col gap-3 shadow-sm" data-testid="card-warnings">
          <div className="flex items-center gap-2 text-destructive font-bold text-lg">
            <AlertTriangle className="w-5 h-5" />
            System Warning
          </div>
          <ul className="list-disc list-inside space-y-1 text-destructive/90 ml-1 font-medium">
            {warnings.map((w: string, i: number) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      <header className="mb-10 flex flex-col md:flex-row justify-between md:items-end gap-6 border-b border-border/40 pb-6">
        <div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-3" data-testid="text-brief-title">Yo. Here's what to do today.</h1>
          <p className="text-muted-foreground text-lg">Your intelligence brief based on {videoCount} videos.</p>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end text-right">
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-mono mb-1">Momentum</span>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${momentum.trend === "up" ? "text-green-500" : momentum.trend === "down" ? "text-destructive" : "text-muted-foreground"}`}>
                {momentum.label}
              </span>
              <TrendingUp className={`w-4 h-4 ${momentum.trend === "up" ? "text-green-500" : momentum.trend === "down" ? "text-destructive rotate-180" : "text-muted-foreground"}`} />
            </div>
            {lastSync && (
              <span className="text-[10px] text-muted-foreground mt-0.5">
                Synced {formatDistanceToNow(new Date(lastSync))} ago
              </span>
            )}
          </div>

          <div className="w-px h-12 bg-border/50" />

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex flex-col items-end text-right cursor-help" data-testid="text-opportunity-score">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-mono mb-1 flex items-center gap-1.5">
                  Opportunity <Info className="w-3 h-3 text-muted-foreground/50" />
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold tracking-tighter text-yellow-500">{overallOpportunityScore}</span>
                  <span className="text-sm text-muted-foreground">/100</span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs p-3">
              <p className="text-xs leading-relaxed">{momentum.details}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </header>

      <div className="flex flex-col gap-10 mb-16">
        {primaryItem && (
          <OpportunityCard
            title={primaryItem.title}
            badge={primaryItem.badge}
            badgeColor="bg-primary/20 text-primary border-primary/30"
            item={primaryItem}
            onExecute={handleExecute}
            isPrimary={true}
          />
        )}

        {secondaryItems.length > 0 && (
          <>
            <div className="flex items-center gap-4 my-2">
              <div className="h-px bg-border/50 flex-1" />
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">Secondary Opportunities</span>
              <div className="h-px bg-border/50 flex-1" />
            </div>
            {secondaryItems.map((item: any, idx: number) => (
              <OpportunityCard
                key={idx}
                title={item.title}
                badge={item.badge}
                badgeColor="bg-secondary text-foreground border-border"
                item={item}
                onExecute={handleExecute}
              />
            ))}
          </>
        )}
      </div>

      {gameplan && gameplan.length > 0 && (
        <div className="mb-16 bg-card border border-border/50 rounded-xl p-6 md:p-8" data-testid="card-gameplan">
          <h2 className="font-bold text-xl mb-4 flex items-center gap-2"><ListChecks className="w-5 h-5 text-primary" /> Today's Gameplan</h2>
          <ul className="space-y-3">
            {gameplan.map((step: string, i: number) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>
                <span className="leading-relaxed">{step.replace(/^\d+\.\s*/, "")}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {recentExecs.length > 0 && (
        <div className="mt-8 pt-8 border-t border-border/30">
          <h2 className="font-bold text-xl mb-6">Did these work for you?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentExecs.map((ex: any) => (
              <div key={ex.id} className="p-5 rounded-xl bg-card border border-border/50 shadow-sm" data-testid={`card-feedback-${ex.id}`}>
                <div className="flex justify-between items-start mb-4">
                  <span className="font-medium text-sm capitalize bg-secondary/50 px-2 py-1 rounded">{ex.type.replace("primary_", "").replace(/_/g, " ")}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">{formatDistanceToNow(new Date(ex.executedAt))} ago</span>
                </div>
                <div className="flex gap-2 w-full">
                  <button onClick={() => feedbackMutation.mutate({ executionId: ex.id, result: "better" })} className="flex-1 py-2 flex flex-col items-center gap-1 hover:bg-green-500/10 text-green-500/70 hover:text-green-500 rounded border border-border hover:border-green-500/30 transition-all" data-testid={`button-feedback-better-${ex.id}`}>
                    <ThumbsUp className="w-4 h-4" /><span className="text-[10px] font-bold">BETTER</span>
                  </button>
                  <button onClick={() => feedbackMutation.mutate({ executionId: ex.id, result: "same" })} className="flex-1 py-2 flex flex-col items-center gap-1 hover:bg-secondary text-muted-foreground rounded border border-border hover:border-foreground/20 transition-all" data-testid={`button-feedback-same-${ex.id}`}>
                    <Minus className="w-4 h-4" /><span className="text-[10px] font-bold">SAME</span>
                  </button>
                  <button onClick={() => feedbackMutation.mutate({ executionId: ex.id, result: "worse" })} className="flex-1 py-2 flex flex-col items-center gap-1 hover:bg-destructive/10 text-destructive/70 hover:text-destructive rounded border border-border hover:border-destructive/30 transition-all" data-testid={`button-feedback-worse-${ex.id}`}>
                    <ThumbsDown className="w-4 h-4" /><span className="text-[10px] font-bold">WORSE</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
