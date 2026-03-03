import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { fetchChannelVideos, testYouTubeConnection } from "./youtube";
import { downloadAndAnalyzeThumbnail } from "./thumbnails";
import { scoreHook, extractHookText } from "./hooks";
import { runFullAnalysis, adjustWeightsFromFeedback, computeAdaptiveScoringWeights, DEFAULT_SCORING_WEIGHTS } from "./engine";
import type { ScoringWeights } from "./engine";
import { fetchYouTubeTranscript } from "./transcripts";
import { parse } from "csv-parse/sync";
import { createHash } from "crypto";
import multer from "multer";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/status", async (_req, res) => {
    try {
      const channelId = _req.query.channelId as string;
      if (!channelId) {
        return res.json({ connected: false, videoCount: 0, lastSync: null });
      }
      const meta = await storage.getSyncMetadata(channelId);
      const vids = await storage.getVideos(channelId);
      res.json({
        connected: vids.length > 0,
        videoCount: vids.length,
        lastSync: meta?.lastSyncAt || null,
        channelAvgViews: meta?.channelAvgViews || 0,
        connectionMode: meta?.connectionMode || "apikey",
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/connect/youtube", async (req, res) => {
    try {
      const { apiKey, channelId } = req.body;
      if (!apiKey || !channelId) {
        return res.status(400).json({ message: "apiKey and channelId are required." });
      }
      const result = await testYouTubeConnection(apiKey, channelId);
      if (result.ok) {
        await storage.upsertSyncMetadata({
          channelId,
          apiKey,
          connectionMode: "apikey",
        });
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/sync/youtube", async (req, res) => {
    try {
      const { channelId } = req.body;
      if (!channelId) {
        return res.status(400).json({ message: "channelId is required." });
      }

      const meta = await storage.getSyncMetadata(channelId);
      if (!meta || !meta.apiKey) {
        return res.status(400).json({ message: "No API key found. Please connect first." });
      }

      const rawVideos = await fetchChannelVideos(meta.apiKey, channelId, 50);
      await storage.upsertVideos(rawVideos);

      const avgViews = rawVideos.length > 0
        ? rawVideos.reduce((s, v) => s + (v.viewCount || 0), 0) / rawVideos.length
        : 0;

      await storage.upsertSyncMetadata({
        channelId,
        apiKey: meta.apiKey,
        lastSyncAt: new Date().toISOString(),
        videoCount: rawVideos.length,
        channelAvgViews: avgViews,
        connectionMode: meta.connectionMode || "apikey",
      });

      processThumbnailsInBackground(rawVideos.map(v => ({ id: v.id, url: v.thumbnailUrl || "" })));
      processTranscriptsInBackground(rawVideos);
      processHooksInBackground(rawVideos);

      runAnalysisAndPersist(channelId);

      res.json({
        ok: true,
        videoCount: rawVideos.length,
        syncedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/content", async (req, res) => {
    try {
      const channelId = req.query.channelId as string;
      if (!channelId) {
        return res.status(400).json({ message: "channelId is required." });
      }
      const vids = await storage.getVideos(channelId);
      res.json(vids);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/notes", async (req, res) => {
    try {
      const { videoId, note } = req.body;
      if (!videoId) {
        return res.status(400).json({ message: "videoId is required." });
      }
      const updated = await storage.updateVideoNote(videoId, note || "");
      if (!updated) {
        return res.status(404).json({ message: "Video not found." });
      }
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/analyze", async (req, res) => {
    try {
      const { channelId } = req.body;
      if (!channelId) {
        return res.status(400).json({ message: "channelId is required." });
      }

      const vids = await storage.getVideos(channelId);
      const execs = await storage.getExecutions(channelId);
      const fb = await storage.getFeedback(channelId);
      const weights = await storage.getArchetypeWeights(channelId);
      const meta = await storage.getSyncMetadata(channelId);

      const adjustedWeights = adjustWeightsFromFeedback(weights, fb, execs);
      if (JSON.stringify(adjustedWeights) !== JSON.stringify(weights)) {
        await storage.updateArchetypeWeights(channelId, adjustedWeights);
      }

      const minViews = meta?.minViewsThreshold || 100;
      const rawScoringWeights = (meta?.scoringWeights as ScoringWeights) || DEFAULT_SCORING_WEIGHTS;
      const scoringWeights = computeAdaptiveScoringWeights(rawScoringWeights, execs);
      if (JSON.stringify(scoringWeights) !== JSON.stringify(rawScoringWeights) && meta) {
        await storage.upsertSyncMetadata({
          channelId: meta.channelId,
          apiKey: meta.apiKey,
          lastSyncAt: meta.lastSyncAt,
          videoCount: meta.videoCount,
          channelAvgViews: meta.channelAvgViews,
          connectionMode: meta.connectionMode,
          winnerThreshold: meta.winnerThreshold,
          minViewsThreshold: meta.minViewsThreshold,
          scoringWeights: scoringWeights as any,
        });
      }
      const result = runFullAnalysis(vids, execs, fb, adjustedWeights, meta?.lastSyncAt || null, minViews, scoringWeights);

      persistAnalysisResults(result.opportunities);

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/execute", async (req, res) => {
    try {
      const { channelId, videoId, type, details } = req.body;
      if (!channelId || !type) {
        return res.status(400).json({ message: "channelId and type are required." });
      }

      let predictedLift: number | null = null;
      if (videoId) {
        const video = await storage.getVideo(videoId);
        if (video) {
          predictedLift = video.viewCount * ((video.opportunityScore || 50) / 50);
        }
      }

      const exec = await storage.createExecution({
        channelId,
        videoId: videoId || null,
        type,
        executedAt: new Date().toISOString(),
        details: details || null,
        predictedLift,
      });

      if (videoId) {
        await storage.updateVideoAnalysis(videoId, {
          lastRecommendedAt: new Date().toISOString(),
        });
      }

      res.json(exec);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/execution/performance", async (req, res) => {
    try {
      const { executionId, actualViews, actualLikes, actualComments, actualShares } = req.body;
      if (!executionId) {
        return res.status(400).json({ message: "executionId is required." });
      }
      const exec = await storage.updateExecutionPerformance(executionId, {
        actualViews: actualViews ?? null,
        actualLikes: actualLikes ?? null,
        actualComments: actualComments ?? null,
        actualShares: actualShares ?? null,
        performanceRecordedAt: new Date().toISOString(),
      });
      if (!exec) {
        return res.status(404).json({ message: "Execution not found." });
      }
      res.json(exec);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/video/tags", async (req, res) => {
    try {
      const { videoId, tags } = req.body;
      if (!videoId || !Array.isArray(tags)) {
        return res.status(400).json({ message: "videoId and tags array required." });
      }
      const updated = await storage.updateVideoAnalysis(videoId, { userTags: tags });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/feedback", async (req, res) => {
    try {
      const { executionId, channelId, result } = req.body;
      if (!executionId || !channelId || !result) {
        return res.status(400).json({ message: "executionId, channelId, and result are required." });
      }
      if (!["better", "same", "worse"].includes(result)) {
        return res.status(400).json({ message: "result must be better, same, or worse." });
      }
      const fb = await storage.createFeedback({
        executionId,
        channelId,
        result,
        createdAt: new Date().toISOString(),
      });
      res.json(fb);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/executions", async (req, res) => {
    try {
      const channelId = req.query.channelId as string;
      if (!channelId) return res.status(400).json({ message: "channelId required." });
      const execs = await storage.getExecutions(channelId);
      res.json(execs);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/feedback", async (req, res) => {
    try {
      const channelId = req.query.channelId as string;
      if (!channelId) return res.status(400).json({ message: "channelId required." });
      const fb = await storage.getFeedback(channelId);
      res.json(fb);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

  app.post("/api/import/csv", upload.single("file"), async (req: any, res) => {
    try {
      const platform = req.body.platform as string;
      const channelId = req.body.channelId as string;
      if (!platform || !channelId) {
        return res.status(400).json({ message: "platform and channelId are required." });
      }
      if (!["tiktok", "instagram"].includes(platform)) {
        return res.status(400).json({ message: "platform must be 'tiktok' or 'instagram'." });
      }
      if (!req.file) {
        return res.status(400).json({ message: "CSV file is required." });
      }

      const csvText = req.file.buffer.toString("utf-8");
      const records = parse(csvText, { columns: true, skip_empty_lines: true, relax_column_count: true });

      const imported: any[] = [];
      for (const row of records) {
        const mapped = mapCsvRow(row, platform, channelId);
        if (mapped) {
          await storage.upsertVideo(mapped);
          imported.push(mapped);
        }
      }

      if (imported.length > 0) {
        runAnalysisAndPersist(channelId);
      }

      res.json({ ok: true, importedCount: imported.length, platform });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/transcript-stats", async (req, res) => {
    try {
      const channelId = req.query.channelId as string;
      if (!channelId) return res.status(400).json({ message: "channelId required." });
      const vids = await storage.getVideos(channelId);
      const ytVids = vids.filter(v => (v.platform || "youtube") === "youtube");
      const ready = ytVids.filter(v => v.transcriptStatus === "ready").length;
      const missing = ytVids.filter(v => v.transcriptStatus === "missing").length;
      const pending = ytVids.filter(v => !v.transcriptStatus || v.transcriptStatus === "pending").length;
      res.json({ total: ytVids.length, ready, missing, pending });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  return httpServer;
}

function mapCsvRow(row: any, platform: string, channelId: string): any | null {
  const keys = Object.keys(row);
  if (keys.length === 0) return null;

  if (platform === "tiktok") {
    const title = row["Video Description"] || row["Description"] || row["video_description"] || row["Content"] || "";
    const views = parseInt(row["Video Views"] || row["Views"] || row["video_views"] || row["Total Views"] || "0", 10);
    const likes = parseInt(row["Likes"] || row["likes"] || row["Total Likes"] || "0", 10);
    const comments = parseInt(row["Comments"] || row["comments"] || row["Total Comments"] || "0", 10);
    const dateStr = row["Date"] || row["date"] || row["Date Posted"] || row["Create Time"] || "";

    if (!title && views === 0) return null;

    const hash = createHash("md5").update(`tiktok_${title}_${dateStr}`).digest("hex").slice(0, 16);
    const id = `tk_${hash}`;

    return {
      id,
      channelId,
      title: title.slice(0, 200) || "TikTok Post",
      description: title,
      publishedAt: parseDateSafe(dateStr),
      viewCount: views,
      likeCount: likes,
      commentCount: comments,
      tags: [],
      platform: "tiktok",
      theme: "General",
      format: "Shorts",
    };
  }

  if (platform === "instagram") {
    const title = row["Caption"] || row["caption"] || row["Description"] || row["Post Caption"] || row["Content"] || "";
    const views = parseInt(row["Impressions"] || row["Reach"] || row["impressions"] || row["Views"] || "0", 10);
    const likes = parseInt(row["Likes"] || row["likes"] || row["Total Likes"] || "0", 10);
    const comments = parseInt(row["Comments"] || row["comments"] || row["Total Comments"] || "0", 10);
    const dateStr = row["Date"] || row["date"] || row["Published"] || row["Date Posted"] || "";

    if (!title && views === 0) return null;

    const hash = createHash("md5").update(`ig_${title}_${dateStr}`).digest("hex").slice(0, 16);
    const id = `ig_${hash}`;

    return {
      id,
      channelId,
      title: title.slice(0, 200) || "Instagram Post",
      description: title,
      publishedAt: parseDateSafe(dateStr),
      viewCount: views,
      likeCount: likes,
      commentCount: comments,
      tags: [],
      platform: "instagram",
      theme: "General",
      format: "Standard",
    };
  }

  return null;
}

function parseDateSafe(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return new Date().toISOString();
    return d.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

async function persistAnalysisResults(opportunities: any[]) {
  for (const opp of opportunities) {
    try {
      await storage.updateVideoAnalysis(opp.videoId, {
        viewsRatio: opp.viewsRatio,
        freshnessDays: opp.freshnessDays,
        decayBucket: opp.decayBucket,
        classLabel: opp.classLabel,
        confidence: opp.confidence,
        reasons: opp.reasons,
        plan: opp.plan,
        opportunityScore: opp.opportunityScore,
        scoreBreakdown: opp.scoreBreakdown,
        titleKeywords: opp.titleKeywords,
        similarityGroup: opp.similarityGroup,
        timeSensitive: opp.timeSensitive,
        nextAction: opp.nextAction,
      });
    } catch (err) {
      console.error(`Failed to persist analysis for ${opp.videoId}:`, err);
    }
  }
}

async function runAnalysisAndPersist(channelId: string) {
  try {
    const vids = await storage.getVideos(channelId);
    const execs = await storage.getExecutions(channelId);
    const fb = await storage.getFeedback(channelId);
    const weights = await storage.getArchetypeWeights(channelId);
    const meta = await storage.getSyncMetadata(channelId);

    const result = runFullAnalysis(vids, execs, fb, weights, meta?.lastSyncAt || null, meta?.minViewsThreshold || 100);
    await persistAnalysisResults(result.opportunities);
    console.log(`Analysis persisted for ${channelId}: ${result.opportunities.length} videos classified.`);
  } catch (err) {
    console.error(`Background analysis failed for ${channelId}:`, err);
  }
}

async function processThumbnailsInBackground(items: { id: string; url: string }[]) {
  for (const item of items) {
    try {
      if (!item.url) continue;
      const result = await downloadAndAnalyzeThumbnail(item.id, item.url);
      if (result) {
        await storage.updateVideoAnalysis(item.id, {
          thumbnailLocalPath: result.localPath,
          thumbnailScore: result.score,
          thumbnailMetrics: result.metrics,
        });
      }
    } catch (err) {
      console.error(`Thumbnail processing failed for ${item.id}:`, err);
    }
  }
}

async function processTranscriptsInBackground(videos: any[]) {
  for (const v of videos) {
    try {
      // Only fetch if platform is youtube and we don't have it yet
      if (v.platform !== 'youtube') continue;

      const transcript = await fetchYouTubeTranscript(v.id);
      if (transcript) {
        const hookText = extractHookText(transcript);
        const hookResult = hookText ? scoreHook(hookText) : null;

        await storage.updateVideoAnalysis(v.id, {
          transcript,
          transcriptStatus: 'ready',
          ...(hookResult ? {
            hookText,
            hookScore: hookResult.score,
            hookFeatures: hookResult.features,
          } : {})
        });
      } else {
        await storage.updateVideoAnalysis(v.id, {
          transcriptStatus: 'missing'
        });
      }
    } catch (err) {
      console.error(`Transcript processing failed for ${v.id}:`, err);
    }
  }
}

async function processHooksInBackground(videos: any[]) {
  for (const v of videos) {
    try {
      // Refresh video state to check if transcript was just added
      const current = await storage.getVideo(v.id);
      const textToScore = (current?.transcriptStatus === 'ready' && current?.transcript) 
        ? current.transcript 
        : v.description;

      const hookText = extractHookText(textToScore);
      if (hookText) {
        const hookResult = scoreHook(hookText);
        await storage.updateVideoAnalysis(v.id, {
          hookText,
          hookScore: hookResult.score,
          hookFeatures: hookResult.features,
        });
      }
    } catch (err) {
      console.error(`Hook processing failed for ${v.id}:`, err);
    }
  }
}
