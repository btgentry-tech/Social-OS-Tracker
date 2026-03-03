import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, jsonb, boolean, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const videos = pgTable("videos", {
  id: varchar("id", { length: 64 }).primaryKey(),
  channelId: varchar("channel_id", { length: 64 }).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  publishedAt: text("published_at").notNull(),
  duration: text("duration"),
  viewCount: integer("view_count").notNull().default(0),
  likeCount: integer("like_count").notNull().default(0),
  commentCount: integer("comment_count").notNull().default(0),
  tags: text("tags").array().default(sql`'{}'::text[]`),
  thumbnailUrl: text("thumbnail_url"),
  thumbnailLocalPath: text("thumbnail_local_path"),
  thumbnailScore: real("thumbnail_score"),
  thumbnailMetrics: jsonb("thumbnail_metrics"),
  hookText: text("hook_text"),
  hookScore: real("hook_score"),
  hookFeatures: jsonb("hook_features"),
  transcript: text("transcript"),
  transcriptStatus: varchar("transcript_status", { length: 32 }).default("pending"),
  theme: varchar("theme", { length: 64 }),
  format: varchar("format", { length: 64 }),
  notes: text("notes"),
  performanceRatio: real("performance_ratio"),
  viewsRatio: real("views_ratio"),
  freshnessDays: integer("freshness_days"),
  decayBucket: varchar("decay_bucket", { length: 16 }),
  titleKeywords: text("title_keywords").array().default(sql`'{}'::text[]`),
  similarityGroup: varchar("similarity_group", { length: 128 }),
  timeSensitive: boolean("time_sensitive").default(false),
  classLabel: varchar("class_label", { length: 32 }),
  confidence: varchar("confidence", { length: 16 }),
  reasons: jsonb("reasons"),
  plan: jsonb("plan"),
  opportunityScore: real("opportunity_score"),
  scoreBreakdown: jsonb("score_breakdown"),
  lastRecommendedAt: text("last_recommended_at"),
});

export const insertVideoSchema = createInsertSchema(videos).omit({});
export type InsertVideo = z.infer<typeof insertVideoSchema>;
export type Video = typeof videos.$inferSelect;

export const syncMetadata = pgTable("sync_metadata", {
  id: serial("id").primaryKey(),
  channelId: varchar("channel_id", { length: 64 }).notNull(),
  apiKey: text("api_key"),
  lastSyncAt: text("last_sync_at"),
  videoCount: integer("video_count").default(0),
  channelAvgViews: real("channel_avg_views").default(0),
  oauthTokens: jsonb("oauth_tokens"),
  connectionMode: varchar("connection_mode", { length: 16 }).default("apikey"),
  winnerThreshold: real("winner_threshold").default(0),
  minViewsThreshold: integer("min_views_threshold").default(100),
});

export const insertSyncMetadataSchema = createInsertSchema(syncMetadata).omit({ id: true });
export type InsertSyncMetadata = z.infer<typeof insertSyncMetadataSchema>;
export type SyncMetadata = typeof syncMetadata.$inferSelect;

export const executions = pgTable("executions", {
  id: varchar("id", { length: 64 }).primaryKey().default(sql`gen_random_uuid()`),
  channelId: varchar("channel_id", { length: 64 }).notNull(),
  videoId: varchar("video_id", { length: 64 }),
  type: varchar("type", { length: 32 }).notNull(),
  executedAt: text("executed_at").notNull(),
  details: jsonb("details"),
});

export const insertExecutionSchema = createInsertSchema(executions).omit({ id: true });
export type InsertExecution = z.infer<typeof insertExecutionSchema>;
export type Execution = typeof executions.$inferSelect;

export const feedback = pgTable("feedback", {
  id: varchar("id", { length: 64 }).primaryKey().default(sql`gen_random_uuid()`),
  executionId: varchar("execution_id", { length: 64 }).notNull(),
  channelId: varchar("channel_id", { length: 64 }).notNull(),
  result: varchar("result", { length: 16 }).notNull(),
  createdAt: text("created_at").notNull(),
});

export const insertFeedbackSchema = createInsertSchema(feedback).omit({ id: true });
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type Feedback = typeof feedback.$inferSelect;

export const archetypeWeights = pgTable("archetype_weights", {
  id: serial("id").primaryKey(),
  channelId: varchar("channel_id", { length: 64 }).notNull().unique(),
  weights: jsonb("weights").notNull().default(sql`'{"repost":1.0,"fix":1.0,"newAngle":1.0}'::jsonb`),
});

export type ArchetypeWeights = typeof archetypeWeights.$inferSelect;
