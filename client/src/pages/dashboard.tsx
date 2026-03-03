import { usePersistedStore } from "@/lib/store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import {
  AlertTriangle, Zap, Activity, ThumbsUp, ThumbsDown,
  Copy, Info, ChevronDown, ChevronUp, TrendingUp, Calendar,
  Clock, Star, RotateCcw, Wrench, Archive, RefreshCw,
  Eye, Sparkles, CheckCircle2, ChevronRight, X, Minus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { addDays, format, startOfWeek, isSameDay, formatDistanceToNow } from "date-fns";

const CLASS_STYLES: Record<string, { color: string; bg: string; border: string; icon: any }> = {
  "Evergreen Winner": { color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20", icon: Star },
  "Repost Candidate": { color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", icon: RotateCcw },
  "Retry (Second Shot)": { color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20", icon: RefreshCw },
  "Restructure": { color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20", icon: Wrench },
  "Archive": { color: "text-neutral-400", bg: "bg-neutral-500/10", border: "border-neutral-500/20", icon: Archive },
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

function PlanDetails({ plan, onExecute, videoId, hideExecute = false }: { plan: any; onExecute: (classLabel: string, videoId: string) => void; videoId: string; hideExecute?: boolean }) {
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

  const primaryAction = plan.classLabel === "Evergreen Winner" ? "Repost & Repurpose"
    : plan.classLabel === "Repost Candidate" ? "Repost This"
    : plan.classLabel === "Retry (Second Shot)" ? "Retry With Changes"
    : plan.classLabel === "Restructure" ? "Restructure This"
    : "Archived";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        </div>

        <div className="space-y-4">
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
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border/30">
        <Button
          onClick={handleCopyAll}
          variant="secondary"
          className="flex-1"
          data-testid="button-copy-plan"
        >
          <Copy className="w-4 h-4 mr-2" /> Copy All Assets
        </Button>
        {!hideExecute && plan.classLabel !== "Archive" && (
          <Button
            onClick={() => onExecute(plan.classLabel, videoId)}
            className="flex-1"
            data-testid={`button-execute-${videoId}`}
          >
            <CheckCircle2 className="w-4 h-4 mr-2" /> Mark Done: {primaryAction}
          </Button>
        )}
      </div>
    </div>
  );
}

function TopOpportunityCard({ opp, video, onExecute, onOpenPlan }: {
  opp: any;
  video: any;
  onExecute: (classLabel: string, videoId: string) => void;
  onOpenPlan: (opp: any) => void;
}) {
  const style = CLASS_STYLES[opp.classLabel] || CLASS_STYLES["Archive"];
  const ClassIcon = style.icon;
  const oneLiner = opp.reasons?.[0] || "High-potential opportunity for growth.";

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const plan = opp.plan;
    const parts: string[] = [];
    if (plan.hookVariants?.length) parts.push(`Hooks:\n${plan.hookVariants.map((h: string) => `- ${h}`).join("\n")}`);
    if (plan.captionStarter) parts.push(`Caption: ${plan.captionStarter}`);
    if (plan.ctaVariants?.length) parts.push(`CTAs:\n${plan.ctaVariants.map((c: string) => `- ${c}`).join("\n")}`);
    navigator.clipboard.writeText(parts.join("\n\n"));
  };

  return (
    <Card className="overflow-hidden border-border/40 hover:border-primary/40 transition-all group" data-testid={`card-top-opp-${opp.videoId}`}>
      <CardContent className="p-0">
        <div className="relative aspect-video overflow-hidden bg-secondary">
          {video?.thumbnailUrl ? (
            <img src={video.thumbnailUrl} alt={opp.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">No Thumbnail</div>
          )}
          <div className="absolute top-2 left-2 flex gap-1.5">
            <Badge className={cn("uppercase text-[10px] font-bold border", style.bg, style.color, style.border)}>
              <ClassIcon className="w-3 h-3 mr-1" /> {opp.classLabel}
            </Badge>
          </div>
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="bg-black/60 backdrop-blur-md text-yellow-400 border-none font-bold">
              {opp.opportunityScore}
            </Badge>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <h3 className="font-bold text-sm line-clamp-1 mb-1" title={opp.title}>{opp.title}</h3>
            <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2.5rem]">{oneLiner}</p>
          </div>
          <div className="flex flex-col gap-2">
            <Button size="sm" className="w-full text-xs font-bold" onClick={() => onOpenPlan(opp)} data-testid={`button-open-plan-${opp.videoId}`}>
              Open Plan
            </Button>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" className="flex-1 text-[10px] px-0" onClick={handleCopy} data-testid={`button-copy-package-${opp.videoId}`}>
                <Copy className="w-3 h-3 mr-1" /> Copy Package
              </Button>
              <Button size="sm" variant="secondary" className="flex-1 text-[10px] px-0" onClick={() => onExecute(opp.classLabel, opp.videoId)} data-testid={`button-mark-done-${opp.videoId}`}>
                <CheckCircle2 className="w-3 h-3 mr-1" /> Mark Done
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CalendarDay({ day, plan, onClick }: { day: Date; plan: any; onClick: () => void }) {
  const isToday = isSameDay(day, new Date());
  const dayName = format(day, "EEE");
  const dayNum = format(day, "d");

  return (
    <div
      className={cn(
        "flex flex-col gap-2 p-3 rounded-xl border border-border/40 min-h-[120px] transition-all cursor-pointer hover:bg-secondary/20",
        isToday ? "bg-primary/5 border-primary/30 ring-1 ring-primary/20" : "bg-card/50"
      )}
      onClick={onClick}
      data-testid={`calendar-day-${format(day, "yyyy-MM-dd")}`}
    >
      <div className="flex justify-between items-center">
        <span className={cn("text-[10px] uppercase font-bold tracking-wider", isToday ? "text-primary" : "text-muted-foreground")}>
          {dayName}
        </span>
        <span className={cn("text-sm font-bold", isToday && "text-primary")}>{dayNum}</span>
      </div>
      {plan ? (
        <div className="mt-1 space-y-1.5">
          <Badge variant="outline" className="text-[9px] h-4 px-1 border-primary/30 text-primary uppercase leading-none">
            {plan.label}
          </Badge>
          <p className="text-[11px] leading-tight font-medium text-foreground line-clamp-3">{plan.title}</p>
        </div>
      ) : (
        <div className="mt-auto">
          <span className="text-[10px] text-muted-foreground italic">Rest Day</span>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { youtubeChannelId } = usePersistedStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAll, setShowAll] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);

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
      setSelectedPlan(null);
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

  const calendarPlans = useMemo(() => {
    if (!analysis?.opportunities || !analysis?.next7DaysPlan) return [];
    
    const weekStart = startOfWeek(new Date());
    return Array.from({ length: 7 }).map((_, i) => {
      const day = addDays(weekStart, i);
      const slot = analysis.next7DaysPlan[i];
      if (!slot) return { day, plan: null };

      // Map opportunities to slots (heuristic: top opps first)
      const actionableOpps = analysis.opportunities.filter((o: any) => 
        o.classLabel !== "Archive" && o.confidence !== "Low"
      );
      const opp = actionableOpps[i % actionableOpps.length];

      return {
        day,
        plan: opp ? { ...slot, title: opp.title, opp } : null
      };
    });
  }, [analysis]);

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
          <Button size="lg" className="font-bold gap-2" data-testid="button-connect">
            <Zap className="w-5 h-5" /> Connect YouTube
          </Button>
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-4 md:p-8 pt-8 pb-20 animate-pulse">
        <div className="h-10 bg-secondary/30 rounded w-1/3 mb-4" />
        <div className="h-6 bg-secondary/20 rounded w-2/3 mb-10" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[1, 2, 3].map(i => <div key={i} className="aspect-[4/5] bg-card border rounded-xl" />)}
        </div>
        <div className="h-8 bg-secondary/20 rounded w-1/4 mb-6" />
        <div className="grid grid-cols-7 gap-4">
          {[1, 2, 3, 4, 5, 6, 7].map(i => <div key={i} className="h-32 bg-card border rounded-xl" />)}
        </div>
      </div>
    );
  }

  const opportunities = analysis?.opportunities || [];
  const top3 = opportunities
    .filter((o: any) => o.classLabel !== "Archive" && o.confidence !== "Low")
    .slice(0, 3);
  
  const seasonalInsights = analysis?.seasonalInsights || [];
  const momentum = analysis?.momentum || { score: 0, trend: "flat", label: "Need Data", details: "" };
  const overallScore = analysis?.overallOpportunityScore || 0;

  const handleExecute = (classLabel: string, videoId: string) => {
    executeMutation.mutate({ type: classLabel.toLowerCase().replace(/\s+/g, "_"), videoId });
  };

  const recentExecs = executions.slice(0, 3);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 pt-8 md:pt-10 pb-20 animate-in slide-in-from-bottom-4 fade-in duration-500 space-y-10">
      <header className="flex flex-col md:flex-row justify-between md:items-end gap-6 border-b border-border/40 pb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2" data-testid="text-dashboard-title">
            Today + This Week
          </h1>
          <p className="text-muted-foreground">
            Your execution plan for growth, refreshed daily.
          </p>
        </div>
        <div className="flex items-center gap-8">
          <div className="flex flex-col items-end text-right">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono mb-1">Momentum</span>
            <div className="flex items-center gap-1.5">
              <span className="text-2xl font-bold text-foreground">{momentum.score}</span>
              <div className={cn(
                "px-1.5 py-0.5 rounded flex items-center text-[10px] font-bold uppercase",
                momentum.trend === "up" ? "bg-green-500/10 text-green-400" :
                momentum.trend === "down" ? "bg-red-500/10 text-red-400" :
                "bg-neutral-500/10 text-neutral-400"
              )}>
                {momentum.trend === "up" ? <TrendingUp className="w-3 h-3 mr-1" /> :
                 momentum.trend === "down" ? <TrendingUp className="w-3 h-3 mr-1 rotate-180" /> :
                 <Minus className="w-3 h-3 mr-1" />}
                {momentum.trend}
              </div>
            </div>
          </div>
          <div className="h-10 w-px bg-border/40" />
          <div className="flex flex-col items-end text-right">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono mb-1">Opp. Score</span>
            <div className="text-2xl font-bold text-yellow-400">{overallScore}</div>
          </div>
        </div>
      </header>

      {seasonalInsights.length > 0 && (
        <Card className="bg-primary/5 border-primary/20 overflow-hidden" data-testid="card-seasonal-insights">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-bold text-primary mb-1">Seasonal Insight Detected</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {seasonalInsights.join(" ")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" /> Today's Top 3
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Show low-confidence</span>
            <input 
              type="checkbox" 
              className="w-4 h-4 accent-primary" 
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(showAll ? opportunities.filter((o: any) => o.classLabel !== "Archive").slice(0, 3) : top3).map((opp: any) => (
            <TopOpportunityCard 
              key={opp.videoId} 
              opp={opp} 
              video={videos.find((v: any) => v.id === opp.videoId)}
              onExecute={handleExecute}
              onOpenPlan={(opp) => setSelectedPlan(opp)}
            />
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Calendar className="w-5 h-5 text-muted-foreground" /> This Week Plan
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {calendarPlans.map(({ day, plan }, i) => (
            <CalendarDay 
              key={i} 
              day={day} 
              plan={plan} 
              onClick={() => plan && setSelectedPlan(plan.opp)}
            />
          ))}
        </div>
      </section>

      {recentExecs.length > 0 && (
        <section className="pt-10 border-t border-border/40">
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-muted-foreground">
            <RotateCcw className="w-4 h-4" /> Feedback Required
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recentExecs.map((exec: any) => (
              <Card key={exec.id} className="bg-secondary/10 border-border/30">
                <CardContent className="p-4 space-y-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-1">
                      {exec.type.replace(/_/g, " ")} • {formatDistanceToNow(new Date(exec.executedAt))} ago
                    </span>
                    <h4 className="text-sm font-medium line-clamp-1">
                      {videos.find((v: any) => v.id === exec.videoId)?.title || "Unknown Video"}
                    </h4>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" className="flex-1 text-[10px]" onClick={() => feedbackMutation.mutate({ executionId: exec.id, result: "better" })}>
                      <ThumbsUp className="w-3 h-3 mr-1 text-green-400" /> Better
                    </Button>
                    <Button variant="secondary" size="sm" className="flex-1 text-[10px]" onClick={() => feedbackMutation.mutate({ executionId: exec.id, result: "same" })}>
                      <Minus className="w-3 h-3 mr-1 text-neutral-400" /> Same
                    </Button>
                    <Button variant="secondary" size="sm" className="flex-1 text-[10px]" onClick={() => feedbackMutation.mutate({ executionId: exec.id, result: "worse" })}>
                      <ThumbsDown className="w-3 h-3 mr-1 text-red-400" /> Worse
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <Dialog open={!!selectedPlan} onOpenChange={(open) => !open && setSelectedPlan(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <Badge className={cn("uppercase text-[10px] font-bold border", selectedPlan && CLASS_STYLES[selectedPlan.classLabel]?.bg, selectedPlan && CLASS_STYLES[selectedPlan.classLabel]?.color, selectedPlan && CLASS_STYLES[selectedPlan.classLabel]?.border)}>
                {selectedPlan?.classLabel}
              </Badge>
              <Badge variant="secondary" className="text-[10px] font-bold">
                Opp Score: {selectedPlan?.opportunityScore}
              </Badge>
            </div>
            <DialogTitle className="text-xl md:text-2xl leading-tight">
              {selectedPlan?.title}
            </DialogTitle>
            <DialogDescription className="text-sm pt-2">
              Complete execution plan for this opportunity.
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 mt-4 pr-4">
            <div className="space-y-8 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                   <h4 className="text-[10px] uppercase text-muted-foreground font-mono mb-3 flex items-center gap-1.5">
                    <Zap className="w-3 h-3 text-primary" /> Strategy & Packaging
                  </h4>
                  {selectedPlan && (
                    <PlanDetails 
                      plan={selectedPlan.plan} 
                      videoId={selectedPlan.videoId} 
                      onExecute={handleExecute}
                    />
                  )}
                </div>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-[10px] uppercase text-muted-foreground font-mono mb-3 flex items-center gap-1.5">
                      <Info className="w-3 h-3" /> Score Breakdown
                    </h4>
                    {selectedPlan && <ScoreBreakdownPanel breakdown={selectedPlan.scoreBreakdown} />}
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
