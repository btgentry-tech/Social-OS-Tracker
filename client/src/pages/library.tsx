import { useState } from "react";
import { usePersistedStore } from "@/lib/store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Search, Eye, MessageSquare, Edit3, CheckCircle2, SlidersHorizontal,
  Sparkles, Image, X, Star, RotateCcw, RefreshCw, Wrench, Archive,
  Clock, Copy, ChevronRight, Zap, FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

type FilterKey = "all" | "top" | "underperform" | "recent" | "old";
type ThemeFilter = "all" | string;

const CLASS_CONFIG: Record<string, { color: string; bg: string; border: string; icon: any; short: string }> = {
  "Evergreen Winner": { color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20", icon: Star, short: "Evergreen" },
  "Repost Candidate": { color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", icon: RotateCcw, short: "Repost" },
  "Retry (Second Shot)": { color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20", icon: RefreshCw, short: "Retry" },
  "Restructure": { color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20", icon: Wrench, short: "Restructure" },
  "Archive": { color: "text-neutral-400", bg: "bg-neutral-500/10", border: "border-neutral-500/20", icon: Archive, short: "Archive" },
};

const CONFIDENCE_STYLES: Record<string, string> = {
  High: "text-green-400",
  Medium: "text-yellow-400",
  Low: "text-neutral-400",
};

function PlanDrawer({ video, onClose }: { video: any; onClose: () => void }) {
  const { toast } = useToast();
  const plan = video.plan;
  const classLabel = video.classLabel || "Unknown";
  const style = CLASS_CONFIG[classLabel] || CLASS_CONFIG["Archive"];
  const ClassIcon = style.icon;
  const reasons = Array.isArray(video.reasons) ? video.reasons : [];
  const breakdown = video.scoreBreakdown;

  const handleCopy = () => {
    const parts: string[] = [];
    if (plan?.hookVariants?.length) parts.push(`Hooks:\n${plan.hookVariants.map((h: string) => `- ${h}`).join("\n")}`);
    if (plan?.captionStarter) parts.push(`Caption: ${plan.captionStarter}`);
    if (plan?.ctaVariants?.length) parts.push(`CTAs:\n${plan.ctaVariants.map((c: string) => `- ${c}`).join("\n")}`);
    if (plan?.hashtagPack?.length) parts.push(`Hashtags: ${plan.hashtagPack.join(" ")}`);
    navigator.clipboard.writeText(parts.join("\n\n"));
    toast({ title: "Copied to clipboard" });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" data-testid="drawer-plan">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card border-l border-border overflow-y-auto animate-in slide-in-from-right duration-200">
        <div className="sticky top-0 bg-card/95 backdrop-blur border-b border-border/50 p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase font-bold ${style.bg} ${style.color} border ${style.border}`}>
              <ClassIcon className="w-3 h-3" /> {classLabel}
            </span>
            {video.confidence && (
              <span className={`text-[10px] uppercase font-bold ${CONFIDENCE_STYLES[video.confidence] || ""}`}>
                {video.confidence}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1 hover:bg-secondary rounded transition-colors" data-testid="button-close-drawer">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          <div className="flex gap-3 items-start">
            {video.thumbnailUrl && (
              <img src={video.thumbnailUrl} alt={video.title} className="w-32 h-20 object-cover rounded bg-secondary shrink-0" />
            )}
            <div>
              <h3 className="font-bold text-base leading-tight mb-2">{video.title}</h3>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {video.viewCount?.toLocaleString()}</span>
                {video.viewsRatio != null && <span>{video.viewsRatio}x avg</span>}
                {video.freshnessDays && <span>{video.freshnessDays}d old</span>}
              </div>
            </div>
          </div>

          {video.opportunityScore != null && (
            <div className="flex items-center gap-3 bg-secondary/20 px-4 py-3 rounded-lg border border-border/20">
              <div className="text-2xl font-bold text-yellow-400">{Math.round(video.opportunityScore)}</div>
              <div>
                <div className="text-xs text-muted-foreground">Opportunity Score</div>
                <div className="w-32 h-1.5 bg-secondary/40 rounded-full overflow-hidden mt-1">
                  <div className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-amber-400" style={{ width: `${Math.min(100, video.opportunityScore)}%` }} />
                </div>
              </div>
            </div>
          )}

          {reasons.length > 0 && (
            <div>
              <h4 className="text-[10px] uppercase text-muted-foreground font-mono mb-2">Why</h4>
              <ul className="space-y-1.5">
                {reasons.map((r: string, i: number) => (
                  <li key={i} className="text-sm text-foreground leading-relaxed flex gap-2">
                    <span className="text-primary shrink-0 mt-0.5">-</span> {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {video.transcriptStatus && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/20 px-3 py-2 rounded border border-border/20">
              <FileText className="w-3.5 h-3.5" />
              Transcript: <span className="font-medium capitalize">{video.transcriptStatus}</span>
            </div>
          )}

          {plan && (
            <>
              {plan.hookVariants?.length > 0 && (
                <div>
                  <h4 className="text-[10px] uppercase text-muted-foreground font-mono mb-2">Hook Variants</h4>
                  <ul className="space-y-1.5">
                    {plan.hookVariants.map((h: string, i: number) => (
                      <li key={i} className="text-sm bg-secondary/20 px-3 py-2 rounded border border-border/20">{h}</li>
                    ))}
                  </ul>
                </div>
              )}

              {plan.captionStarter && (
                <div>
                  <h4 className="text-[10px] uppercase text-muted-foreground font-mono mb-1">Caption Starter</h4>
                  <p className="text-sm text-muted-foreground">{plan.captionStarter}</p>
                </div>
              )}

              {plan.ctaVariants?.length > 0 && (
                <div>
                  <h4 className="text-[10px] uppercase text-muted-foreground font-mono mb-1">Call-to-Action Options</h4>
                  <ul className="space-y-0.5">
                    {plan.ctaVariants.map((c: string, i: number) => (
                      <li key={i} className="text-sm text-muted-foreground">- {c}</li>
                    ))}
                  </ul>
                </div>
              )}

              {plan.hashtagPack?.length > 0 && (
                <div>
                  <h4 className="text-[10px] uppercase text-muted-foreground font-mono mb-1">Hashtags</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {plan.hashtagPack.map((h: string, i: number) => (
                      <span key={i} className="text-xs bg-secondary/40 text-muted-foreground px-2 py-0.5 rounded">{h}</span>
                    ))}
                  </div>
                </div>
              )}

              {plan.specificChanges?.length > 0 && (
                <div>
                  <h4 className="text-[10px] uppercase text-muted-foreground font-mono mb-2">Recommended Changes</h4>
                  <ul className="space-y-1.5">
                    {plan.specificChanges.map((c: string, i: number) => (
                      <li key={i} className="text-sm flex gap-2">
                        <Wrench className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" /> {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {plan.repurposePlan?.length > 0 && (
                <div>
                  <h4 className="text-[10px] uppercase text-muted-foreground font-mono mb-2">Repurpose Plan</h4>
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
                  <h4 className="text-[10px] uppercase text-muted-foreground font-mono mb-2">Sequel Ideas</h4>
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
                  <Clock className="w-3.5 h-3.5 inline mr-1.5 text-green-400" /> {plan.repostCadence}
                </div>
              )}

              {plan.newFraming && (
                <div className="text-sm bg-orange-500/5 px-3 py-2 rounded border border-orange-500/10">
                  <Wrench className="w-3.5 h-3.5 inline mr-1.5 text-orange-400" /> {plan.newFraming}
                </div>
              )}

              {plan.archiveReason && (
                <div className="text-sm text-muted-foreground bg-neutral-500/5 px-3 py-2 rounded border border-neutral-500/10">
                  <Archive className="w-3.5 h-3.5 inline mr-1.5 text-neutral-400" /> {plan.archiveReason}
                </div>
              )}

              {plan.extractedPattern && (
                <div className="text-sm text-muted-foreground italic bg-secondary/10 px-3 py-2 rounded">
                  {plan.extractedPattern}
                </div>
              )}

              {plan.scheduleSlots?.length > 0 && (
                <div>
                  <h4 className="text-[10px] uppercase text-muted-foreground font-mono mb-2">Posting Slots</h4>
                  <div className="space-y-1">
                    {plan.scheduleSlots.slice(0, 3).map((s: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-xs bg-secondary/20 px-3 py-2 rounded">
                        <span className="font-medium">{s.day.split(",")[0]}</span>
                        <span className="text-muted-foreground">{s.time}</span>
                        <span className={s.label === "Prime slot" ? "text-green-400" : "text-muted-foreground"}>{s.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {breakdown && (
            <div>
              <h4 className="text-[10px] uppercase text-muted-foreground font-mono mb-2">Score Breakdown</h4>
              <div className="space-y-2 text-xs">
                {[
                  { label: "Views Performance", val: breakdown.viewsRatioScore, max: 30 },
                  { label: "Timing", val: breakdown.decayScore, max: 20 },
                  { label: "Thumbnail", val: breakdown.thumbnailQualityScore, max: 15 },
                  { label: "Hook", val: breakdown.hookQualityScore, max: 10 },
                  { label: "Novelty", val: breakdown.noveltyScore, max: 10 },
                ].map(c => (
                  <div key={c.label} className="flex items-center gap-2">
                    <span className="w-28 text-muted-foreground shrink-0">{c.label}</span>
                    <div className="flex-1 h-1 bg-secondary/40 rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-500/60 rounded-full" style={{ width: `${(c.val / c.max) * 100}%` }} />
                    </div>
                    <span className="font-mono w-12 text-right">{c.val?.toFixed(1)}/{c.max}</span>
                  </div>
                ))}
                {breakdown.repetitionPenalty > 0 && (
                  <div className="flex items-center gap-2 text-red-400">
                    <span className="w-28 shrink-0">Repetition</span>
                    <span className="font-mono">-{breakdown.repetitionPenalty.toFixed(1)}</span>
                  </div>
                )}
                {breakdown.timeSensitivePenalty > 0 && (
                  <div className="flex items-center gap-2 text-red-400">
                    <span className="w-28 shrink-0">Time-sensitive</span>
                    <span className="font-mono">-{breakdown.timeSensitivePenalty}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {plan && plan.hookVariants?.length > 0 && (
            <button
              onClick={handleCopy}
              className="w-full py-2.5 bg-secondary/50 hover:bg-secondary text-foreground text-sm font-medium rounded flex items-center justify-center gap-2 transition-colors border border-border/30"
              data-testid="button-copy-all"
            >
              <Copy className="w-3.5 h-3.5" /> Copy All Assets
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Library() {
  const { youtubeChannelId } = usePersistedStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [tempNote, setTempNote] = useState("");
  const [performanceFilter, setPerformanceFilter] = useState<FilterKey>("all");
  const [themeFilter, setThemeFilter] = useState<ThemeFilter>("all");
  const [classFilter, setClassFilter] = useState<string>("all");
  const [planVideoId, setPlanVideoId] = useState<string | null>(null);

  const { data: videos = [], isLoading } = useQuery({
    queryKey: ["/api/content", youtubeChannelId],
    queryFn: async () => {
      if (!youtubeChannelId) return [];
      const res = await fetch(`/api/content?channelId=${youtubeChannelId}`);
      return res.json();
    },
    enabled: !!youtubeChannelId,
  });

  const noteMutation = useMutation({
    mutationFn: async ({ videoId, note }: { videoId: string; note: string }) => {
      return apiRequest("POST", "/api/notes", { videoId, note });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      toast({ title: "Note saved", description: "The engine will consider this context." });
    },
  });

  const saveNote = (id: string) => {
    noteMutation.mutate({ videoId: id, note: tempNote });
    setEditingNoteId(null);
  };

  const startEditing = (video: any) => {
    setEditingNoteId(video.id);
    setTempNote(video.notes || "");
  };

  const avgViews = videos.length > 0 ? videos.reduce((s: number, v: any) => s + v.viewCount, 0) / videos.length : 0;
  const allThemes = [...new Set(videos.map((v: any) => v.theme).filter(Boolean))] as string[];
  const allClasses = [...new Set(videos.map((v: any) => v.classLabel).filter(Boolean))] as string[];

  let filtered = videos.filter((v: any) =>
    v.title.toLowerCase().includes(search.toLowerCase()) ||
    (v.notes && v.notes.toLowerCase().includes(search.toLowerCase()))
  );

  if (themeFilter !== "all") filtered = filtered.filter((v: any) => v.theme === themeFilter);
  if (classFilter !== "all") filtered = filtered.filter((v: any) => v.classLabel === classFilter);

  if (performanceFilter === "top") filtered = filtered.filter((v: any) => v.viewCount > avgViews * 1.2);
  else if (performanceFilter === "underperform") filtered = filtered.filter((v: any) => v.viewCount < avgViews * 0.8);
  else if (performanceFilter === "recent") {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    filtered = filtered.filter((v: any) => new Date(v.publishedAt).getTime() > thirtyDaysAgo);
  } else if (performanceFilter === "old") {
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    filtered = filtered.filter((v: any) => new Date(v.publishedAt).getTime() < ninetyDaysAgo);
  }

  const planVideo = planVideoId ? videos.find((v: any) => v.id === planVideoId) : null;

  if (!youtubeChannelId || (videos.length === 0 && !isLoading)) {
    return (
      <div className="max-w-5xl mx-auto p-4 md:p-8 pt-8 md:pt-10">
        <h1 className="text-3xl font-bold tracking-tight mb-2" data-testid="text-page-title">Content Library</h1>
        <div className="bg-card border border-border/50 rounded-xl p-12 text-center text-muted-foreground mt-8">
          No content synced yet.{" "}
          <Link href="/connect" className="text-primary hover:underline">Connect your YouTube channel</Link> first.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 pt-8 md:pt-10 pb-20 animate-in slide-in-from-bottom-4 fade-in duration-500">
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2" data-testid="text-page-title">Content Library</h1>
          <p className="text-muted-foreground text-sm">{videos.length} videos synced. Click "View Plan" to see the full analysis for any video.</p>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search titles or notes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-md text-sm focus:border-primary focus:outline-none transition-colors"
            data-testid="input-search"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex items-center gap-1 mr-2 text-xs text-muted-foreground">
          <SlidersHorizontal className="w-3 h-3" /> Performance:
        </div>
        {(["all", "top", "underperform", "recent", "old"] as FilterKey[]).map(f => (
          <button
            key={f}
            onClick={() => setPerformanceFilter(f)}
            className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${performanceFilter === f ? "bg-primary text-primary-foreground border-primary" : "bg-secondary/50 text-muted-foreground border-border hover:bg-secondary"}`}
            data-testid={`filter-${f}`}
          >
            {f === "all" ? "All" : f === "top" ? "Top Performers" : f === "underperform" ? "Underperformers" : f === "recent" ? "Last 30 Days" : "90+ Days"}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <div className="flex items-center gap-1 mr-2 text-xs text-muted-foreground">
          Action:
        </div>
        <button
          onClick={() => setClassFilter("all")}
          className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${classFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-secondary/50 text-muted-foreground border-border hover:bg-secondary"}`}
          data-testid="filter-class-all"
        >
          All
        </button>
        {allClasses.map(c => {
          const cfg = CLASS_CONFIG[c] || CLASS_CONFIG["Archive"];
          return (
            <button
              key={c}
              onClick={() => setClassFilter(c)}
              className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${classFilter === c ? `${cfg.bg} ${cfg.color} ${cfg.border}` : "bg-secondary/50 text-muted-foreground border-border hover:bg-secondary"}`}
              data-testid={`filter-class-${c.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {cfg.short}
            </button>
          );
        })}
        {allThemes.length > 0 && (
          <select
            value={themeFilter}
            onChange={e => setThemeFilter(e.target.value)}
            className="px-3 py-1 rounded text-xs font-medium border border-border bg-secondary/50 text-muted-foreground ml-auto"
            data-testid="select-theme"
          >
            <option value="all">All Themes</option>
            {allThemes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2 animate-pulse">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-card border border-border/30 rounded-xl h-20" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((video: any) => {
            const ratio = avgViews > 0 ? video.viewCount / avgViews : 0;
            const freshnessDays = Math.ceil((Date.now() - new Date(video.publishedAt).getTime()) / (1000 * 60 * 60 * 24));
            const classLabel = video.classLabel || null;
            const cfg = classLabel ? (CLASS_CONFIG[classLabel] || CLASS_CONFIG["Archive"]) : null;
            const ClassIcon = cfg?.icon || null;

            return (
              <div key={video.id} className="bg-card border border-border/40 rounded-xl overflow-hidden" data-testid={`card-video-${video.id}`}>
                <div className="flex items-center gap-3 p-3">
                  {video.thumbnailUrl ? (
                    <img src={video.thumbnailUrl} alt={video.title} className="w-20 h-[45px] object-cover rounded bg-secondary shrink-0" />
                  ) : (
                    <div className="w-20 h-[45px] rounded bg-secondary flex items-center justify-center shrink-0">
                      <span className="text-[10px] text-muted-foreground">No img</span>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm line-clamp-1 mb-1" title={video.title}>{video.title}</h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {video.viewCount.toLocaleString()}</span>
                      <span className={`px-1.5 py-0.5 rounded ${ratio > 1.2 ? "bg-green-500/10 text-green-400" : ratio < 0.8 ? "bg-red-500/10 text-red-400" : "bg-secondary text-muted-foreground"}`}>
                        {(ratio * 100).toFixed(0)}% avg
                      </span>
                      <span className="text-muted-foreground">{freshnessDays}d</span>
                      {video.theme && <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded">{video.theme}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {classLabel && cfg && ClassIcon && (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase font-bold ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                        <ClassIcon className="w-3 h-3" /> {cfg.short}
                      </span>
                    )}
                    {video.confidence && (
                      <span className={`text-[10px] uppercase font-bold ${CONFIDENCE_STYLES[video.confidence] || ""}`}>
                        {video.confidence}
                      </span>
                    )}
                    {video.opportunityScore != null && (
                      <div className="text-center min-w-[32px]">
                        <div className="text-sm font-bold text-yellow-400 leading-none">{Math.round(video.opportunityScore)}</div>
                        <div className="text-[8px] text-muted-foreground font-mono">/100</div>
                      </div>
                    )}
                    {video.plan && (
                      <button
                        onClick={() => setPlanVideoId(video.id)}
                        className="px-2.5 py-1.5 text-xs font-medium bg-secondary/50 hover:bg-secondary text-foreground rounded border border-border/50 flex items-center gap-1 transition-colors"
                        data-testid={`button-view-plan-${video.id}`}
                      >
                        View Plan <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="px-3 pb-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    {video.hookScore > 0 && (
                      <span className="bg-orange-500/10 text-orange-400 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5" /> Hook: {Math.round(video.hookScore)}
                      </span>
                    )}
                    {video.thumbnailScore > 0 && (
                      <span className="bg-pink-500/10 text-pink-400 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <Image className="w-2.5 h-2.5" /> Thumb: {Math.round(video.thumbnailScore)}
                      </span>
                    )}
                    {video.transcriptStatus && (
                      <span className="bg-secondary/30 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <FileText className="w-2.5 h-2.5" /> Transcript: {video.transcriptStatus}
                      </span>
                    )}
                    {video.timeSensitive && (
                      <span className="bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded">Time-sensitive</span>
                    )}
                  </div>

                  {editingNoteId === video.id ? (
                    <div className="flex gap-2 mt-1">
                      <input
                        autoFocus
                        type="text"
                        value={tempNote}
                        onChange={e => setTempNote(e.target.value)}
                        placeholder="e.g. Vacation vlog, do not repost..."
                        className="flex-1 bg-background border border-primary/50 rounded px-2 py-1.5 text-sm focus:outline-none"
                        onKeyDown={e => e.key === "Enter" && saveNote(video.id)}
                        data-testid={`input-note-${video.id}`}
                      />
                      <button onClick={() => saveNote(video.id)} className="bg-primary text-primary-foreground px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1" data-testid={`button-save-note-${video.id}`}>
                        <CheckCircle2 className="w-4 h-4" /> Save
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 cursor-pointer group/note mt-1" onClick={() => startEditing(video)}>
                      <MessageSquare className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${video.notes ? "text-primary" : "text-muted-foreground opacity-40"}`} />
                      <p className={`text-xs flex-1 ${video.notes ? "text-foreground" : "text-muted-foreground italic"}`}>
                        {video.notes || "Add context note..."}
                      </p>
                      <Edit3 className="w-3 h-3 text-muted-foreground opacity-0 group-hover/note:opacity-100 transition-opacity" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="p-8 text-center text-muted-foreground border border-dashed border-border rounded-xl">
              No videos found matching your filters.
            </div>
          )}
        </div>
      )}

      {planVideo && (
        <PlanDrawer video={planVideo} onClose={() => setPlanVideoId(null)} />
      )}
    </div>
  );
}
