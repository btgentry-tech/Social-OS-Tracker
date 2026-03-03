import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { fetchChannelVideos, testYouTubeConnection } from "./youtube";
import { downloadAndAnalyzeThumbnail } from "./thumbnails";
import { scoreHook, extractHookText } from "./hooks";
import { runFullAnalysis, adjustWeightsFromFeedback } from "./engine";
import type { Video } from "@shared/schema";
import type { AnalysisResult, VideoOpportunity } from "./engine";

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
      const result = runFullAnalysis(vids, execs, fb, adjustedWeights, meta?.lastSyncAt || null, minViews);

      persistAnalysisResults(result.opportunities);

      const items = buildLegacyItems(result.opportunities, vids);
      const gameplan = buildLegacyGameplan(result);

      res.json({
        ...result,
        items,
        gameplan,
      });
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

function buildLegacyItems(opportunities: VideoOpportunity[], videos: Video[]): any[] {
  const videoMap = new Map(videos.map(v => [v.id, v]));
  const items: any[] = [];

  const nonArchive = opportunities.filter(o => o.classLabel !== "Archive");
  if (nonArchive.length === 0) return [];

  const primary = nonArchive[0];
  const primaryVideo = videoMap.get(primary.videoId);

  const sectionMap: Record<string, string> = {
    "Evergreen Winner": "doThisNext",
    "Repost Candidate": "repost",
    "Retry (Second Shot)": "fixRetry",
    "Restructure": "newAngle",
    "Archive": "archive",
  };

  const badgeMap: Record<string, string> = {
    "Evergreen Winner": "Evergreen",
    "Repost Candidate": "Repost",
    "Retry (Second Shot)": "Fix",
    "Restructure": "Restructure",
    "Archive": "Archive",
  };

  items.push({
    section: "doThisNext",
    title: primary.classLabel === "Repost Candidate" ? "High-Probability Repost" :
           primary.classLabel === "Evergreen Winner" ? "Evergreen Winner — Double Down" :
           primary.classLabel === "Retry (Second Shot)" ? "Fix & Retry" :
           `Restructure: ${primary.title.slice(0, 40)}`,
    badge: "Do This First",
    badgeColor: "primary",
    video: primaryVideo,
    package: oppToPackage(primary),
  });

  const repostOpp = nonArchive.find(o => o.classLabel === "Repost Candidate" && o.videoId !== primary.videoId);
  if (repostOpp) {
    items.push({
      section: "repost",
      title: "Strong Repost Opportunity",
      badge: "Repost",
      badgeColor: "secondary",
      video: videoMap.get(repostOpp.videoId),
      package: oppToPackage(repostOpp),
    });
  }

  const retryOpp = nonArchive.find(o =>
    (o.classLabel === "Retry (Second Shot)" || o.classLabel === "Restructure") &&
    o.videoId !== primary.videoId &&
    o.videoId !== repostOpp?.videoId
  );
  if (retryOpp) {
    items.push({
      section: "fixRetry",
      title: retryOpp.classLabel === "Restructure" ? `Restructure: ${retryOpp.title.slice(0, 30)}` : "Fix & Retry",
      badge: badgeMap[retryOpp.classLabel] || "Fix",
      badgeColor: "secondary",
      video: videoMap.get(retryOpp.videoId),
      package: oppToPackage(retryOpp),
    });
  }

  const evergreenOpp = nonArchive.find(o =>
    o.classLabel === "Evergreen Winner" &&
    o.videoId !== primary.videoId &&
    o.videoId !== repostOpp?.videoId &&
    o.videoId !== retryOpp?.videoId
  );
  if (evergreenOpp) {
    items.push({
      section: "newAngle",
      title: `Evergreen: ${evergreenOpp.title.slice(0, 40)}`,
      badge: "Evergreen",
      badgeColor: "secondary",
      video: videoMap.get(evergreenOpp.videoId),
      package: oppToPackage(evergreenOpp),
    });
  }

  return items;
}

function oppToPackage(opp: VideoOpportunity): any {
  const plan = opp.plan;
  return {
    why: opp.reasons[0] || "",
    diagnosis: opp.reasons.join(" "),
    actionPlan: plan.specificChanges?.join(" ") || plan.reasons?.join(" ") || opp.reasons[0] || "",
    confidence: opp.confidence,
    hook: plan.hookVariants[0] || "",
    hookVariants: plan.hookVariants,
    captionStarter: plan.captionStarter,
    ctaVariants: plan.ctaVariants,
    hashtags: plan.hashtagPack.join(" "),
    opportunityScore: opp.opportunityScore,
    scoreBreakdown: {
      performanceRatio: opp.viewsRatio,
      freshness: opp.freshnessDays,
      hookQuality: Math.round((opp.scoreBreakdown.hookQualityScore / 10) * 100),
      thumbnailQuality: opp.thumbnailScore,
      novelty: Math.round(opp.scoreBreakdown.noveltyScore * 10),
      fatiguePenalty: Math.round(opp.scoreBreakdown.repetitionPenalty),
    },
  };
}

function buildLegacyGameplan(result: AnalysisResult): string[] {
  const plan: string[] = [];
  const top = result.opportunities[0];
  if (top) {
    plan.push(`1. ${top.classLabel}: "${top.title.slice(0, 50)}" — score ${top.opportunityScore}/100.`);
  }
  if (result.next7DaysPlan.length > 0) {
    plan.push(`2. Next posting slot: ${result.next7DaysPlan[0].day} at ${result.next7DaysPlan[0].time}.`);
  }
  plan.push(`3. Review the "How we decided" breakdown on each card to understand your scores.`);
  plan.push(`4. Add context notes to your videos for better time-sensitivity detection.`);
  if (result.warnings.length > 0) {
    plan.push(`5. Address the ${result.warnings.length} warning${result.warnings.length > 1 ? "s" : ""} above.`);
  }
  plan.push(`6. After posting, come back and rate the result to train the engine.`);
  return plan;
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
