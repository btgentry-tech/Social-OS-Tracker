import { getTrendingTopics, matchTrends } from "./trendRadar"
import type { Video, Execution, Feedback } from "@shared/schema";

export type ClassLabel = "Evergreen" | "Retry-Hook" | "Retry-Timing" | "Seasonal" | "Event-Based" | "Archive";
export type ConfidenceLevel = "High" | "Medium" | "Low";

export interface ScoringWeights {
  hook_weight: number;
  timing_weight: number;
  thumbnail_weight: number;
  novelty_weight: number;
  views_weight: number;
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  hook_weight: 1.0,
  timing_weight: 1.0,
  thumbnail_weight: 1.0,
  novelty_weight: 1.0,
  views_weight: 1.0,
};

export interface ScoreBreakdown {
  viewsRatioScore: number;
  decayScore: number;
  noveltyScore: number;
  thumbnailQualityScore: number;
  repetitionPenalty: number;
  timeSensitivePenalty: number;
  hookQualityScore: number;
  explanation: string[];
}

export interface ScheduleSlot {
  day: string;
  time: string;
  label: string;
}

export interface VideoPlan {
  classLabel: ClassLabel;
  scheduleSlots: ScheduleSlot[];
  hookVariants: string[];
  captionStarter: string;
  ctaVariants: string[];
  hashtagPack: string[];
  reasons: string[];
  specificChanges?: string[];
  repostCadence?: string;
  repurposePlan?: string[];
  sequelIdeas?: string[];
  newFraming?: string;
  archiveReason?: string;
  extractedPattern?: string;
  anniversaryNote?: string;
}

export interface VideoOpportunity {
  videoId: string;
  title: string;
  classLabel: ClassLabel;
  confidence: ConfidenceLevel;
  reasons: string[];
  plan: VideoPlan;
  opportunityScore: number;
  scoreBreakdown: ScoreBreakdown;
  viewsRatio: number;
  freshnessDays: number;
  decayBucket: string;
  thumbnailScore: number;
  timeSensitive: boolean;
  similarityGroup: string;
  titleKeywords: string[];
  nextAction: string;
  diagnosis: string;
}

export interface AnalysisResult {
  opportunities: VideoOpportunity[];
  next7DaysPlan: ScheduleSlot[];
  warnings: string[];
  channelHealth: {
    score: number;
    trend: "up" | "down" | "flat";
    label: string;
    details: string;
  };
  overallOpportunityScore: number;
  videoCount: number;
  lastSync: string | null;
  winnerCount: number;
  winnerThreshold: number;
  seasonalInsights: string[];
  evergreenCount: number;
}

const TIME_SENSITIVE_KEYWORDS = [
  "memorial", "holiday", "event", "news", "vacation", "died",
  "anniversary", "christmas", "easter", "halloween", "new year",
  "thanksgiving", "seasonal", "election", "breaking", "rip",
  "tribute", "birthday", "ceremony", "award", "launch day",
];

const EVENT_KEYWORDS = [
  "election", "super bowl", "world cup", "olympics", "oscars",
  "grammys", "award", "ceremony", "breaking", "launch day",
  "premiere", "concert", "festival", "summit", "conference",
];

const SEASONAL_KEYWORDS = [
  "christmas", "easter", "halloween", "thanksgiving", "new year",
  "valentine", "mother's day", "father's day", "memorial day",
  "labor day", "4th of july", "independence day", "spring",
  "summer", "winter", "fall", "autumn", "holiday", "seasonal",
];

const TITLE_KEYWORD_CATEGORIES = {
  tool: ["tool", "tools", "app", "apps", "software", "plugin", "extension", "setup", "gear", "equipment"],
  mistake: ["mistake", "mistakes", "wrong", "fail", "fails", "avoid", "stop", "don't", "worst", "bad"],
  result: ["result", "results", "outcome", "happened", "transformation", "before and after", "progress", "growth"],
  time: ["day", "days", "week", "weeks", "month", "months", "year", "hours", "hour", "minutes", "minute"],
  number: [],
  howto: ["how to", "how i", "tutorial", "guide", "step by step", "walkthrough", "explained"],
  list: ["top", "best", "reasons", "tips", "things", "ways"],
  question: ["why", "what", "who", "when", "where", "which"],
  comparison: ["vs", "versus", "compared", "comparison", "better", "alternative"],
};

const HOOK_TEMPLATES = {
  resultFirst: (topic: string) => `I tested ${topic} for 30 days. Here's exactly what happened.`,
  mistake: (topic: string) => `The #1 mistake everyone makes with ${topic} — and the fix that actually works.`,
  contrarian: (topic: string) => `Everything you've been told about ${topic} is wrong. Here's what actually works.`,
  toolReveal: (topic: string) => `This one ${topic} changed everything for me. Nobody talks about it.`,
  curiosity: (topic: string) => `There's a reason most people fail at ${topic}. It's not what you think.`,
};

const POSTING_TIMES = ["9:00 AM", "11:00 AM", "1:00 PM", "3:00 PM", "5:00 PM"];

export function runFullAnalysis(
  videos: Video[],
  executions: Execution[],
  feedbackList: Feedback[],
  archetypeWeights: Record<string, number>,
  lastSync: string | null,
  minViewsThreshold: number = 100,
  scoringWeights: ScoringWeights = DEFAULT_SCORING_WEIGHTS
): AnalysisResult {
  if (!videos || videos.length < 3) {
    return emptyResult(videos?.length || 0, lastSync);
  }

  const now = Date.now();
  const avgViews = avg(videos.map(v => v.viewCount));
  const winnerThreshold = computeWinnerThreshold(videos);

  const winners = videos.filter(v => {
    const ratio = avgViews > 0 ? v.viewCount / avgViews : 0;
    return ratio >= winnerThreshold && v.viewCount >= minViewsThreshold;
  });

  const recentExecVideoIds = new Set(executions.slice(0, 15).map(e => e.videoId));
  const recentThemes = videos.slice(0, 5).map(v => v.theme).filter(Boolean);
  const recentFormats = videos.slice(0, 5).map(v => v.format).filter(Boolean);

  const winnerFeatures = extractWinnerFeatures(videos, winnerThreshold, minViewsThreshold);
  const seasonalInsights = detectSeasonality(videos, winnerThreshold);

  const opportunities: VideoOpportunity[] = videos.map(v => {
    const viewsRatio = avgViews > 0 ? v.viewCount / avgViews : 0;
    const pubDate = new Date(v.publishedAt).getTime();
    const freshnessDays = Math.max(1, Math.ceil((now - pubDate) / (1000 * 60 * 60 * 24)));
    const decayBucket = getDecayBucket(freshnessDays);
    const thumbnailScore = v.thumbnailScore || 0;
    const hookScore = v.hookScore || 0;

    const titleKeywords = extractTitleKeywords(v.title);
    const timeSensitive = checkTimeSensitive(v.notes, v.title);
    const similarityGroup = computeSimilarityGroup(v, videos);

    const themeCount = recentThemes.filter(t => t === v.theme).length;
    const isNovel = !recentThemes.includes(v.theme!) || !recentFormats.includes(v.format!);
    const wasRecentlyActioned = recentExecVideoIds.has(v.id);

    const repetitionPenalty = computeRepetitionPenalty(themeCount, wasRecentlyActioned, similarityGroup, executions);
    const noveltyScore = isNovel ? 1.0 : 0;

    const { classLabel, confidence, reasons, nextAction, diagnosis } = classifyVideo(
      v, viewsRatio, freshnessDays, timeSensitive, winnerThreshold,
      minViewsThreshold, thumbnailScore, hookScore, winnerFeatures,
      v.transcriptStatus === 'ready'
    );

    const scoreBreakdown = computeScoreBreakdown(
      viewsRatio, decayBucket, noveltyScore, thumbnailScore,
      repetitionPenalty, timeSensitive, hookScore,
      v.transcriptStatus === 'ready', scoringWeights
    );
    const opportunityScore = computeOpportunityScore(scoreBreakdown);

    const plan = generatePlan(
      v, classLabel, viewsRatio, freshnessDays, thumbnailScore,
      hookScore, titleKeywords, winnerFeatures, similarityGroup,
      winners
    );

    return {
      videoId: v.id,
      title: v.title,
      classLabel,
      confidence,
      reasons,
      plan,
      opportunityScore,
      scoreBreakdown,
      viewsRatio: Math.round(viewsRatio * 100) / 100,
      freshnessDays,
      decayBucket,
      thumbnailScore: Math.round(thumbnailScore),
      timeSensitive,
      similarityGroup,
      titleKeywords,
      nextAction,
      diagnosis,
    };
  });

  opportunities.sort((a, b) => b.opportunityScore - a.opportunityScore);

  const next7DaysPlan = buildNext7DaysPlan(opportunities, executions, winners);
  const warnings = generateWarnings(videos, opportunities, recentThemes, executions);
  const channelHealth = computeChannelHealth(videos, avgViews);

  const overallOpportunityScore = Math.min(100, Math.round(
    channelHealth.score * 0.3 +
    (opportunities[0]?.opportunityScore || 0) * 0.4 +
    (opportunities.filter(o => o.classLabel !== "Archive").length / Math.max(1, opportunities.length)) * 30
  ));

  return {
    opportunities,
    next7DaysPlan,
    warnings,
    channelHealth,
    overallOpportunityScore,
    videoCount: videos.length,
    lastSync,
    winnerCount: opportunities.filter(o => o.classLabel === "Evergreen").length,
    winnerThreshold: Math.round(winnerThreshold * 100) / 100,
    seasonalInsights,
    evergreenCount: opportunities.filter(o => o.classLabel === "Evergreen").length,
  };
}

function computeWinnerThreshold(videos: Video[]): number {
  const ratios = videos
    .map(v => v.viewCount)
    .sort((a, b) => b - a);
  const idx = Math.max(0, Math.floor(ratios.length * 0.2) - 1);
  const avgViews = avg(ratios);
  return avgViews > 0 ? ratios[idx] / avgViews : 1.5;
}

interface WinnerFeatures {
  commonKeywords: string[];
  commonThemes: string[];
  commonFormats: string[];
  avgThumbnailScore: number;
  avgHookScore: number;
}

function extractWinnerFeatures(videos: Video[], threshold: number, minViews: number): WinnerFeatures {
  const avgViews = avg(videos.map(v => v.viewCount));
  const winners = videos.filter(v => {
    const ratio = avgViews > 0 ? v.viewCount / avgViews : 0;
    return ratio >= threshold && v.viewCount >= minViews;
  });

  if (winners.length === 0) {
    return { commonKeywords: [], commonThemes: [], commonFormats: [], avgThumbnailScore: 0, avgHookScore: 0 };
  }

  const keywordCounts: Record<string, number> = {};
  const themeCounts: Record<string, number> = {};
  const formatCounts: Record<string, number> = {};

  for (const w of winners) {
    const kws = extractTitleKeywords(w.title);
    for (const kw of kws) {
      keywordCounts[kw] = (keywordCounts[kw] || 0) + 1;
    }
    if (w.theme) themeCounts[w.theme] = (themeCounts[w.theme] || 0) + 1;
    if (w.format) formatCounts[w.format] = (formatCounts[w.format] || 0) + 1;
  }

  const minOccurrences = Math.max(1, Math.floor(winners.length * 0.3));
  const commonKeywords = Object.entries(keywordCounts)
    .filter(([, c]) => c >= minOccurrences)
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k);

  const commonThemes = Object.entries(themeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t]) => t);

  const commonFormats = Object.entries(formatCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([f]) => f);

  return {
    commonKeywords,
    commonThemes,
    commonFormats,
    avgThumbnailScore: avg(winners.map(w => w.thumbnailScore || 0)),
    avgHookScore: avg(winners.map(w => w.hookScore || 0)),
  };
}

function extractTitleKeywords(title: string): string[] {
  const t = title.toLowerCase();
  const found: string[] = [];

  for (const [category, words] of Object.entries(TITLE_KEYWORD_CATEGORIES)) {
    if (category === "number") {
      if (/\b\d+\b/.test(t)) found.push("number");
      continue;
    }
    for (const word of words) {
      if (t.includes(word)) {
        found.push(category);
        break;
      }
    }
  }

  return Array.from(new Set(found));
}

function checkTimeSensitive(notes: string | null | undefined, title: string): boolean {
  const combined = `${notes || ""} ${title}`.toLowerCase();
  return TIME_SENSITIVE_KEYWORDS.some(kw => combined.includes(kw));
}

function isEventBased(notes: string | null | undefined, title: string): boolean {
  const combined = `${notes || ""} ${title}`.toLowerCase();
  return EVENT_KEYWORDS.some(kw => combined.includes(kw));
}

function isSeasonalContent(notes: string | null | undefined, title: string): boolean {
  const combined = `${notes || ""} ${title}`.toLowerCase();
  return SEASONAL_KEYWORDS.some(kw => combined.includes(kw));
}

function computeSimilarityGroup(video: Video, allVideos: Video[]): string {
  const keywords = extractTitleKeywords(video.title);
  const theme = video.theme || "General";
  const format = video.format || "Standard";

  const similar = allVideos.filter(other => {
    if (other.id === video.id) return false;
    if (other.theme === theme) {
      const otherKws = extractTitleKeywords(other.title);
      const overlap = keywords.filter(k => otherKws.includes(k)).length;
      return overlap >= 1;
    }
    return false;
  });

  if (similar.length > 0) {
    return `${theme}:${Array.from(keywords).sort().join("+")}`;
  }
  return `${theme}:${format}`;
}

function computeRepetitionPenalty(
  themeCount: number,
  wasRecentlyActioned: boolean,
  similarityGroup: string,
  executions: Execution[]
): number {
  let penalty = 0;
  penalty += Math.min(0.4, themeCount * 0.12);
  if (wasRecentlyActioned) penalty += 0.3;

  const recentExecDetails = executions.slice(0, 10);
  const recentSimilarExecs = recentExecDetails.filter(e => {
    const det = e.details as any;
    return det?.similarityGroup === similarityGroup;
  }).length;
  penalty += Math.min(0.2, recentSimilarExecs * 0.1);

  return Math.min(1.0, penalty);
}

function getDecayBucket(days: number): string {
  if (days <= 7) return "0-7";
  if (days <= 30) return "8-30";
  if (days <= 90) return "31-90";
  return "90+";
}

function getDecayScore(bucket: string): number {
  switch (bucket) {
    case "0-7": return 0.2;
    case "8-30": return 0.5;
    case "31-90": return 0.8;
    case "90+": return 1.0;
    default: return 0.5;
  }
}

function classifyVideo(
  v: Video,
  viewsRatio: number,
  freshnessDays: number,
  timeSensitive: boolean,
  winnerThreshold: number,
  minViews: number,
  thumbnailScore: number,
  hookScore: number,
  winnerFeatures: WinnerFeatures,
  hasTranscript: boolean = false
): { classLabel: ClassLabel; confidence: ConfidenceLevel; reasons: string[]; nextAction: string; diagnosis: string } {
  const reasons: string[] = [];
  const combined = `${v.notes || ""} ${v.title}`.toLowerCase();

  if (timeSensitive) {
    const now = new Date();
    const pubDate = new Date(v.publishedAt);
    const monthDiff = (now.getMonth() - pubDate.getMonth() + 12) % 12;
    const isAnniversaryWindow = monthDiff === 0 || monthDiff === 11;

    const eventBased = isEventBased(v.notes, v.title);
    const seasonal = isSeasonalContent(v.notes, v.title);

    if (eventBased) {
      if (isAnniversaryWindow) {
        reasons.push("This video is tied to a specific event.");
        reasons.push("It's near the anniversary — good window to resurface with a fresh angle.");
        const nextAction = "Create an anniversary or retrospective version of this event content.";
        const diagnosis = `Event-based content from ${pubDate.getFullYear()}. Currently in anniversary window — worth resurfacing with updated context.`;
        return { classLabel: "Event-Based", confidence: "Medium", reasons, nextAction, diagnosis };
      }
      reasons.push("This video is tied to a specific event that has passed.");
      reasons.push("Wait for the next relevant window to resurface.");
      const nextAction = "Hold until the next event cycle or anniversary window.";
      const diagnosis = `Event content tied to a specific occasion. Outside the active window — archiving to prevent stale recommendations.`;
      return { classLabel: "Archive", confidence: "High", reasons, nextAction, diagnosis };
    }

    if (seasonal) {
      if (isAnniversaryWindow) {
        reasons.push("Seasonal content currently in its relevant window.");
        reasons.push(`Originally published ${freshnessDays} days ago — audience likely receptive to a refresh.`);
        const nextAction = "Resurface this seasonal content now with updated packaging.";
        const diagnosis = `Seasonal content from ${pubDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}. It's the right time of year to bring this back.`;
        return { classLabel: "Seasonal", confidence: "High", reasons, nextAction, diagnosis };
      }
      reasons.push("Seasonal content outside its active window.");
      reasons.push("Will automatically resurface when the season approaches.");
      const nextAction = "No action needed now. This will be flagged when the season returns.";
      const diagnosis = `Seasonal content — not currently in season. Archived until the right time.`;
      return { classLabel: "Archive", confidence: "High", reasons, nextAction, diagnosis };
    }

    if (!isAnniversaryWindow) {
      reasons.push("Content references a time-sensitive topic.");
      reasons.push("Not within an anniversary window — archiving to prevent stale recommendations.");
      const nextAction = "No action needed. Will be reconsidered near its anniversary.";
      const diagnosis = "Time-sensitive content that's currently out of season.";
      return { classLabel: "Archive", confidence: "High", reasons, nextAction, diagnosis };
    }
    reasons.push("Time-sensitive content but within anniversary window — still actionable.");
  }

  const isWinner = viewsRatio >= winnerThreshold && v.viewCount >= minViews;

  if (isWinner && freshnessDays > 30) {
    reasons.push(`This video reached ${viewsRatio.toFixed(1)}x your channel average — that's top 20% performance.`);
    reasons.push(`Published ${freshnessDays} days ago, so your audience has had time to forget it.`);
    if (thumbnailScore > 60) reasons.push(`Strong thumbnail (score: ${Math.round(thumbnailScore)}/100).`);
    if (hasTranscript) reasons.push("Transcript confirms a strong opening hook.");
    const nextAction = "Repost this with fresh packaging, or create a sequel expanding on the best-performing angle.";
    const diagnosis = `Proven winner — consistently outperforms your other content. Ready for repost, repurpose, or sequel.`;
    return { classLabel: "Evergreen", confidence: "High", reasons, nextAction, diagnosis };
  }

  if (viewsRatio >= 1.0 && freshnessDays > 14) {
    reasons.push(`Above-average performance at ${viewsRatio.toFixed(1)}x your channel average.`);
    reasons.push(`${freshnessDays} days old — your audience has had time to forget it.`);
    if (isWinner) reasons.push("This is a winner-tier video.");
    const conf: ConfidenceLevel = viewsRatio >= 1.5 ? "High" : "Medium";
    const nextAction = "Repost with a new hook and updated thumbnail. The topic is proven.";
    const diagnosis = `Solid performer that earned above-average engagement. Good candidate for a repost cycle.`;
    return { classLabel: "Evergreen", confidence: conf, reasons, nextAction, diagnosis };
  }

  if (viewsRatio < 0.8 && freshnessDays < 60) {
    reasons.push(`This video underperformed at ${viewsRatio.toFixed(1)}x your average.`);

    const weakHook = hookScore > 0 && hookScore < 40;
    const weakThumb = thumbnailScore > 0 && thumbnailScore < 40;

    const titleKws = extractTitleKeywords(v.title);
    const winnerKwOverlap = titleKws.filter(k => winnerFeatures.commonKeywords.includes(k)).length;

    if (weakHook && !weakThumb) {
      reasons.push(`The hook scored only ${Math.round(hookScore)}/100 — viewers likely dropped off early.`);
      if (winnerKwOverlap > 0) reasons.push("The topic overlaps with your winners, so the idea has potential.");
      const nextAction = "Rewrite the opening 5-10 seconds with a stronger hook. Lead with a result or bold claim.";
      const diagnosis = `Good topic, weak opening. The hook didn't grab attention — fix the intro and retry.`;
      return { classLabel: "Retry-Hook", confidence: "Medium", reasons, nextAction, diagnosis };
    }

    if (!weakHook && freshnessDays < 7) {
      reasons.push("This video is still very fresh — it may not have had time to find its audience.");
      const nextAction = "Wait a few more days before making changes. Check back after the algorithm has had time to distribute it.";
      const diagnosis = `Too early to judge. Give it at least a week before deciding on next steps.`;
      return { classLabel: "Retry-Timing", confidence: "Low", reasons, nextAction, diagnosis };
    }

    const pubHour = new Date(v.publishedAt).getHours();
    const isOffPeakHour = pubHour < 8 || pubHour > 22;

    if (isOffPeakHour || freshnessDays < 14) {
      reasons.push(isOffPeakHour
        ? `Published at ${pubHour}:00 — likely outside your audience's peak hours.`
        : `Only ${freshnessDays} days old — might benefit from reposting at a better time.`);
      const nextAction = "Repost at a peak time based on your best performers' publishing patterns.";
      const diagnosis = `Timing may have held this back. The content could perform better with strategic reposting.`;
      return { classLabel: "Retry-Timing", confidence: "Medium", reasons, nextAction, diagnosis };
    }

    if (weakHook || weakThumb) {
      const issues: string[] = [];
      if (weakHook) issues.push("weak hook");
      if (weakThumb) issues.push("low-impact thumbnail");
      reasons.push(`Identified fixable issues: ${issues.join(", ")}.`);
      const nextAction = weakHook
        ? "Rewrite the hook — lead with a surprising stat or bold claim instead of context-setting."
        : "Redesign the thumbnail with bolder colors, a face close-up, or cleaner text.";
      const diagnosis = `Underperformed due to packaging issues. The idea may have merit — fix the ${issues.join(" and ")} and retry.`;
      return { classLabel: "Retry-Hook", confidence: "Medium", reasons, nextAction, diagnosis };
    }

    reasons.push("Underperformed without a clear single cause.");
    const nextAction = "Consider restructuring this content with a different angle or format.";
    const diagnosis = "Multiple factors contributed to underperformance. May need a complete rethink.";
    return { classLabel: "Retry-Hook", confidence: "Low", reasons, nextAction, diagnosis };
  }

  if (viewsRatio < 0.8) {
    reasons.push(`Underperformed at ${viewsRatio.toFixed(1)}x your average.`);

    const titleKws = extractTitleKeywords(v.title);
    const mismatches: string[] = [];
    if (winnerFeatures.commonThemes.length > 0 && !winnerFeatures.commonThemes.includes(v.theme || "")) {
      mismatches.push(`theme "${v.theme}" doesn't match your winning themes (${winnerFeatures.commonThemes.join(", ")})`);
    }
    if (winnerFeatures.commonFormats.length > 0 && !winnerFeatures.commonFormats.includes(v.format || "")) {
      mismatches.push(`format "${v.format}" differs from your best-performing formats`);
    }
    if (thumbnailScore > 0 && thumbnailScore < winnerFeatures.avgThumbnailScore * 0.7) {
      mismatches.push("thumbnail quality below winner average");
    }

    if (mismatches.length > 0) {
      reasons.push(`Structural mismatches vs. your winners: ${mismatches.join("; ")}.`);
      reasons.push("This content would need a different framing to match what works for your channel.");
      const nextAction = "Restructure with a format and angle that matches your proven winners.";
      const diagnosis = `The packaging and structure don't match your winning formula. Needs a rethink, not just a retry.`;
      return { classLabel: "Archive", confidence: "Medium", reasons, nextAction, diagnosis };
    }

    reasons.push("Too old for a retry. Patterns may be reusable in new content.");
    const nextAction = "Extract the best ideas from this video and use them in future content.";
    const diagnosis = "Old underperformer. Better to mine it for ideas than to resurface it.";
    return { classLabel: "Archive", confidence: "Low", reasons, nextAction, diagnosis };
  }

  reasons.push(`Average performance (${viewsRatio.toFixed(1)}x). Could repost with improved packaging.`);
  const nextAction = "Try reposting with a stronger hook and fresh thumbnail.";
  const diagnosis = "Middle-of-the-road performer. Worth a repost attempt with better packaging.";
  return { classLabel: "Evergreen", confidence: "Low", reasons, nextAction, diagnosis };
}

function computeScoreBreakdown(
  viewsRatio: number,
  decayBucket: string,
  noveltyScore: number,
  thumbnailScore: number,
  repetitionPenalty: number,
  timeSensitive: boolean,
  hookScore: number,
  hasTranscript: boolean = false,
  weights: ScoringWeights = DEFAULT_SCORING_WEIGHTS
): ScoreBreakdown {
  const viewsRatioScore = Math.min(30, viewsRatio * 15) * weights.views_weight;
  const decayScore = getDecayScore(decayBucket) * 20 * weights.timing_weight;
  const noveltyScoreWeighted = noveltyScore * 10 * weights.novelty_weight;
  const thumbnailQualityScore = (thumbnailScore / 100) * 15 * weights.thumbnail_weight;
  const repetitionPenaltyWeighted = repetitionPenalty * 15;
  const timeSensitivePenalty = timeSensitive ? 10 : 0;
  const hookQualityScore = (hookScore / 100) * 10 * weights.hook_weight;

  const explanation: string[] = [];
  if (viewsRatioScore >= 20) explanation.push("Strong view performance drives this score up.");
  else if (viewsRatioScore < 10) explanation.push("Below-average views pull this score down.");
  if (decayScore >= 16) explanation.push("Old enough for the audience to have forgotten — good repost timing.");
  else if (decayScore <= 6) explanation.push("Published recently — let it breathe before acting.");
  if (noveltyScoreWeighted > 0) explanation.push("Uncommon theme/format combo adds novelty bonus.");
  if (thumbnailQualityScore >= 10) explanation.push("Thumbnail has strong visual impact.");
  else if (thumbnailScore > 0 && thumbnailQualityScore < 5) explanation.push("Weak thumbnail — consider redesigning.");
  if (repetitionPenaltyWeighted > 5) explanation.push("Similar content was recently recommended or executed.");
  if (timeSensitivePenalty > 0) explanation.push("Time-sensitive content gets deprioritized.");

  if (hasTranscript) {
    if (hookQualityScore >= 7) explanation.push("Transcript analysis confirms a high-impact opening.");
    else if (hookScore > 0 && hookQualityScore < 3) explanation.push("Transcript reveals a slow start — consider a sharper hook.");
  } else {
    if (hookQualityScore >= 7) explanation.push("Description suggests engaging opening language.");
    else if (hookScore > 0 && hookQualityScore < 3) explanation.push("Hook analysis suggests weak opening — reframe the intro.");
  }

  return {
    viewsRatioScore: round2(viewsRatioScore),
    decayScore: round2(decayScore),
    noveltyScore: round2(noveltyScoreWeighted),
    thumbnailQualityScore: round2(thumbnailQualityScore),
    repetitionPenalty: round2(repetitionPenaltyWeighted),
    timeSensitivePenalty,
    hookQualityScore: round2(hookQualityScore),
    explanation,
  };
}

function computeOpportunityScore(breakdown: ScoreBreakdown): number {
  const raw =
    breakdown.viewsRatioScore +
    breakdown.decayScore +
    breakdown.noveltyScore +
    breakdown.thumbnailQualityScore +
    breakdown.hookQualityScore -
    breakdown.repetitionPenalty -
    breakdown.timeSensitivePenalty;
  return Math.round(Math.max(0, Math.min(100, raw)));
}

function generatePlan(
  v: Video,
  classLabel: ClassLabel,
  viewsRatio: number,
  freshnessDays: number,
  thumbnailScore: number,
  hookScore: number,
  titleKeywords: string[],
  winnerFeatures: WinnerFeatures,
  similarityGroup: string,
  winners: Video[] = []
): VideoPlan {
  const topic = extractTopicFromTitle(v.title);
  const hookVariants = generateDeterministicHooks(topic, titleKeywords);
  const hashtagPack = generateHashtags(v.theme || "General", titleKeywords);
  const scheduleSlots = generateScheduleSlots(winners);

  const basePlan: VideoPlan = {
    classLabel,
    scheduleSlots,
    hookVariants,
    captionStarter: "",
    ctaVariants: [],
    hashtagPack,
    reasons: [],
  };

  switch (classLabel) {
    case "Evergreen":
      if (viewsRatio >= 1.5) {
        const sequelIdeas = generateSequelIdeas(v.title, titleKeywords);
        return {
          ...basePlan,
          captionStarter: `This is one of my best-performing videos for a reason. Here's the updated take on ${topic}...`,
          ctaVariants: [
            "Follow for more deep dives like this.",
            "Bookmark this — it's a reference you'll come back to.",
            "Drop a question below and I might make a follow-up.",
          ],
          reasons: [
            `Top performer at ${viewsRatio.toFixed(1)}x your channel average.`,
            `Topic "${topic}" resonates strongly with your audience.`,
          ],
          repostCadence: freshnessDays > 180 ? "Can repost every 3-4 months safely." : "Repost in 2-3 months for maximum impact.",
          repurposePlan: [
            "Extract 3 key points as standalone short-form clips.",
            "Create a carousel/thread version for text-based platforms.",
            "Record a follow-up expanding on the most-commented subtopic.",
          ],
          sequelIdeas,
        };
      }
      return {
        ...basePlan,
        captionStarter: `Revisiting one of my best-performing pieces on ${topic}...`,
        ctaVariants: [
          "Save this for later — you'll thank yourself.",
          "Comment your biggest takeaway below.",
          "Tag someone who needs to see this.",
        ],
        reasons: [
          `${viewsRatio.toFixed(1)}x your average — proven topic.`,
          `${freshnessDays} days old — enough time for audience refresh.`,
        ],
      };

    case "Retry-Hook": {
      const specificChanges: string[] = [];
      if (hookScore < 40 && hookScore > 0) specificChanges.push("Rewrite the hook — lead with a result or bold claim instead of context-setting.");
      else specificChanges.push("Open with a surprising stat or counterintuitive statement.");
      if (thumbnailScore < 40 && thumbnailScore > 0) specificChanges.push("Redesign thumbnail: increase contrast, add a face close-up, use bolder text.");
      else specificChanges.push("Test a new thumbnail angle — different color scheme or composition.");
      specificChanges.push("Cut the first 15 seconds in half — get to the point faster.");
      return {
        ...basePlan,
        captionStarter: `I revisited ${topic} because the first version didn't land the way it should have...`,
        ctaVariants: [
          "Did this version resonate more? Let me know below.",
          "Share if this actually helped.",
          "What would you add to this?",
        ],
        reasons: [
          `Only reached ${viewsRatio.toFixed(1)}x your average.`,
          hookScore > 0 && hookScore < 40 ? `Hook scored ${Math.round(hookScore)}/100 — opening likely lost viewers.` : "Hook needs stronger opening language.",
          thumbnailScore > 0 && thumbnailScore < 40 ? `Thumbnail scored ${Math.round(thumbnailScore)}/100 — likely low click-through rate.` : "Thumbnail may need more visual punch.",
        ],
        specificChanges,
      };
    }

    case "Retry-Timing":
      return {
        ...basePlan,
        captionStarter: `Giving ${topic} another shot at a better time...`,
        ctaVariants: [
          "Save this for later — you'll thank yourself.",
          "Comment if you've experienced this too.",
          "Share with someone who needs this.",
        ],
        reasons: [
          `Published at a suboptimal time or still too fresh to judge.`,
          `The content itself may be solid — timing could be the main issue.`,
        ],
        specificChanges: [
          "Repost during peak hours based on your audience's activity patterns.",
          "Consider a different day of the week — your winners tend to post on specific days.",
          "If reposting, update the thumbnail to make it feel fresh.",
        ],
      };

    case "Seasonal":
      return {
        ...basePlan,
        captionStarter: `It's that time of year again — here's my updated take on ${topic}...`,
        ctaVariants: [
          "Share this with someone planning for the season.",
          "What's your approach this year? Comment below.",
          "Save this for when you need it.",
        ],
        reasons: [
          "Seasonal content currently in its active window.",
          `Originally performed at ${viewsRatio.toFixed(1)}x your average.`,
        ],
        anniversaryNote: "This content is seasonal. It will only be recommended during its relevant time window.",
        specificChanges: [
          "Update any dates or references to reflect the current year.",
          "Add a note in the caption acknowledging it's an updated version.",
          "Consider a fresh thumbnail with current year or season reference.",
        ],
      };

    case "Event-Based":
      return {
        ...basePlan,
        captionStarter: `Looking back at ${topic} — here's what still holds up...`,
        ctaVariants: [
          "Did you watch the original? How does this compare?",
          "Tag someone who was there.",
          "What should I cover next?",
        ],
        reasons: [
          "Event-based content in its anniversary window.",
          "Audiences are receptive to retrospectives and callbacks.",
        ],
        anniversaryNote: "This content is tied to a specific event. Only recommended during anniversary windows.",
        specificChanges: [
          "Frame as a retrospective or anniversary callback.",
          "Add new insights or developments since the original event.",
          "Use a 'then vs now' angle for maximum engagement.",
        ],
      };

    case "Archive":
      return {
        ...basePlan,
        scheduleSlots: [],
        captionStarter: "",
        ctaVariants: [],
        reasons: ["Content is outside its active window or consistently underperformed."],
        archiveReason: checkTimeSensitive(v.notes, v.title)
          ? "This content references a time-sensitive event. Reposting would feel dated or irrelevant."
          : "This content has consistently underperformed. Better to extract lessons and move on.",
        extractedPattern: viewsRatio > 1.0
          ? `Despite being archived, this topic resonated (${viewsRatio.toFixed(1)}x average). Consider creating an evergreen version that removes the time-specific angle.`
          : "Focus energy on content that matches your winning patterns.",
      };
  }
}

function generateDeterministicHooks(topic: string, titleKeywords: string[]): string[] {
  const hooks: string[] = [];

  if (titleKeywords.includes("result") || titleKeywords.includes("time")) {
    hooks.push(HOOK_TEMPLATES.resultFirst(topic));
  }
  if (titleKeywords.includes("mistake")) {
    hooks.push(HOOK_TEMPLATES.mistake(topic));
  }
  if (titleKeywords.includes("comparison") || titleKeywords.includes("question")) {
    hooks.push(HOOK_TEMPLATES.contrarian(topic));
  }
  if (titleKeywords.includes("tool")) {
    hooks.push(HOOK_TEMPLATES.toolReveal(topic));
  }

  hooks.push(HOOK_TEMPLATES.curiosity(topic));

  if (hooks.length < 3) {
    if (!hooks.some(h => h.includes("tested"))) hooks.push(HOOK_TEMPLATES.resultFirst(topic));
    if (!hooks.some(h => h.includes("mistake"))) hooks.push(HOOK_TEMPLATES.mistake(topic));
  }

  return hooks.slice(0, 3);
}

function generateHashtags(theme: string, titleKeywords: string[]): string[] {
  const tags = [`#${theme.replace(/\s/g, "")}`];
  if (titleKeywords.includes("howto")) tags.push("#HowTo");
  if (titleKeywords.includes("tool")) tags.push("#Tools");
  if (titleKeywords.includes("mistake")) tags.push("#LearnFromMistakes");
  if (titleKeywords.includes("result")) tags.push("#Results");
  if (titleKeywords.includes("list")) tags.push("#TopPicks");
  tags.push("#CreatorTips", "#ContentStrategy");
  return Array.from(new Set(tags)).slice(0, 6);
}

export function detectSeasonality(videos: Video[], winnerThreshold: number): string[] {
  const avgViews = avg(videos.map(v => v.viewCount));
  const winners = videos.filter(v => {
    const ratio = avgViews > 0 ? v.viewCount / avgViews : 0;
    return ratio >= winnerThreshold;
  });

  const insights: string[] = [];
  if (winners.length === 0) return insights;

  const monthCounts: Record<number, number> = {};
  for (const w of winners) {
    const month = new Date(w.publishedAt).getMonth();
    monthCounts[month] = (monthCounts[month] || 0) + 1;
  }

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  for (const [month, count] of Object.entries(monthCounts)) {
    if (count >= 3) {
      insights.push(`Seasonal Peak: ${monthNames[parseInt(month)]} historically yields more winners for you.`);
    }
  }

  const now = new Date();
  const currentMonth = now.getMonth();
  const windowMonths = [(currentMonth - 1 + 12) % 12, currentMonth, (currentMonth + 1) % 12];

  const anniversaryWinners = winners.filter(w => {
    const pubDate = new Date(w.publishedAt);
    const pubMonth = pubDate.getMonth();
    const pubYear = pubDate.getFullYear();
    return windowMonths.includes(pubMonth) && pubYear < now.getFullYear();
  });

  if (anniversaryWinners.length > 0) {
    const topWinner = anniversaryWinners.sort((a, b) => b.viewCount - a.viewCount)[0];
    insights.push(`Anniversary Opportunity: "${topWinner.title}" performed well around this time in ${new Date(topWinner.publishedAt).getFullYear()}. Consider a spiritual sequel or refresh.`);
  }

  return insights;
}

function generateScheduleSlots(winners: Video[] = []): ScheduleSlot[] {
  const slots: ScheduleSlot[] = [];
  const now = new Date();

  let bestTimes = POSTING_TIMES;
  if (winners.length >= 5) {
    const hourCounts: Record<number, number> = {};
    for (const w of winners) {
      const date = new Date(w.publishedAt);
      const hour = date.getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }

    const sortedHours = Object.entries(hourCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([h]) => parseInt(h));

    if (sortedHours.length > 0) {
      bestTimes = sortedHours.map(h => {
        const period = h >= 12 ? "PM" : "AM";
        const hour = h % 12 || 12;
        return `${hour}:00 ${period}`;
      });
    }
  }

  for (let i = 1; i <= 7; i++) {
    const day = new Date(now);
    day.setDate(day.getDate() + i);
    const dayName = day.toLocaleDateString("en-US", { weekday: "long" });
    const dateStr = day.toISOString().split("T")[0];
    const timeIdx = (i - 1) % bestTimes.length;

    slots.push({
      day: `${dayName}, ${dateStr}`,
      time: bestTimes[timeIdx],
      label: i <= 2 ? "Prime slot" : i <= 5 ? "Good slot" : "Backup slot",
    });
  }

  return slots;
}

function generateSequelIdeas(title: string, keywords: string[]): string[] {
  const topic = extractTopicFromTitle(title);
  const ideas: string[] = [];

  if (keywords.includes("howto")) {
    ideas.push(`"Advanced ${topic}" — go deeper for your engaged audience.`);
    ideas.push(`"${topic} mistakes" — flip the angle to what NOT to do.`);
  } else if (keywords.includes("mistake")) {
    ideas.push(`"How to actually do ${topic} right" — the positive counterpart.`);
    ideas.push(`"${topic} checklist" — turn lessons into an actionable format.`);
  } else {
    ideas.push(`"${topic}: Part 2" — continue the narrative with new findings.`);
    ideas.push(`"The ${topic} update" — revisit with fresh data or experience.`);
  }

  return ideas;
}

function buildNext7DaysPlan(opportunities: VideoOpportunity[], executions: Execution[], winners: Video[] = []): ScheduleSlot[] {
  const actionable = opportunities
    .filter(o => o.classLabel !== "Archive" && o.opportunityScore > 20)
    .slice(0, 7);

  const plan: ScheduleSlot[] = [];
  const now = new Date();

  let bestTimes = POSTING_TIMES;
  if (winners.length >= 5) {
    const hourCounts: Record<number, number> = {};
    for (const w of winners) {
      const date = new Date(w.publishedAt);
      const hour = date.getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }

    const sortedHours = Object.entries(hourCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([h]) => parseInt(h));

    if (sortedHours.length > 0) {
      bestTimes = sortedHours.map(h => {
        const period = h >= 12 ? "PM" : "AM";
        const hour = h % 12 || 12;
        return `${hour}:00 ${period}`;
      });
    }
  }

  for (let i = 0; i < Math.min(7, actionable.length); i++) {
    const day = new Date(now);
    day.setDate(day.getDate() + i + 1);
    const dayName = day.toLocaleDateString("en-US", { weekday: "long" });
    const dateStr = day.toISOString().split("T")[0];
    const opp = actionable[i];

    plan.push({
      day: `${dayName}, ${dateStr}`,
      time: bestTimes[i % bestTimes.length],
      label: `${opp.classLabel}: "${opp.title.slice(0, 40)}${opp.title.length > 40 ? "..." : ""}" (Score: ${opp.opportunityScore})`,
    });
  }

  return plan;
}

function generateWarnings(
  videos: Video[],
  opportunities: VideoOpportunity[],
  recentThemes: (string | null)[],
  executions: Execution[]
): string[] {
  const warnings: string[] = [];
  const avgViews = avg(videos.map(v => v.viewCount));

  if (videos.length > 0 && videos[0].viewCount < avgViews * 0.5) {
    warnings.push("Your last video significantly underperformed. Review the hook and thumbnail before posting again.");
  }

  const uniqueThemes = new Set(recentThemes.filter(Boolean));
  if (recentThemes.length >= 3 && uniqueThemes.size <= 1) {
    warnings.push("Your last 3+ videos are the same theme. Audience fatigue is likely — diversify your next post.");
  } else if (recentThemes.length >= 3 && uniqueThemes.size <= 2) {
    warnings.push("Low theme variety in recent content. Consider mixing in a different format or topic.");
  }

  const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
  const hasRecentExec = executions.some(e => new Date(e.executedAt).getTime() > threeDaysAgo);
  if (!hasRecentExec && executions.length > 0) {
    warnings.push("No growth actions taken in 3+ days. Consistency compounds — pick one action today.");
  }

  const archiveCount = opportunities.filter(o => o.classLabel === "Archive").length;
  if (archiveCount > opportunities.length * 0.3) {
    warnings.push(`${archiveCount} of your videos are time-sensitive and archived. Focus on creating more evergreen content.`);
  }

  const lowThumbnails = opportunities.slice(0, 5).filter(o => o.thumbnailScore > 0 && o.thumbnailScore < 30);
  if (lowThumbnails.length >= 3) {
    warnings.push("Multiple recent thumbnails scored below 30/100. Consider bolder colors, faces, and cleaner text.");
  }

  return warnings;
}

function computeChannelHealth(videos: Video[], avgViews: number): {
  score: number; trend: "up" | "down" | "flat"; label: string; details: string;
} {
  const recent5 = videos.slice(0, 5);
  const recentAvg = avg(recent5.map(v => v.viewCount));
  let trend: "up" | "down" | "flat" = "flat";
  let healthScore = 50;

  if (avgViews > 0) {
    const ratio = recentAvg / avgViews;
    if (ratio > 1.2) trend = "up";
    else if (ratio < 0.8) trend = "down";
    healthScore = Math.min(100, Math.max(0, Math.round(ratio * 50)));
  }

  return {
    score: healthScore,
    trend,
    label: trend === "up" ? "Growing" : trend === "down" ? "Needs Attention" : "Steady",
    details: `Recent 5 videos average (${formatNum(recentAvg)}) vs historical average (${formatNum(avgViews)}).`,
  };
}

function extractTopicFromTitle(title: string): string {
  const cleaned = title
    .replace(/[#|]/g, "")
    .replace(/\b(how to|why|what|the|a|an|my|i|we)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  const words = cleaned.split(" ").slice(0, 5);
  return words.join(" ") || "this topic";
}

function emptyResult(videoCount: number, lastSync: string | null): AnalysisResult {
  return {
    opportunities: [],
    next7DaysPlan: [],
    warnings: ["Need at least 3 videos to generate analysis. Sync your channel first."],
    channelHealth: { score: 0, trend: "flat", label: "Need Data", details: "Connect YouTube and sync to generate your intelligence brief." },
    overallOpportunityScore: 0,
    videoCount,
    lastSync,
    winnerCount: 0,
    winnerThreshold: 0,
    seasonalInsights: [],
    evergreenCount: 0,
  };
}

function avg(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatNum(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return Math.round(num).toString();
}

export function adjustWeightsFromFeedback(
  currentWeights: Record<string, number>,
  feedbackList: Feedback[],
  executions: Execution[]
): Record<string, number> {
  const weights = { ...currentWeights };
  const recentFeedback = feedbackList.slice(0, 20);

  const typeResults: Record<string, { better: number; worse: number; same: number }> = {};

  for (const fb of recentFeedback) {
    const exec = executions.find(e => e.id === fb.executionId);
    if (!exec) continue;
    const baseType = exec.type.replace("primary_", "").replace(/_/g, "").toLowerCase();
    const mapped = baseType.includes("newangle") || baseType.includes("restructure") ? "newAngle"
      : baseType.includes("fix") || baseType.includes("retry") ? "fix"
      : "repost";

    if (!typeResults[mapped]) typeResults[mapped] = { better: 0, worse: 0, same: 0 };
    if (fb.result === "better") typeResults[mapped].better++;
    else if (fb.result === "worse") typeResults[mapped].worse++;
    else typeResults[mapped].same++;
  }

  for (const [type, counts] of Object.entries(typeResults)) {
    const total = counts.better + counts.worse + counts.same;
    if (total < 2) continue;
    const netSignal = (counts.better - counts.worse) / total;
    const currentWeight = weights[type] || 1.0;
    weights[type] = Math.max(0.3, Math.min(2.0, currentWeight + netSignal * 0.1));
  }

  return weights;
}

export function computeAdaptiveScoringWeights(
  currentWeights: ScoringWeights,
  executions: Execution[]
): ScoringWeights {
  const withPerf = executions.filter(e => e.actualViews != null && e.predictedLift != null);
  if (withPerf.length < 3) return currentWeights;

  const weights = { ...currentWeights };

  let totalDelta = 0;
  let hookCorrelation = 0;
  let timingCorrelation = 0;
  let thumbCorrelation = 0;

  for (const exec of withPerf.slice(0, 20)) {
    const details = exec.details as any;
    if (!details?.scoreBreakdown) continue;

    const actualLift = exec.predictedLift && exec.predictedLift > 0
      ? (exec.actualViews || 0) / exec.predictedLift
      : 1.0;
    const delta = actualLift - 1.0;
    totalDelta += delta;

    const bd = details.scoreBreakdown;
    if (bd.hookQualityScore > 5 && delta > 0) hookCorrelation += 0.02;
    if (bd.hookQualityScore < 3 && delta < 0) hookCorrelation -= 0.02;
    if (bd.decayScore > 15 && delta > 0) timingCorrelation += 0.02;
    if (bd.decayScore < 5 && delta < 0) timingCorrelation -= 0.02;
    if (bd.thumbnailQualityScore > 10 && delta > 0) thumbCorrelation += 0.02;
    if (bd.thumbnailQualityScore < 5 && delta < 0) thumbCorrelation -= 0.02;
  }

  weights.hook_weight = Math.max(0.5, Math.min(1.5, weights.hook_weight + hookCorrelation));
  weights.timing_weight = Math.max(0.5, Math.min(1.5, weights.timing_weight + timingCorrelation));
  weights.thumbnail_weight = Math.max(0.5, Math.min(1.5, weights.thumbnail_weight + thumbCorrelation));

  return weights;
}
