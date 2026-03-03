import { useState } from "react";
import { usePersistedStore } from "@/lib/store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Search, Eye, CheckCircle2,
  Star, RotateCcw, RefreshCw, Wrench, Archive,
  Copy, FileText, Youtube, Instagram, Music2, ArrowUpDown, Layout, X, Share2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

type SortKey = "score" | "views" | "date" | "class";
type PlatformFilter = "all" | "youtube" | "tiktok" | "instagram";

const CLASS_CONFIG: Record<string, { color: string; bg: string; border: string; icon: any; short: string; label: string }> = {
  "Evergreen": { color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20", icon: Star, short: "Evergreen", label: "Evergreen" },
  "Retry-Hook": { color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20", icon: RefreshCw, short: "Retry-Hook", label: "Retry-Hook" },
  "Retry-Timing": { color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20", icon: RotateCcw, short: "Retry-Timing", label: "Retry-Timing" },
  "Seasonal": { color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20", icon: Music2, short: "Seasonal", label: "Seasonal" },
  "Event-Based": { color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20", icon: Wrench, short: "Event", label: "Event-Based" },
  "Archive": { color: "text-neutral-400", bg: "bg-neutral-500/10", border: "border-neutral-500/20", icon: Archive, short: "Archive", label: "Archive" },
};

const CONFIDENCE_STYLES: Record<string, string> = {
  High: "text-green-400",
  Medium: "text-yellow-400",
  Low: "text-neutral-400",
};

const PLATFORM_ICONS: Record<string, any> = {
  youtube: Youtube,
  tiktok: Music2,
  instagram: Instagram,
};

function PlanDrawer({ video, onClose, onSaveNote }: { video: any; onClose: () => void; onSaveNote: (id: string, note: string) => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [note, setNote] = useState(video.notes || "");
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [newTag, setNewTag] = useState("");
  
  const plan = video.plan;
  const classLabel = video.classLabel || "Unknown";
  const style = CLASS_CONFIG[classLabel] || CLASS_CONFIG["Archive"];
  const ClassIcon = style.icon;
  const reasons = Array.isArray(video.reasons) ? video.reasons : [];
  const breakdown = video.scoreBreakdown;

  const tagMutation = useMutation({
    mutationFn: async (tags: string[]) => {
      return apiRequest("POST", "/api/video/tags", { videoId: video.id, tags });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
    },
  });

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTag.trim()) {
      const currentTags = video.userTags || [];
      if (!currentTags.includes(newTag.trim())) {
        tagMutation.mutate([...currentTags, newTag.trim()]);
      }
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const currentTags = video.userTags || [];
    tagMutation.mutate(currentTags.filter((t: string) => t !== tagToRemove));
  };

  const handleCopy = () => {
    const parts: string[] = [];
    if (plan?.hookVariants?.length) parts.push(`Hooks:\n${plan.hookVariants.map((h: string) => `- ${h}`).join("\n")}`);
    if (plan?.captionStarter) parts.push(`Caption: ${plan.captionStarter}`);
    if (plan?.ctaVariants?.length) parts.push(`CTAs:\n${plan.ctaVariants.map((c: string) => `- ${c}`).join("\n")}`);
    if (plan?.hashtagPack?.length) parts.push(`Hashtags: ${plan.hashtagPack.join(" ")}`);
    navigator.clipboard.writeText(parts.join("\n\n"));
    toast({ title: "Copied Package", description: "All assets copied to clipboard" });
  };

  const saveNote = () => {
    onSaveNote(video.id, note);
    setIsEditingNote(false);
  };

  const getTranscriptStatusInfo = (status: string | null) => {
    if (status === 'ready') return { label: 'Connected', color: 'text-green-400' };
    if (status === 'missing') return { label: 'Missing', color: 'text-red-400' };
    return { label: 'Not Enabled', color: 'text-neutral-400' };
  };
  const transcriptInfo = getTranscriptStatusInfo(video.transcriptStatus);

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
                {video.viewsRatio != null && <span>{video.viewsRatio.toFixed(1)}x avg</span>}
                {video.freshnessDays && <span>{video.freshnessDays}d old</span>}
              </div>
            </div>
          </div>

          {video.nextAction && (
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-4" data-testid="card-next-action">
              <h4 className="text-[10px] uppercase text-primary font-bold mb-1">Recommended Next Action</h4>
              <p className="text-sm font-medium">{video.nextAction}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {video.opportunityScore != null && (
              <div className="bg-secondary/20 px-4 py-3 rounded-lg border border-border/20">
                <div className="text-2xl font-bold text-yellow-400">{Math.round(video.opportunityScore)}</div>
                <div className="text-[10px] uppercase text-muted-foreground font-mono">Opportunity</div>
              </div>
            )}
            {video.hookScore != null && (
              <div className="bg-secondary/20 px-4 py-3 rounded-lg border border-border/20">
                <div className="text-2xl font-bold text-blue-400">{Math.round(video.hookScore)}</div>
                <div className="text-[10px] uppercase text-muted-foreground font-mono">Hook Score</div>
              </div>
            )}
          </div>

          {reasons.length > 0 && (
            <div>
              <h4 className="text-[10px] uppercase text-muted-foreground font-mono mb-2">Diagnosis</h4>
              <ul className="space-y-1.5">
                {reasons.map((r: string, i: number) => (
                  <li key={i} className="text-sm text-foreground leading-relaxed flex gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" /> {r}
                  </li>
                ))}
              </ul>
            </div>
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
              </div>
            </div>
          )}

          <div>
            <h4 className="text-[10px] uppercase text-muted-foreground font-mono mb-2">User Tags</h4>
            <div className="flex flex-wrap gap-2 mb-2">
              {(video.userTags || []).map((tag: string) => (
                <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-secondary rounded text-xs" data-testid={`tag-${tag}`}>
                  {tag}
                  <button onClick={() => handleRemoveTag(tag)} className="hover:text-destructive" data-testid={`button-remove-tag-${tag}`}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <input
              type="text"
              placeholder="Add tag and press Enter..."
              value={newTag}
              onChange={e => setNewTag(e.target.value)}
              onKeyDown={handleAddTag}
              className="w-full bg-background border border-border rounded px-2 py-1 text-xs focus:outline-none focus:border-primary"
              data-testid="input-add-tag"
            />
          </div>

          <div>
            <h4 className="text-[10px] uppercase text-muted-foreground font-mono mb-2 flex justify-between items-center">
              Notes
              {!isEditingNote && (
                <button onClick={() => setIsEditingNote(true)} className="text-primary hover:underline" data-testid="button-edit-note">Edit</button>
              )}
            </h4>
            {isEditingNote ? (
              <div className="space-y-2">
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="w-full h-24 bg-background border border-border rounded p-2 text-sm focus:outline-none focus:border-primary"
                  placeholder="Add custom context for the engine..."
                  data-testid="textarea-note"
                />
                <div className="flex gap-2">
                  <button onClick={saveNote} className="px-3 py-1 bg-primary text-primary-foreground rounded text-xs" data-testid="button-save-note">Save</button>
                  <button onClick={() => { setNote(video.notes || ""); setIsEditingNote(false); }} className="px-3 py-1 bg-secondary rounded text-xs" data-testid="button-cancel-note">Cancel</button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic bg-secondary/10 px-3 py-2 rounded" data-testid="text-video-note">
                {video.notes || "No notes added yet."}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/20 px-3 py-2 rounded border border-border/20">
            <FileText className="w-3.5 h-3.5" />
            Transcript Status: <span className={`font-medium capitalize ${transcriptInfo.color}`} data-testid="status-transcript">{transcriptInfo.label}</span>
          </div>

          {plan && (
            <div className="space-y-6 pt-4 border-t border-border/50">
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
                  <h4 className="text-[10px] uppercase text-muted-foreground font-mono mb-1">Call-to-Action</h4>
                  <ul className="space-y-0.5">
                    {plan.ctaVariants.map((c: string, i: number) => (
                      <li key={i} className="text-sm text-muted-foreground">- {c}</li>
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
                        <Share2 className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" /> {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={handleCopy}
                className="w-full py-2.5 bg-primary text-primary-foreground text-sm font-medium rounded flex items-center justify-center gap-2 transition-colors"
                data-testid="button-copy-package"
              >
                <Copy className="w-3.5 h-3.5" /> Copy Package
              </button>
            </div>
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
  const [classFilter, setClassFilter] = useState<string>("all");
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");
  const [sortBy, setSortBy] = useState<SortKey>("score");
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
      toast({ title: "Note saved" });
    },
  });

  const saveNote = (id: string, note: string) => {
    noteMutation.mutate({ videoId: id, note });
  };

  const classCounts = videos.reduce((acc: Record<string, number>, v: any) => {
    if (v.classLabel) acc[v.classLabel] = (acc[v.classLabel] || 0) + 1;
    return acc;
  }, {});

  let filtered = videos.filter((v: any) =>
    (v.title.toLowerCase().includes(search.toLowerCase()) ||
    (v.notes && v.notes.toLowerCase().includes(search.toLowerCase()))) &&
    (classFilter === "all" || v.classLabel === classFilter) &&
    (platformFilter === "all" || v.platform === platformFilter)
  );

  filtered.sort((a: any, b: any) => {
    if (sortBy === "score") return (b.opportunityScore || 0) - (a.opportunityScore || 0);
    if (sortBy === "views") return (b.viewCount || 0) - (a.viewCount || 0);
    if (sortBy === "date") return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    if (sortBy === "class") return (a.classLabel || "").localeCompare(b.classLabel || "");
    return 0;
  });

  const planVideo = planVideoId ? videos.find((v: any) => v.id === planVideoId) : null;

  if (!youtubeChannelId || (videos.length === 0 && !isLoading)) {
    return (
      <div className="max-w-5xl mx-auto p-4 md:p-8 pt-8 md:pt-10">
        <h1 className="text-3xl font-bold tracking-tight mb-2" data-testid="text-page-title">Library</h1>
        <div className="bg-card border border-border/50 rounded-xl p-12 text-center text-muted-foreground mt-8">
          No content synced yet.{" "}
          <Link href="/connect" className="text-primary hover:underline">Connect your channel</Link> first.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 pt-8 md:pt-10 pb-20 animate-in slide-in-from-bottom-4 fade-in duration-500">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-1" data-testid="text-page-title">Library</h1>
          <p className="text-muted-foreground text-sm">Full inventory and analysis brain.</p>
        </div>
        <div className="relative w-full md:w-80">
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

      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-6 border-b border-border pb-4">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setClassFilter("all")}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${classFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "bg-secondary/50 text-muted-foreground border-border hover:bg-secondary"}`}
              data-testid="filter-class-all"
            >
              All {videos.length > 0 && `(${videos.length})`}
            </button>
            {Object.entries(CLASS_CONFIG).map(([label, cfg]) => (
              <button
                key={label}
                onClick={() => setClassFilter(label)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 ${classFilter === label ? `${cfg.bg} ${cfg.color} ${cfg.border}` : "bg-secondary/50 text-muted-foreground border-border hover:bg-secondary"}`}
                data-testid={`filter-class-${cfg.short.toLowerCase()}`}
              >
                <cfg.icon className="w-3 h-3" />
                {cfg.short} {classCounts[label] > 0 && `(${classCounts[label]})`}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-border hidden md:block" />

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Layout className="w-4 h-4 text-muted-foreground" />
              <select
                value={platformFilter}
                onChange={e => setPlatformFilter(e.target.value as PlatformFilter)}
                className="bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer"
                data-testid="select-platform"
              >
                <option value="all">All Platforms</option>
                <option value="youtube">YouTube</option>
                <option value="tiktok">TikTok</option>
                <option value="instagram">Instagram</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortKey)}
                className="bg-transparent border-none text-sm font-medium focus:ring-0 cursor-pointer"
                data-testid="select-sort"
              >
                <option value="score">Sort by Score</option>
                <option value="views">Sort by Views</option>
                <option value="date">Sort by Date</option>
                <option value="class">Sort by Class</option>
              </select>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="bg-card border border-border/30 rounded-xl h-16 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="bg-card border border-border/40 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/20">
                    <th className="text-left p-4 font-medium text-muted-foreground">Video</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Platform</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">Class</th>
                    <th className="text-right p-4 font-medium text-muted-foreground">Score</th>
                    <th className="text-right p-4 font-medium text-muted-foreground">Hook</th>
                    <th className="text-right p-4 font-medium text-muted-foreground">Thumb</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filtered.map((video: any) => {
                    const cfg = video.classLabel ? (CLASS_CONFIG[video.classLabel] || CLASS_CONFIG["Archive"]) : null;
                    const PlatformIcon = PLATFORM_ICONS[video.platform] || Youtube;

                    return (
                      <tr
                        key={video.id}
                        onClick={() => setPlanVideoId(video.id)}
                        className="hover:bg-secondary/30 transition-colors cursor-pointer group"
                        data-testid={`row-video-${video.id}`}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="relative w-16 h-9 rounded overflow-hidden bg-secondary shrink-0">
                              {video.thumbnailUrl ? (
                                <img src={video.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[8px] text-muted-foreground uppercase">No Img</div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold line-clamp-1 group-hover:text-primary transition-colors" title={video.title}>{video.title}</div>
                              <div className="text-xs text-muted-foreground flex items-center gap-2">
                                <Eye className="w-3 h-3" /> {video.viewCount.toLocaleString()}
                                <span>•</span>
                                {new Date(video.publishedAt).toLocaleDateString()}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <PlatformIcon className="w-4 h-4 text-muted-foreground" />
                        </td>
                        <td className="p-4">
                          {cfg && (
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                              <cfg.icon className="w-3 h-3" /> {cfg.short}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <div className="font-bold text-yellow-400">{Math.round(video.opportunityScore || 0)}</div>
                          <div className={`text-[10px] uppercase font-bold ${CONFIDENCE_STYLES[video.confidence] || "text-muted-foreground"}`}>{video.confidence || "Low"}</div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="font-mono">{Math.round(video.hookScore || 0)}</div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="font-mono">{Math.round(video.thumbnailScore || 0)}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && (
              <div className="p-12 text-center text-muted-foreground">
                No videos found matching your filters.
              </div>
            )}
          </div>
        )}
      </div>

      {planVideo && (
        <PlanDrawer
          video={planVideo}
          onClose={() => setPlanVideoId(null)}
          onSaveNote={saveNote}
        />
      )}
    </div>
  );
}
