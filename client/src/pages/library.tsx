import { useState } from "react";
import { usePersistedStore } from "@/lib/store";
import { Search, Eye, MessageSquare, Edit3, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Library() {
  const { videos, updateVideoNote } = usePersistedStore();
  const { toast } = useToast();
  
  const [search, setSearch] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [tempNote, setTempNote] = useState("");

  const filteredVideos = videos.filter(v => 
    v.title.toLowerCase().includes(search.toLowerCase()) || 
    (v.notes && v.notes.toLowerCase().includes(search.toLowerCase()))
  );

  const startEditing = (video: any) => {
    setEditingNoteId(video.id);
    setTempNote(video.notes || "");
  };

  const saveNote = (id: string) => {
    updateVideoNote(id, tempNote);
    setEditingNoteId(null);
    toast({ title: "Note saved", description: "The engine will consider this context." });
  };

  if (videos.length === 0) {
    return (
      <div className="max-w-5xl mx-auto p-8 pt-10">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Content Library</h1>
        <div className="bg-card border border-border/50 rounded-xl p-12 text-center text-muted-foreground mt-8">
          No content synced yet. Please connect your YouTube channel first.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8 pt-8 md:pt-10 pb-20 animate-in slide-in-from-bottom-4 fade-in duration-500">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Content Library</h1>
          <p className="text-muted-foreground text-sm">Your synced videos. Add context notes to help the system give better advice.</p>
        </div>
        
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search titles or notes..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-md text-sm focus:border-primary focus:outline-none transition-colors"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredVideos.map((video) => (
          <div key={video.id} className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm flex flex-col group">
            <div className="flex gap-4 p-4 border-b border-border/30">
              {video.thumbnail ? (
                <img src={video.thumbnail} alt={video.title} className="w-28 h-20 object-cover rounded bg-secondary shrink-0" />
              ) : (
                <div className="w-28 h-20 rounded bg-secondary flex items-center justify-center shrink-0">
                  <span className="text-xs text-muted-foreground">No image</span>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-sm line-clamp-2 mb-1" title={video.title}>{video.title}</h3>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-2">
                  <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {video.viewCount.toLocaleString()}</span>
                  <span className="flex items-center gap-1 text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded">{video.freshness}d ago</span>
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
                    onKeyDown={e => e.key === 'Enter' && saveNote(video.id)}
                  />
                  <button onClick={() => saveNote(video.id)} className="bg-primary text-primary-foreground px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Save
                  </button>
                </div>
              ) : (
                <div 
                  className="flex items-start gap-2 cursor-pointer group/note"
                  onClick={() => startEditing(video)}
                >
                  <MessageSquare className={`w-4 h-4 mt-0.5 shrink-0 ${video.notes ? 'text-primary' : 'text-muted-foreground opacity-50'}`} />
                  <p className={`text-sm flex-1 ${video.notes ? 'text-foreground' : 'text-muted-foreground italic'}`}>
                    {video.notes || "Add context note (e.g. event-driven, do not repeat)..."}
                  </p>
                  <Edit3 className="w-3 h-3 text-muted-foreground opacity-0 group-hover/note:opacity-100 transition-opacity" />
                </div>
              )}
            </div>
          </div>
        ))}
        
        {filteredVideos.length === 0 && (
          <div className="col-span-1 md:col-span-2 p-8 text-center text-muted-foreground border border-dashed border-border rounded-xl">
            No videos found matching your search.
          </div>
        )}
      </div>
    </div>
  );
}
