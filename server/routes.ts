import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { fetchChannelVideos, testYouTubeConnection } from "./youtube";
import { downloadAndAnalyzeThumbnail } from "./thumbnails";
import { scoreHook, extractHookText, generateHookVariants } from "./hooks";
import { generateActionFeed, adjustWeightsFromFeedback } from "./engine";
import { z } from "zod";

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
      const videos = await storage.getVideos(channelId);
      res.json({
        connected: videos.length > 0,
        videoCount: videos.length,
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
      processHooksInBackground(rawVideos);

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

      const feed = generateActionFeed(vids, execs, fb, adjustedWeights, meta?.lastSyncAt || null);
      res.json(feed);
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
      const exec = await storage.createExecution({
        channelId,
        videoId: videoId || null,
        type,
        executedAt: new Date().toISOString(),
        details: details || null,
      });
      res.json(exec);
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

  return httpServer;
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

async function processHooksInBackground(videos: any[]) {
  for (const v of videos) {
    try {
      const hookText = extractHookText(v.description);
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
