import { useState } from "react";
import { usePersistedStore, useSessionStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { Youtube, RefreshCw, Key, Hash, CheckCircle2, Database, Trash2, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";

export default function Connect() {
  const { youtubeChannelId, setChannelId, clearChannelId } = usePersistedStore();
  const { youtubeApiKey, setApiKey, isSyncing, setSyncing } = useSessionStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [localApiKey, setLocalApiKey] = useState(youtubeApiKey);
  const [localChannelId, setLocalChannelId] = useState(youtubeChannelId);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");

  const { data: status } = useQuery({
    queryKey: ["/api/status", youtubeChannelId],
    queryFn: async () => {
      if (!youtubeChannelId) return { connected: false, videoCount: 0, lastSync: null };
      const res = await fetch(`/api/status?channelId=${youtubeChannelId}`);
      return res.json();
    },
    enabled: !!youtubeChannelId,
  });

  const isConnected = status?.connected && status?.videoCount > 0;

  const handleTestConnection = async () => {
    if (!localApiKey || !localChannelId) {
      toast({ variant: "destructive", title: "Missing fields", description: "Provide both API Key and Channel ID." });
      return;
    }
    setTestStatus("testing");
    try {
      const res = await apiRequest("POST", "/api/connect/youtube", {
        apiKey: localApiKey,
        channelId: localChannelId,
      });
      const data = await res.json();
      if (data.ok) {
        setTestStatus("success");
        setTestMessage(data.channelTitle ? `Connected to ${data.channelTitle}!` : "Connection successful!");
        setApiKey(localApiKey);
        setChannelId(localChannelId);
      } else {
        setTestStatus("error");
        setTestMessage(data.message || "Failed to connect.");
      }
    } catch (err: any) {
      setTestStatus("error");
      setTestMessage(err.message || "Failed to connect.");
    }
  };

  const handleSync = async () => {
    if (!youtubeChannelId) {
      toast({ variant: "destructive", title: "Test Connection First" });
      return;
    }
    setSyncing(true);
    try {
      toast({ title: "Sync Initiated", description: "Pulling metadata from YouTube API..." });
      const res = await apiRequest("POST", "/api/sync/youtube", { channelId: youtubeChannelId });
      const data = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analyze"] });
      toast({
        title: "Sync Complete",
        description: `Ingested ${data.videoCount} videos. Thumbnail + hook analysis running in background.`,
      });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Sync Failed", description: error.message });
    } finally {
      setSyncing(false);
    }
  };

  const handleClear = () => {
    if (confirm("Are you sure? This will disconnect your channel.")) {
      clearChannelId();
      setApiKey("");
      setLocalApiKey("");
      setLocalChannelId("");
      setTestStatus("idle");
      queryClient.invalidateQueries();
      toast({ title: "Connection Cleared" });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 pt-8 md:pt-10 pb-20 animate-in slide-in-from-right-8 fade-in duration-500">
      <div className="mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2" data-testid="text-page-title">Connect</h1>
          <p className="text-muted-foreground">Link your YouTube channel to power the intelligence engine.</p>
        </div>
      </div>

      <div className="grid gap-8">
        <div className={`bg-card border ${isConnected ? "border-green-500/50" : "border-border/60"} rounded-xl overflow-hidden shadow-lg relative transition-colors duration-300`}>
          <div className="p-6 border-b border-border/40 flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-600/10 rounded-lg flex items-center justify-center text-red-600">
                <Youtube className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2" data-testid="text-connector-title">
                  YouTube Data API
                  {isConnected && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-500/10 text-green-500 border border-green-500/20" data-testid="status-connected">
                      CONNECTED
                    </span>
                  )}
                </h2>
                <p className="text-sm text-muted-foreground">Metadata, Views, Interactions, Thumbnails</p>
              </div>
            </div>

            <div className="flex gap-4 items-center">
              {isConnected && (
                <div className="text-right flex flex-col items-end">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-secondary text-xs font-medium border border-border/50" data-testid="text-video-count">
                    <Database className="w-3 h-3 text-muted-foreground" />
                    {status?.videoCount || 0} Videos
                  </span>
                  {status?.lastSync && (
                    <span className="text-[10px] text-muted-foreground mt-1.5 font-mono" data-testid="text-last-sync">
                      SYNCED: {formatDistanceToNow(new Date(status.lastSync))} AGO
                    </span>
                  )}
                </div>
              )}
              {isConnected && (
                <button onClick={handleClear} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors" data-testid="button-clear">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="p-6 bg-secondary/10 grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-4 relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-border">
                <div className="relative">
                  <div className="absolute -left-8 top-0.5 w-4 h-4 rounded-full bg-background border-2 border-primary flex items-center justify-center text-[10px] font-bold">1</div>
                  <label className="text-xs font-semibold uppercase text-foreground flex items-center gap-2 mb-1.5">
                    <Key className="w-3 h-3" /> API Key (Session Only)
                  </label>
                  <input
                    type="password"
                    value={localApiKey}
                    onChange={(e) => { setLocalApiKey(e.target.value); setTestStatus("idle"); }}
                    placeholder="AIzaSy..."
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary font-mono transition-colors"
                    data-testid="input-api-key"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Stored on the server. Never exposed to your browser storage.</p>
                </div>

                <div className="relative">
                  <div className="absolute -left-8 top-0.5 w-4 h-4 rounded-full bg-background border-2 border-primary flex items-center justify-center text-[10px] font-bold">2</div>
                  <label className="text-xs font-semibold uppercase text-foreground flex items-center gap-2 mb-1.5">
                    <Hash className="w-3 h-3" /> Channel ID
                  </label>
                  <input
                    type="text"
                    value={localChannelId}
                    onChange={(e) => { setLocalChannelId(e.target.value); setTestStatus("idle"); }}
                    placeholder="UC..."
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary font-mono transition-colors"
                    data-testid="input-channel-id"
                  />
                </div>

                <div className="relative pt-2">
                  <div className="absolute -left-8 top-3.5 w-4 h-4 rounded-full bg-background border-2 border-primary flex items-center justify-center text-[10px] font-bold">3</div>
                  <div className="flex gap-3 items-center">
                    <button
                      onClick={handleTestConnection}
                      disabled={testStatus === "testing" || !localApiKey || !localChannelId}
                      className="bg-secondary text-foreground hover:bg-secondary/80 border border-border px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                      data-testid="button-test-connection"
                    >
                      {testStatus === "testing" ? "Testing..." : "Test Connection"}
                    </button>
                    {testStatus === "success" && <span className="text-xs text-green-500 font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {testMessage}</span>}
                    {testStatus === "error" && <span className="text-xs text-destructive font-medium">{testMessage}</span>}
                  </div>
                </div>

                <div className="relative pt-2">
                  <div className="absolute -left-8 top-3.5 w-4 h-4 rounded-full bg-background border-2 border-primary flex items-center justify-center text-[10px] font-bold">4</div>
                  <button
                    onClick={handleSync}
                    disabled={isSyncing || testStatus !== "success"}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer w-full justify-center"
                    data-testid="button-sync"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
                    {isSyncing ? "Syncing Library..." : "Sync Now"}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-background/50 border border-border/50 rounded-lg p-5 font-mono text-[11px] text-muted-foreground flex flex-col justify-center">
              <span className="mb-3 text-primary font-semibold block">{"// PIPELINE_CHECKLIST"}</span>
              <div className="space-y-2">
                <div className={`flex items-center gap-2 ${localApiKey ? "text-foreground" : "opacity-50"}`}>
                  {localApiKey ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <span className="w-3 h-3 border border-border rounded-full inline-block" />} Provide API Key
                </div>
                <div className={`flex items-center gap-2 ${localChannelId ? "text-foreground" : "opacity-50"}`}>
                  {localChannelId ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <span className="w-3 h-3 border border-border rounded-full inline-block" />} Provide Channel ID
                </div>
                <div className={`flex items-center gap-2 ${testStatus === "success" ? "text-foreground" : "opacity-50"}`}>
                  {testStatus === "success" ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <span className="w-3 h-3 border border-border rounded-full inline-block" />} Verify Access
                </div>
                <div className={`flex items-center gap-2 ${isConnected ? "text-foreground" : "opacity-50"}`}>
                  {isConnected ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <span className="w-3 h-3 border border-border rounded-full inline-block" />} Sync to Database
                </div>
                <div className={`flex items-center gap-2 ${isConnected ? "text-foreground" : "opacity-50"}`}>
                  {isConnected ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <span className="w-3 h-3 border border-border rounded-full inline-block" />} Thumbnail + Hook Analysis
                </div>
              </div>

              {isConnected && (
                <div className="mt-6 pt-4 border-t border-border/50">
                  <Link href="/">
                    <button className="w-full bg-secondary/50 hover:bg-secondary text-foreground py-2 rounded text-xs font-sans font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer" data-testid="link-view-brief">
                      View Intelligence Brief <ArrowRight className="w-3 h-3" />
                    </button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
