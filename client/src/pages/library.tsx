import { useState } from "react";
import { usePersistedStore } from "@/lib/store";
import { formatDistanceToNow } from "date-fns";
import { Search, Filter, PlayCircle, BarChart3, Clock, LayoutGrid, Eye, ArrowUpDown, MoreHorizontal } from "lucide-react";

export default function Library() {
  const { videos, queueItem } = usePersistedStore();
  const [search, setSearch] = useState("");
  const [filterTheme, setFilterTheme] = useState("All");

  const themes = ["All", ...new Set(videos.map(v => v.theme).filter(Boolean))];

  const filteredVideos = videos.filter(v => {
    const matchesSearch = v.title.toLowerCase().includes(search.toLowerCase());
    const matchesTheme = filterTheme === "All" || v.theme === filterTheme;
    return matchesSearch && matchesTheme;
  });

  if (videos.length === 0) {
    return (
      <div className="max-w-6xl mx-auto p-8 pt-10">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Content Library</h1>
        <p className="text-muted-foreground mb-8">Persisted synced data from your connected platforms.</p>
        <div className="bg-card border border-border/50 rounded-xl p-12 text-center text-muted-foreground">
          No content synced yet. Please connect a platform first.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-8 pt-10 pb-20 animate-in slide-in-from-bottom-4 fade-in duration-500">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Content Library</h1>
          <p className="text-muted-foreground">Local datastore of {videos.length} synced assets used for deterministic inference.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search titles..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-md text-sm focus:border-primary focus:outline-none transition-colors"
            />
          </div>
          <select 
            value={filterTheme}
            onChange={e => setFilterTheme(e.target.value)}
            className="bg-background border border-border rounded-md px-3 py-2 text-sm focus:border-primary focus:outline-none"
          >
            {themes.map(t => <option key={t as string} value={t as string}>{t}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary/30 text-muted-foreground text-xs uppercase font-mono tracking-wider">
              <tr>
                <th className="px-6 py-4 font-medium">Asset</th>
                <th className="px-6 py-4 font-medium"><div className="flex items-center gap-1.5"><Eye className="w-3 h-3" /> Views</div></th>
                <th className="px-6 py-4 font-medium"><div className="flex items-center gap-1.5"><LayoutGrid className="w-3 h-3" /> Inferred Theme</div></th>
                <th className="px-6 py-4 font-medium"><div className="flex items-center gap-1.5"><PlayCircle className="w-3 h-3" /> Format</div></th>
                <th className="px-6 py-4 font-medium"><div className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> Freshness</div></th>
                <th className="px-6 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredVideos.map((video) => (
                <tr key={video.id} className="hover:bg-secondary/10 transition-colors group">
                  <td className="px-6 py-4 font-medium text-foreground max-w-[300px] truncate" title={video.title}>
                    {video.title}
                  </td>
                  <td className="px-6 py-4 tabular-nums">
                    {video.viewCount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 text-[10px] uppercase font-bold tracking-wider">
                      {video.theme || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {video.format || 'Standard'}
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">
                    {video.freshness}d
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => queueItem({ videoId: video.id, type: 'leverage' })}
                        className="text-xs px-2 py-1 bg-secondary hover:bg-secondary/80 rounded border border-border text-foreground transition-colors"
                      >
                        Queue L
                      </button>
                      <button 
                        onClick={() => queueItem({ videoId: video.id, type: 'experiment' })}
                        className="text-xs px-2 py-1 bg-secondary hover:bg-secondary/80 rounded border border-border text-foreground transition-colors"
                      >
                        Queue E
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredVideos.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              No assets match your filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
