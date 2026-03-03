import { useState } from "react";
import { useStore } from "@/lib/store";
import { fetchYouTubeData } from "@/lib/youtube";
import { generateStrategicBrief } from "@/lib/engine";
import { useToast } from "@/hooks/use-toast";
import { Youtube, Instagram, Music, Save, RefreshCw, Key, Hash, CheckCircle2, Server, Database } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function Connect() {
  const { youtubeApiKey, youtubeChannelId, setCredentials, setSyncData, isSyncing, setSyncing, lastSyncedAt, videos } = useStore();
  const { toast } = useToast();
  
  const [apiKey, setApiKeyInput] = useState(youtubeApiKey);
  const [channelId, setChannelIdInput] = useState(youtubeChannelId);

  const handleSaveCredentials = () => {
    setCredentials(apiKey, channelId);
    toast({
      title: "Credentials Saved",
      description: "Keys persisted securely to local storage.",
    });
  };

  const handleSync = async () => {
    if (!youtubeApiKey || !youtubeChannelId) {
      toast({
        variant: "destructive",
        title: "Missing Credentials",
        description: "Please save API Key and Channel ID first.",
      });
      return;
    }

    setSyncing(true);
    try {
      toast({
        title: "Sync Initiated",
        description: "Pulling metadata from YouTube API...",
      });
      
      const videoData = await fetchYouTubeData(youtubeApiKey, youtubeChannelId);
      const brief = generateStrategicBrief(videoData);
      
      setSyncData(videoData, brief);
      
      toast({
        title: "Sync Complete",
        description: `Successfully ingested ${videoData.length} entities and regenerated intelligence.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Sync Failed",
        description: error.message || "Ensure your API key is valid and has YouTube Data API v3 enabled.",
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8 pt-10 animate-in slide-in-from-right-8 fade-in duration-500">
      <div className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight mb-2">Connectors</h1>
        <p className="text-muted-foreground">Manage external data pipelines for the strategic engine.</p>
      </div>

      <div className="grid gap-8">
        {/* YouTube Connector (Active) */}
        <div className="bg-card border border-border/60 rounded-xl overflow-hidden shadow-lg relative group">
          <div className="absolute top-0 left-0 w-1 h-full bg-red-600 group-hover:bg-red-500 transition-colors" />
          
          <div className="p-6 border-b border-border/40 flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-600/10 rounded-lg flex items-center justify-center text-red-600">
                <Youtube className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  YouTube Data V3
                  {videos.length > 0 && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                </h2>
                <p className="text-sm text-muted-foreground">Metadata, Views, Interactions</p>
              </div>
            </div>
            <div className="text-right flex flex-col items-end">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-secondary text-xs font-medium border border-border/50">
                <Database className="w-3 h-3 text-muted-foreground" />
                {videos.length} Records Local
              </span>
              {lastSyncedAt && (
                <span className="text-[10px] text-muted-foreground mt-1.5 font-mono">
                  LST_SYNC: {formatDistanceToNow(new Date(lastSyncedAt))} AGO
                </span>
              )}
            </div>
          </div>

          <div className="p-6 bg-secondary/10 grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
                  <Key className="w-3 h-3" /> API Key
                </label>
                <input 
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary font-mono transition-colors"
                />
              </div>
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-2">
                  <Hash className="w-3 h-3" /> Channel ID
                </label>
                <input 
                  type="text"
                  value={channelId}
                  onChange={(e) => setChannelIdInput(e.target.value)}
                  placeholder="UC..."
                  className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary font-mono transition-colors"
                />
              </div>
              
              <div className="pt-2 flex gap-3">
                <button 
                  onClick={handleSaveCredentials}
                  className="bg-secondary text-foreground hover:bg-secondary/80 border border-border px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Save className="w-4 h-4" /> Save Local
                </button>
                <button 
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Ingesting...' : 'Sync Now'}
                </button>
              </div>
            </div>

            <div className="bg-background/50 border border-border/50 rounded-lg p-4 font-mono text-[11px] text-muted-foreground flex flex-col justify-center">
              <p className="mb-2 text-primary">{'// CONNECTION_LOG'}</p>
              <p className="opacity-70">1. Keys stored locally via window.localStorage</p>
              <p className="opacity-70">2. Hits directly Google's REST API from client</p>
              <p className="opacity-70">3. Ingests last 20 videos {'->'} standardizes schema</p>
              <p className="opacity-70">4. Passes payload to deterministic engine</p>
              <p className="mt-4 text-green-500/70 border-t border-border/50 pt-2">STATUS: READY</p>
            </div>
          </div>
        </div>

        {/* Instagram Scaffold (Disabled) */}
        <div className="bg-card/50 border border-border/30 rounded-xl overflow-hidden opacity-60">
          <div className="p-6 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-pink-600/10 rounded-lg flex items-center justify-center text-pink-600 grayscale">
                <Instagram className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2">Instagram Graph API</h2>
                <p className="text-sm text-muted-foreground">Reels, Posts, Stories</p>
              </div>
            </div>
            <div>
              <span className="inline-flex px-2.5 py-1 rounded bg-secondary text-xs font-medium border border-border/50 text-muted-foreground uppercase tracking-wider">
                Prerequisite: Meta App Review
              </span>
            </div>
          </div>
        </div>

        {/* TikTok Scaffold (Disabled) */}
        <div className="bg-card/50 border border-border/30 rounded-xl overflow-hidden opacity-60">
          <div className="p-6 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-cyan-400/10 rounded-lg flex items-center justify-center text-foreground grayscale">
                <Music className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2">TikTok Business API</h2>
                <p className="text-sm text-muted-foreground">Video Metrics, Profile</p>
              </div>
            </div>
            <div>
              <span className="inline-flex px-2.5 py-1 rounded bg-secondary text-xs font-medium border border-border/50 text-muted-foreground uppercase tracking-wider">
                Prerequisite: Developer Account
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
