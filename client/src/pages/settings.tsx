import { usePersistedStore } from "@/lib/store";
import { useQuery } from "@tanstack/react-query";
import { Settings as SettingsIcon, Database, Shield, Info } from "lucide-react";

export default function Settings() {
  const { youtubeChannelId } = usePersistedStore();

  const { data: status } = useQuery({
    queryKey: ["/api/status", youtubeChannelId],
    queryFn: async () => {
      if (!youtubeChannelId) return null;
      const res = await fetch(`/api/status?channelId=${youtubeChannelId}`);
      return res.json();
    },
    enabled: !!youtubeChannelId,
  });

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8 pt-8 md:pt-10 pb-20 animate-in slide-in-from-bottom-4 fade-in duration-500">
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 flex items-center gap-3" data-testid="text-page-title">
          <SettingsIcon className="w-8 h-8 text-primary" />
          Settings
        </h1>
        <p className="text-muted-foreground">System status and configuration.</p>
      </div>

      <div className="space-y-6">
        <div className="bg-card border border-border/50 rounded-xl p-6">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><Database className="w-5 h-5 text-primary" /> Data Status</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground block text-xs uppercase mb-1">Channel ID</span>
              <span className="font-mono text-xs">{youtubeChannelId || "Not connected"}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-xs uppercase mb-1">Videos Synced</span>
              <span>{status?.videoCount || 0}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-xs uppercase mb-1">Last Sync</span>
              <span className="text-xs">{status?.lastSync ? new Date(status.lastSync).toLocaleString() : "Never"}</span>
            </div>
            <div>
              <span className="text-muted-foreground block text-xs uppercase mb-1">Connection Mode</span>
              <span className="capitalize">{status?.connectionMode || "API Key"}</span>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border/50 rounded-xl p-6">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><Shield className="w-5 h-5 text-primary" /> Privacy</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• Your YouTube API key is stored server-side in the database, never in browser storage.</li>
            <li>• Video metadata (titles, views, publish dates) is stored for analysis.</li>
            <li>• Thumbnails are downloaded server-side for visual analysis only.</li>
            <li>• No data is sent to any third-party AI service. All analysis is deterministic.</li>
            <li>• Your feedback (better/same/worse) is used only to tune your local recommendation weights.</li>
          </ul>
        </div>

        <div className="bg-card border border-border/50 rounded-xl p-6">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><Info className="w-5 h-5 text-primary" /> About</h2>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>Creator OS v2 — Intelligence Mode</p>
            <p>A deterministic content intelligence system for YouTube creators. No AI, no black boxes — just signals, patterns, and plain-English recommendations.</p>
            <p className="text-xs mt-4">Built with React, Express, PostgreSQL, and sharp. All scoring is heuristic-based.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
