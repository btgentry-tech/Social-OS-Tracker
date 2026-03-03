import { useState } from "react";
import { usePersistedStore } from "@/lib/store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Search, Eye, MessageSquare, Edit3, CheckCircle2, SlidersHorizontal, ThumbsUp, Sparkles, Image } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

type FilterKey = "all" | "top" | "underperform" | "recent" | "old";
type ThemeFilter = "all" | string;

export default function Library() {
  const { youtubeChannelId } = usePersistedStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [tempNote, setTempNote] = useState("");
  const [performanceFilter, setPerformanceFilter] = useState<FilterKey>("all");
  const [themeFilter, setThemeFilter] = useState<ThemeFilter>("all");

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

  let filtered = videos.filter((v: any) =>
    v.title.toLowerCase().includes(search.toLowerCase()) ||
    (v.notes && v.notes.toLowerCase().includes(search.toLowerCase()))
  );

  if (themeFilter !== "all") {
    filtered = filtered.filter((v: any) => v.theme === themeFilter);
  }

  if (performanceFilter === "top") {
    filtered = filtered.filter((v: any) => v.viewCount > avgViews * 1.2);
  } else if (performanceFilter === "underperform") {
    filtered = filtered.filter((v: any) => v.viewCount < avgViews * 0.8);
  } else if (performanceFilter === "recent") {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    filtered = filtered.filter((v: any) => new Date(v.publishedAt).getTime() > thirtyDaysAgo);
  } else if (performanceFilter === "old") {
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    filtered = filtered.filter((v: any) => new Date(v.publishedAt).getTime() < ninetyDaysAgo);
  }

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
    <div className="max-w-5xl mx-auto p-4 md:p-8 pt-8 md:pt-10 pb-20 animate-in slide-in-from-bottom-4 fade-in duration-500">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2" data-testid="text-page-title">Content Library</h1>
          <p className="text-muted-foreground text-sm">{videos.length} videos synced. Add context notes to improve recommendations.</p>
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

      <div className="flex flex-wrap gap-2 mb-6">
        <div className="flex items-center gap-1 mr-2 text-xs text-muted-foreground">
          <SlidersHorizontal className="w-3 h-3" /> Filters:
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
        {allThemes.length > 0 && (
          <select
            value={themeFilter}
            onChange={e => setThemeFilter(e.target.value)}
            className="px-3 py-1 rounded text-xs font-medium border border-border bg-secondary/50 text-muted-foreground"
            data-testid="select-theme"
          >
            <option value="all">All Themes</option>
            {allThemes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-card border border-border/30 rounded-xl h-40" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((video: any) => {
            const ratio = avgViews > 0 ? video.viewCount / avgViews : 0;
            const freshnessDays = Math.ceil((Date.now() - new Date(video.publishedAt).getTime()) / (1000 * 60 * 60 * 24));

            return (
              <div key={video.id} className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm flex flex-col group" data-testid={`card-video-${video.id}`}>
                <div className="flex gap-4 p-4 border-b border-border/30">
                  {video.thumbnailUrl ? (
                    <img src={video.thumbnailUrl} alt={video.title} className="w-28 h-20 object-cover rounded bg-secondary shrink-0" />
                  ) : (
                    <div className="w-28 h-20 rounded bg-secondary flex items-center justify-center shrink-0">
                      <span className="text-xs text-muted-foreground">No image</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm line-clamp-2 mb-1" title={video.title}>{video.title}</h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-2">
                      <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {video.viewCount.toLocaleString()}</span>
                      <span className={`px-1.5 py-0.5 rounded ${ratio > 1.2 ? "bg-green-500/10 text-green-500" : ratio < 0.8 ? "bg-red-500/10 text-red-500" : "bg-secondary text-muted-foreground"}`}>
                        {(ratio * 100).toFixed(0)}% avg
                      </span>
                      <span className="text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded">{freshnessDays}d ago</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {video.theme && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">{video.theme}</span>
                      )}
                      {video.format && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-500 border border-purple-500/20">{video.format}</span>
                      )}
                      {video.hookScore > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-500 border border-orange-500/20 flex items-center gap-0.5">
                          <Sparkles className="w-2.5 h-2.5" /> Hook: {Math.round(video.hookScore)}
                        </span>
                      )}
                      {video.thumbnailScore > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-pink-500/10 text-pink-500 border border-pink-500/20 flex items-center gap-0.5">
                          <Image className="w-2.5 h-2.5" /> Thumb: {Math.round(video.thumbnailScore)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-secondary/10 flex-1 flex flex-col justify-center">
                  {editingNoteId === video.id ? (
                    <div className="flex gap-2">
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
                    <div className="flex items-start gap-2 cursor-pointer group/note" onClick={() => startEditing(video)}>
                      <MessageSquare className={`w-4 h-4 mt-0.5 shrink-0 ${video.notes ? "text-primary" : "text-muted-foreground opacity-50"}`} />
                      <p className={`text-sm flex-1 ${video.notes ? "text-foreground" : "text-muted-foreground italic"}`}>
                        {video.notes || "Add context note (e.g. event-driven, do not repeat)..."}
                      </p>
                      <Edit3 className="w-3 h-3 text-muted-foreground opacity-0 group-hover/note:opacity-100 transition-opacity" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="col-span-1 md:col-span-2 p-8 text-center text-muted-foreground border border-dashed border-border rounded-xl">
              No videos found matching your filters.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
