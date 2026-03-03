import { usePersistedStore } from "@/lib/store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import {
  AlertTriangle, Zap, Activity, ThumbsUp, ThumbsDown, Minus,
  Copy, Info, ChevronDown, ChevronUp, TrendingUp, Calendar,
  Clock, Star, RotateCcw, Wrench, Archive, RefreshCw,
  Eye, Hash, MessageSquare, Sparkles
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const CLASS_STYLES: Record<string, { color: string; bg: string; border: string; icon: any }> = {
  "Evergreen Winner": { color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20", icon: Star },
  "Repost Candidate": { color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", icon: RotateCcw },
  "Retry (Second Shot)": { color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20", icon: RefreshCw },
  "Restructure": { color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20", icon: Wrench },
  "Archive": { color: "text-neutral-400", bg: "bg-neutral-500/10", border: "border-neutral-500/20", icon: Archive },
};

const CONFIDENCE_STYLES: Record<string, string> = {
  High: "text-green-400 bg-green-500/10 border-green-500/20",
  Medium: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
  Low: "text-neutral-400 bg-neutral-500/10 border-neutral-500/20",
};

function ScoreBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="w-full h-1.5 bg-secondary/40 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-amber-400 transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function ScoreBreakdownPanel({ breakdown }: { breakdown: any }) {
  if (!breakdown) return null;

  const components = [
    { label: "Views Performance", value: breakdown.viewsRatioScore, max: 30, description: "How this video compares to your channel average" },
    { label: "Timing", value: breakdown.decayScore, max: 20, description: "Older content is better for reposts" },
    { label: "Thumbnail Impact", value: breakdown.thumbnailQualityScore, max: 15, description: "Visual quality of the thumbnail" },
    { label: "Hook Quality", value: breakdown.hookQualityScore, max: 10, description: "Strength of the opening language" },
    { label: "Novelty", value: breakdown.noveltyScore, max: 10, description: "Uncommon theme or format" },
  ];

  const penalties = [
    breakdown.repetitionPenalty > 0 && { label: "Repetition Penalty", value: -breakdown.repetitionPenalty },
    breakdown.timeSensitivePenalty > 0 && { label: "Time-Sensitive", value: -breakdown.timeSensitivePenalty },
  ].filter(Boolean) as { label: string; value: number }[];

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {components.map(c => (
          <div key={c.label}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">{c.label}</span>
              <span className="font-mono text-foreground">{c.value.toFixed(1)} / {c.max}</span>
            </div>
            <ScoreBar value={c.value} max={c.max} />
          </div>
        ))}
      </div>
      {penalties.length > 0 && (
        <div className="border-t border-border/30 pt-3 space-y-1">
          {penalties.map(p => (
            <div key={p.label} className="flex justify-between text-xs">
              <span className="text-red-400">{p.label}</span>
              <span className="font-mono text-red-400">{p.value.toFixed(1)}</span>
            </div>
          ))}
        </div>
      )}
      {breakdown.explanation && breakdown.explanation.length > 0 && (
        <div className="border-t border-border/30 pt-3">
          <span className="text-[10px] uppercase text-muted-foreground font-mono block mb-2">Why this score</span>
          <ul className="space-y-1">
            {breakdown.explanation.map((e: string, i: number) => (
              <li key={i} className="text-xs text-muted-foreground leading-relaxed flex gap-2">
                <span className="text-primary shrink-0 mt-0.5">-</span> {e}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function PlanDetails({ plan, classLabel }: { plan: any; classLabel: string }) {
  if (!plan) return null;
  const { toast } = useToast();

  const handleCopyAll = () => {
    const parts: string[] = [];
    if (plan.hookVariants?.length) parts.push(`Hooks:\n${plan.hookVariants.map((h: string) => `- ${h}`).join("\n")}`);
    if (plan.captionStarter) parts.push(`Caption: ${plan.captionStarter}`);
    if (plan.ctaVariants?.length) parts.push(`CTAs:\n${plan.ctaVariants.map((c: string) => `- ${c}`).join("\n")}`);
    if (plan.hashtagPack?.length) parts.push(`Hashtags: ${plan.hashtagPack.join(" ")}`);
    navigator.clipboard.writeText(parts.join("\n\n"));
    toast({ title: "Copied to clipboard" });
  };

  return (
    <div className="space-y-4">
      {plan.hookVariants?.length > 0 && (
        <div>
          <span className="text-[10px] uppercase text-muted-foreground font-mono block mb-2">Hook Variants</span>
          <ul className="space-y-1.5">
            {plan.hookVariants.map((h: string, i: number) => (
              <li key={i} className="text-sm text-foreground bg-secondary/20 px-3 py-2 rounded border border-border/20">
                {h}
              </li>
            ))}
          </ul>
        </div>
      )}

      {plan.captionStarter && (
        <div>
          <span className="text-[10px] uppercase text-muted-foreground font-mono block mb-1">Caption Starter</span>
          <p className="text-sm text-muted-foreground">{plan.captionStarter}</p>
        </div>
      )}

      {plan.ctaVariants?.length > 0 && (
        <div>
          <span className="text-[10px] uppercase text-muted-foreground font-mono block mb-1">Call-to-Action Options</span>
          <ul className="space-y-1">
            {plan.ctaVariants.map((c: string, i: number) => (
              <li key={i} className="text-sm text-muted-foreground">- {c}</li>
            ))}
          </ul>
        </div>
      )}

      {plan.hashtagPack?.length > 0 && (
        <div>
          <span className="text-[10px] uppercase text-muted-foreground font-mono block mb-1">Hashtags</span>
          <div className="flex flex-wrap gap-1.5">
            {plan.hashtagPack.map((h: string, i: number) => (
              <span key={i} className="text-xs bg-secondary/40 text-muted-foreground px-2 py-0.5 rounded">
                {h}
              </span>
            ))}
          </div>
        </div>
      )}

      {plan.specificChanges?.length > 0 && (
        <div>
          <span className="text-[10px] uppercase text-muted-foreground font-mono block mb-2">Recommended Changes</span>
          <ul className="space-y-1.5">
            {plan.specificChanges.map((c: string, i: number) => (
              <li key={i} className="text-sm text-foreground flex gap-2">
                <Wrench className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" /> {c}
              </li>
            ))}
          </ul>
        </div>
      )}

      {plan.repurposePlan?.length > 0 && (
        <div>
          <span className="text-[10px] uppercase text-muted-foreground font-mono block mb-2">Repurpose Plan</span>
          <ul className="space-y-1">
            {plan.repurposePlan.map((r: string, i: number) => (
              <li key={i} className="text-sm text-muted-foreground flex gap-2">
                <span className="text-green-400 shrink-0">+</span> {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {plan.sequelIdeas?.length > 0 && (
        <div>
          <span className="text-[10px] uppercase text-muted-foreground font-mono block mb-2">Sequel Ideas</span>
          <ul className="space-y-1">
            {plan.sequelIdeas.map((s: string, i: number) => (
              <li key={i} className="text-sm text-muted-foreground flex gap-2">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400 shrink-0 mt-0.5" /> {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {plan.repostCadence && (
        <div className="text-sm text-muted-foreground bg-green-500/5 px-3 py-2 rounded border border-green-500/10">
          <Clock className="w-3.5 h-3.5 inline mr-1.5 text-green-400" />
          {plan.repostCadence}
        </div>
      )}

      {plan.newFraming && (
        <div className="text-sm text-foreground bg-orange-500/5 px-3 py-2 rounded border border-orange-500/10">
          <Wrench className="w-3.5 h-3.5 inline mr-1.5 text-orange-400" />
          {plan.newFraming}
        </div>
      )}

      {plan.archiveReason && (
        <div className="text-sm text-muted-foreground bg-neutral-500/5 px-3 py-2 rounded border border-neutral-500/10">
          <Archive className="w-3.5 h-3.5 inline mr-1.5 text-neutral-400" />
          {plan.archiveReason}
        </div>
      )}

      {plan.extractedPattern && (
        <div className="text-sm text-muted-foreground italic bg-secondary/10 px-3 py-2 rounded">
          {plan.extractedPattern}
        </div>
      )}

      {plan.scheduleSlots?.length > 0 && (
        <div>
          <span className="text-[10px] uppercase text-muted-foreground font-mono block mb-2">Posting Slots</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {plan.scheduleSlots.slice(0, 3).map((s: any, i: number) => (
              <div key={i} className="text-xs bg-secondary/20 px-2 py-1.5 rounded border border-border/20 text-center">
                <div className="font-medium text-foreground">{s.day.split(",")[0]}</div>
                <div className="text-muted-foreground">{s.time}</div>
                <div className={`text-[9px] mt-0.5 ${s.label === "Prime slot" ? "text-green-400" : "text-muted-foreground"}`}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={handleCopyAll}
        className="w-full mt-2 py-2 bg-secondary/50 hover:bg-secondary text-foreground text-sm font-medium rounded flex items-center justify-center gap-2 transition-colors border border-border/30"
        data-testid="button-copy-plan"
      >
        <Copy className="w-3.5 h-3.5" /> Copy All Assets
      </button>
    </div>
  );
}

function OpportunityRow({ opp, videos, onExecute, rank }: {
  opp: any;
  videos: any[];
  onExecute: (classLabel: string, videoId: string) => void;
  rank: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const style = CLASS_STYLES[opp.classLabel] || CLASS_STYLES["Archive"];
  const confStyle = CONFIDENCE_STYLES[opp.confidence] || CONFIDENCE_STYLES["Low"];
  const ClassIcon = style.icon;
  const video = videos.find((v: any) => v.id === opp.videoId);
  const topReasons = (opp.reasons || []).slice(0, 2);

  const primaryAction = opp.classLabel === "Evergreen Winner" ? "Repost & Repurpose"
    : opp.classLabel === "Repost Candidate" ? "Repost This"
    : opp.classLabel === "Retry (Second Shot)" ? "Retry With Changes"
    : opp.classLabel === "Restructure" ? "Restructure This"
    : "Archived";

  return (
    <div
      className={`bg-card border rounded-xl overflow-hidden transition-all ${
        rank === 0 ? "border-primary/40 shadow-[0_4px_20px_rgba(255,255,255,0.03)]" : "border-border/40"
      }`}
      data-testid={`card-opportunity-${opp.videoId}`}
    >
      <div
        className="flex items-start gap-3 p-4 cursor-pointer hover:bg-secondary/5 transition-colors"
        onClick={() => setExpanded(!expanded)}
        data-testid={`button-expand-${opp.videoId}`}
      >
        {video?.thumbnailUrl ? (
          <img src={video.thumbnailUrl} alt={opp.title} className="w-24 h-[54px] object-cover rounded bg-secondary shrink-0" data-testid={`img-thumb-${opp.videoId}`} />
        ) : (
          <div className="w-24 h-[54px] rounded bg-secondary flex items-center justify-center shrink-0">
            <span className="text-[10px] text-muted-foreground">No img</span>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${style.bg} ${style.color} border ${style.border}`}>
              <ClassIcon className="w-3 h-3" /> {opp.classLabel}
            </span>
            <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] uppercase font-bold border ${confStyle}`}>
              {opp.confidence}
            </span>
            {rank === 0 && (
              <span className="inline-flex px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-primary/20 text-primary border border-primary/30">
                Top Pick
              </span>
            )}
          </div>
          <h3 className="font-semibold text-sm line-clamp-1 mb-1" title={opp.title} data-testid={`text-title-${opp.videoId}`}>
            {opp.title}
          </h3>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {video && (
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" /> {video.viewCount?.toLocaleString()}
              </span>
            )}
            <span>{opp.viewsRatio}x avg</span>
            <span>{opp.freshnessDays}d old</span>
          </div>
          {topReasons.length > 0 && (
            <div className="mt-2 space-y-0.5">
              {topReasons.map((r: string, i: number) => (
                <p key={i} className="text-xs text-muted-foreground leading-relaxed line-clamp-1">{r}</p>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-center cursor-help" data-testid={`text-score-${opp.videoId}`}>
                <div className="text-xl font-bold text-yellow-400 leading-none">{opp.opportunityScore}</div>
                <div className="text-[9px] text-muted-foreground font-mono">/100</div>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs p-3">
              <p className="text-xs">Opportunity score based on views performance, timing, novelty, thumbnail and hook quality.</p>
            </TooltipContent>
          </Tooltip>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border/30 bg-secondary/5 p-4 space-y-5 animate-in slide-in-from-top-2 fade-in duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <h4 className="text-[10px] uppercase text-muted-foreground font-mono mb-3 flex items-center gap-1.5">
                <Info className="w-3 h-3" /> How We Decided
              </h4>
              <ScoreBreakdownPanel breakdown={opp.scoreBreakdown} />
            </div>
            <div>
              <h4 className="text-[10px] uppercase text-muted-foreground font-mono mb-3 flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-primary" /> Plan
              </h4>
              <PlanDetails plan={opp.plan} classLabel={opp.classLabel} />
            </div>
          </div>

          {opp.classLabel !== "Archive" && (
            <button
              onClick={(e) => { e.stopPropagation(); onExecute(opp.classLabel, opp.videoId); }}
              className="w-full py-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-all cursor-pointer"
              data-testid={`button-execute-${opp.videoId}`}
            >
              <Zap className="w-4 h-4" />
              Mark Executed: {primaryAction}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { youtubeChannelId } = usePersistedStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [classFilter, setClassFilter] = useState<string>("all");

  const { data: analysis, isLoading } = useQuery({
    queryKey: ["/api/analyze", youtubeChannelId],
    queryFn: async () => {
      if (!youtubeChannelId) return null;
      const res = await apiRequest("POST", "/api/analyze", { channelId: youtubeChannelId });
      return res.json();
    },
    enabled: !!youtubeChannelId,
    staleTime: 60000,
  });

  const { data: videos = [] } = useQuery({
    queryKey: ["/api/content", youtubeChannelId],
    queryFn: async () => {
      if (!youtubeChannelId) return [];
      const res = await fetch(`/api/content?channelId=${youtubeChannelId}`);
      return res.json();
    },
    enabled: !!youtubeChannelId,
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
      queryClient.invalidateQueries({ queryKey: ["/api/analyze"] });
      toast({ title: "Action marked as executed", description: "Come back later to rate the result." });
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
      toast({ title: "Feedback recorded", description: "The engine will adjust future recommendations." });
    },
  });

  if (!youtubeChannelId || (!analysis && !isLoading)) {
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
            <Zap className="w-5 h-5" /> Connect YouTube
          </button>
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-4 md:p-8 pt-8 pb-20 animate-pulse">
        <div className="h-10 bg-secondary/30 rounded w-1/3 mb-4" />
        <div className="h-6 bg-secondary/20 rounded w-2/3 mb-10" />
        <div className="h-32 bg-secondary/10 rounded mb-6" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-card border border-border/30 rounded-xl h-24" />
          ))}
        </div>
      </div>
    );
  }

  const opportunities = analysis?.opportunities || [];
  const next7Days = analysis?.next7DaysPlan || [];
  const warnings = analysis?.warnings || [];
  const momentum = analysis?.momentum || { score: 0, trend: "flat", label: "Need Data", details: "" };
  const overallScore = analysis?.overallOpportunityScore || 0;
  const videoCount = analysis?.videoCount || 0;
  const lastSync = analysis?.lastSync;
  const winnerCount = analysis?.winnerCount || 0;

  if (opportunities.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-8 text-center">
        <Activity className="w-10 h-10 text-muted-foreground opacity-50 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Not enough data yet</h1>
        <p className="text-muted-foreground mb-6">Sync at least 3 videos to generate your analysis.</p>
        <Link href="/connect">
          <button className="bg-primary text-primary-foreground px-6 py-3 rounded-md font-bold" data-testid="button-sync-more">
            Go to Connect
          </button>
        </Link>
      </div>
    );
  }

  const classCounts: Record<string, number> = {};
  for (const o of opportunities) {
    classCounts[o.classLabel] = (classCounts[o.classLabel] || 0) + 1;
  }

  const filteredOpps = classFilter === "all"
    ? opportunities
    : opportunities.filter((o: any) => o.classLabel === classFilter);

  const handleExecute = (classLabel: string, videoId: string) => {
    executeMutation.mutate({ type: classLabel.toLowerCase().replace(/\s+/g, "_"), videoId });
  };

  const recentExecs = executions.slice(0, 3);

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 pt-8 md:pt-10 pb-20 animate-in slide-in-from-bottom-4 fade-in duration-500">
      {warnings.length > 0 && (
        <div className="mb-6 bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex flex-col gap-2" data-testid="card-warnings">
          <div className="flex items-center gap-2 text-destructive font-bold text-sm">
            <AlertTriangle className="w-4 h-4" /> Warnings
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-sm text-destructive/90 ml-1">
            {warnings.map((w: string, i: number) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      <header className="mb-8 flex flex-col md:flex-row justify-between md:items-end gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2" data-testid="text-brief-title">
            Your Action Plan
          </h1>
          <p className="text-muted-foreground">
            {videoCount} videos analyzed. {winnerCount} evergreen winners found. {opportunities.filter((o: any) => o.classLabel !== "Archive").length} actionable opportunities.
          </p>
        </div>
        <div className="flex items-center gap-5">
          <div className="flex flex-col items-end text-right">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono mb-0.5">Momentum</span>
            <div className="flex items-center gap-1.5">
              <span className={`text-sm font-medium ${momentum.trend === "up" ? "text-green-400" : momentum.trend === "down" ? "text-red-400" : "text-muted-foreground"}`}>
                {momentum.label}
              </span>
              <TrendingUp className={`w-4 h-4 ${momentum.trend === "up" ? "text-green-400" : momentum.trend === "down" ? "text-red-400 rotate-180" : "text-muted-foreground"}`} />
            </div>
            {lastSync && (
              <span className="text-[10px] text-muted-foreground mt-0.5">
                Synced {formatDistanceToNow(new Date(lastSync))} ago
              </span>
            )}
          </div>
          <div className="w-px h-10 bg-border/50" />
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex flex-col items-end text-right cursor-help" data-testid="text-opportunity-score">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono mb-0.5">
                  Opportunity
                </span>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-2xl font-bold tracking-tighter text-yellow-400">{overallScore}</span>
                  <span className="text-xs text-muted-foreground">/100</span>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs p-3">
              <p className="text-xs leading-relaxed">{momentum.details}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </header>

      {next7Days.length > 0 && (
        <div className="mb-8 bg-card border border-border/50 rounded-xl p-5" data-testid="card-7day-plan">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" /> Next 7 Days
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {next7Days.map((slot: any, i: number) => {
              const dayParts = slot.day.split(", ");
              const dayName = dayParts[0];
              const date = dayParts.slice(1).join(", ");
              return (
                <div key={i} className="bg-secondary/20 border border-border/20 rounded-lg px-3 py-2.5" data-testid={`slot-day-${i}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-foreground">{dayName}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{slot.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-snug line-clamp-2">{slot.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground font-mono mr-1">Filter:</span>
        <button
          onClick={() => setClassFilter("all")}
          className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${classFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-secondary/50 text-muted-foreground border-border hover:bg-secondary"}`}
          data-testid="filter-all"
        >
          All ({opportunities.length})
        </button>
        {Object.entries(classCounts).map(([label, count]) => {
          const s = CLASS_STYLES[label] || CLASS_STYLES["Archive"];
          return (
            <button
              key={label}
              onClick={() => setClassFilter(label)}
              className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${classFilter === label ? `${s.bg} ${s.color} ${s.border}` : "bg-secondary/50 text-muted-foreground border-border hover:bg-secondary"}`}
              data-testid={`filter-${label.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {label} ({count})
            </button>
          );
        })}
      </div>

      <div className="space-y-3 mb-12" data-testid="list-opportunities">
        {filteredOpps.map((opp: any, idx: number) => (
          <OpportunityRow
            key={opp.videoId}
            opp={opp}
            videos={videos}
            onExecute={handleExecute}
            rank={classFilter === "all" ? idx : -1}
          />
        ))}
        {filteredOpps.length === 0 && (
          <div className="p-8 text-center text-muted-foreground border border-dashed border-border rounded-xl">
            No videos in this category.
          </div>
        )}
      </div>

      {recentExecs.length > 0 && (
        <div className="pt-8 border-t border-border/30">
          <h2 className="font-bold text-lg mb-4">Did these work for you?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {recentExecs.map((ex: any) => (
              <div key={ex.id} className="p-4 rounded-xl bg-card border border-border/50" data-testid={`card-feedback-${ex.id}`}>
                <div className="flex justify-between items-start mb-3">
                  <span className="font-medium text-sm capitalize bg-secondary/50 px-2 py-0.5 rounded">{ex.type.replace(/_/g, " ")}</span>
                  <span className="text-[10px] text-muted-foreground font-mono">{formatDistanceToNow(new Date(ex.executedAt))} ago</span>
                </div>
                <div className="flex gap-2 w-full">
                  <button onClick={() => feedbackMutation.mutate({ executionId: ex.id, result: "better" })} className="flex-1 py-2 flex flex-col items-center gap-1 hover:bg-green-500/10 text-green-500/70 hover:text-green-400 rounded border border-border hover:border-green-500/30 transition-all" data-testid={`button-feedback-better-${ex.id}`}>
                    <ThumbsUp className="w-4 h-4" /><span className="text-[10px] font-bold">BETTER</span>
                  </button>
                  <button onClick={() => feedbackMutation.mutate({ executionId: ex.id, result: "same" })} className="flex-1 py-2 flex flex-col items-center gap-1 hover:bg-secondary text-muted-foreground rounded border border-border hover:border-foreground/20 transition-all" data-testid={`button-feedback-same-${ex.id}`}>
                    <Minus className="w-4 h-4" /><span className="text-[10px] font-bold">SAME</span>
                  </button>
                  <button onClick={() => feedbackMutation.mutate({ executionId: ex.id, result: "worse" })} className="flex-1 py-2 flex flex-col items-center gap-1 hover:bg-destructive/10 text-destructive/70 hover:text-red-400 rounded border border-border hover:border-destructive/30 transition-all" data-testid={`button-feedback-worse-${ex.id}`}>
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
