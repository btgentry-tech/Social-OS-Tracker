import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";
import {
  videos, type Video, type InsertVideo,
  syncMetadata, type SyncMetadata, type InsertSyncMetadata,
  executions, type Execution, type InsertExecution,
  feedback, type Feedback, type InsertFeedback,
  archetypeWeights, type ArchetypeWeights,
} from "@shared/schema";

export interface IStorage {
  getVideos(channelId: string): Promise<Video[]>;
  getVideo(id: string): Promise<Video | undefined>;
  upsertVideo(video: InsertVideo): Promise<Video>;
  upsertVideos(vids: InsertVideo[]): Promise<void>;
  updateVideoNote(id: string, note: string): Promise<Video | undefined>;
  updateVideoAnalysis(id: string, data: Partial<InsertVideo>): Promise<void>;

  getSyncMetadata(channelId: string): Promise<SyncMetadata | undefined>;
  upsertSyncMetadata(data: InsertSyncMetadata): Promise<SyncMetadata>;

  getExecutions(channelId: string): Promise<Execution[]>;
  createExecution(data: InsertExecution): Promise<Execution>;

  getFeedback(channelId: string): Promise<Feedback[]>;
  createFeedback(data: InsertFeedback): Promise<Feedback>;

  getArchetypeWeights(channelId: string): Promise<Record<string, number>>;
  updateArchetypeWeights(channelId: string, weights: Record<string, number>): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getVideos(channelId: string): Promise<Video[]> {
    return db.select().from(videos).where(eq(videos.channelId, channelId)).orderBy(desc(videos.publishedAt));
  }

  async getVideo(id: string): Promise<Video | undefined> {
    const [video] = await db.select().from(videos).where(eq(videos.id, id)).limit(1);
    return video;
  }

  async upsertVideo(video: InsertVideo): Promise<Video> {
    const [result] = await db.insert(videos).values(video)
      .onConflictDoUpdate({
        target: videos.id,
        set: {
          title: video.title,
          description: video.description,
          viewCount: video.viewCount,
          likeCount: video.likeCount,
          commentCount: video.commentCount,
          tags: video.tags,
          thumbnailUrl: video.thumbnailUrl,
          duration: video.duration,
          theme: video.theme,
          format: video.format,
          performanceRatio: video.performanceRatio,
        }
      })
      .returning();
    return result;
  }

  async upsertVideos(vids: InsertVideo[]): Promise<void> {
    for (const v of vids) {
      await this.upsertVideo(v);
    }
  }

  async updateVideoNote(id: string, note: string): Promise<Video | undefined> {
    const [result] = await db.update(videos).set({ notes: note }).where(eq(videos.id, id)).returning();
    return result;
  }

  async updateVideoAnalysis(id: string, data: Partial<InsertVideo>): Promise<void> {
    await db.update(videos).set(data).where(eq(videos.id, id));
  }

  async getSyncMetadata(channelId: string): Promise<SyncMetadata | undefined> {
    const [result] = await db.select().from(syncMetadata).where(eq(syncMetadata.channelId, channelId)).limit(1);
    return result;
  }

  async upsertSyncMetadata(data: InsertSyncMetadata): Promise<SyncMetadata> {
    const existing = await this.getSyncMetadata(data.channelId);
    if (existing) {
      const [result] = await db.update(syncMetadata)
        .set(data)
        .where(eq(syncMetadata.channelId, data.channelId))
        .returning();
      return result;
    }
    const [result] = await db.insert(syncMetadata).values(data).returning();
    return result;
  }

  async getExecutions(channelId: string): Promise<Execution[]> {
    return db.select().from(executions).where(eq(executions.channelId, channelId)).orderBy(desc(executions.executedAt));
  }

  async createExecution(data: InsertExecution): Promise<Execution> {
    const [result] = await db.insert(executions).values(data).returning();
    return result;
  }

  async getFeedback(channelId: string): Promise<Feedback[]> {
    return db.select().from(feedback).where(eq(feedback.channelId, channelId)).orderBy(desc(feedback.createdAt));
  }

  async createFeedback(data: InsertFeedback): Promise<Feedback> {
    const [result] = await db.insert(feedback).values(data).returning();
    return result;
  }

  async getArchetypeWeights(channelId: string): Promise<Record<string, number>> {
    const [row] = await db.select().from(archetypeWeights).where(eq(archetypeWeights.channelId, channelId)).limit(1);
    if (!row) return { repost: 1.0, fix: 1.0, newAngle: 1.0 };
    return row.weights as Record<string, number>;
  }

  async updateArchetypeWeights(channelId: string, weights: Record<string, number>): Promise<void> {
    await db.insert(archetypeWeights).values({ channelId, weights })
      .onConflictDoUpdate({ target: archetypeWeights.channelId, set: { weights } });
  }
}

export const storage = new DatabaseStorage();
