import type { Video, Execution, Feedback } from "@shared/schema";
import { generateHookVariants } from "./hooks";

export interface PostPackage {
  why: string;
  diagnosis: string;
  actionPlan: string;
  confidence: "High" | "Medium" | "Experimental";
  hook: string;
  hookVariants: string[];
  captionStarter: string;
  ctaVariants: string[];
  hashtags: string;
  opportunityScore: number;
  scoreBreakdown: {
    performanceRatio: number;
    freshness: number;
    hookQuality: number;
    thumbnailQuality: number;
    novelty: number;
    fatiguePenalty: number;
  };
}

export interface ActionFeedItem {
  section: "doThisNext" | "repost" | "fixRetry" | "newAngle";
  title: string;
  badge: string;
  badgeColor: string;
  video?: Video;
  package: PostPackage;
}

export interface ActionFeed {
  momentum: {
    score: number;
    trend: "up" | "down" | "flat";
    label: string;
    details: string;
  };
  items: ActionFeedItem[];
  warnings: string[];
  gameplan: string[];
  overallOpportunityScore: number;
  videoCount: number;
  lastSync: string | null;
}

interface ScoredVideo {
  video: Video;
  freshnessDays: number;
  decayMultiplier: number;
  performanceRatio: number;
  hookScore: number;
  thumbnailScore: number;
  noveltyScore: number;
  fatiguePenalty: number;
  compositeScore: number;
}

export function generateActionFeed(
  videos: Video[],
  executions: Execution[],
  feedbackList: Feedback[],
  archetypeWeights: Record<string, number>,
  lastSync: string | null
): ActionFeed {
  if (!videos || videos.length < 3) {
    return emptyFeed(videos?.length || 0, lastSync);
  }

  const avgViews = avg(videos.map(v => v.viewCount));
  const now = Date.now();

  const scored: ScoredVideo[] = videos.map(v => {
    const pubDate = new Date(v.publishedAt).getTime();
    const freshnessDays = Math.max(1, Math.ceil((now - pubDate) / (1000 * 60 * 60 * 24)));
    const decayMultiplier = getDecayMultiplier(freshnessDays);
    const performanceRatio = avgViews > 0 ? v.viewCount / avgViews : 0;
    const hookScore = v.hookScore || 0;
    const thumbnailScore = v.thumbnailScore || 0;

    const recentThemes = videos.slice(0, 5).map(rv => rv.theme);
    const themeCount = recentThemes.filter(t => t === v.theme).length;
    const fatiguePenalty = Math.min(0.5, themeCount * 0.15);

    const recentFormats = videos.slice(0, 5).map(rv => rv.format);
    const isNovel = !recentThemes.includes(v.theme) || !recentFormats.includes(v.format);
    const noveltyScore = isNovel ? 0.3 : 0;

    const recentExecVideoIds = executions.slice(0, 10).map(e => e.videoId);
    const wasRecentlyActioned = recentExecVideoIds.includes(v.id);
    const executionPenalty = wasRecentlyActioned ? 0.3 : 0;

    const compositeScore =
      performanceRatio * 0.3 * (archetypeWeights.repost || 1) +
      (hookScore / 100) * 0.15 +
      (thumbnailScore / 100) * 0.1 +
      decayMultiplier * 0.15 +
      noveltyScore * 0.1 -
      fatiguePenalty -
      executionPenalty;

    return {
      video: v,
      freshnessDays,
      decayMultiplier,
      performanceRatio,
      hookScore,
      thumbnailScore,
      noveltyScore,
      fatiguePenalty,
      compositeScore,
    };
  });

  scored.sort((a, b) => b.compositeScore - a.compositeScore);

  const recent5 = videos.slice(0, 5);
  const recentAvg = avg(recent5.map(v => v.viewCount));
  let trend: "up" | "down" | "flat" = "flat";
  let momentumScore = 50;
  if (avgViews > 0) {
    const ratio = recentAvg / avgViews;
    if (ratio > 1.2) trend = "up";
    else if (ratio < 0.8) trend = "down";
    momentumScore = Math.min(100, Math.max(0, Math.round(ratio * 50)));
  }

  const repostCandidates = scored.filter(s =>
    s.freshnessDays > 14 &&
    s.performanceRatio > 1.0 &&
    !isEventBased(s.video.notes)
  );
  const repostTarget = repostCandidates[0] || scored[0];

  const fixCandidates = scored
    .filter(s => s.performanceRatio < 0.8 && s.freshnessDays < 60)
    .sort((a, b) => a.performanceRatio - b.performanceRatio);
  const fixTarget = fixCandidates[0] || scored[scored.length - 1];

  const recentThemes = videos.slice(0, 5).map(v => v.theme);
  const allThemes = ["Tutorial", "Review", "Analysis", "Vlog", "Story", "Interview", "Behind the Scenes", "Listicle"];
  const newAngleTheme = allThemes.find(t => !recentThemes.includes(t)) || "Contra-narrative";

  const repostPkg = buildRepostPackage(repostTarget, avgViews, archetypeWeights);
  const fixPkg = buildFixPackage(fixTarget, avgViews, archetypeWeights);
  const newAnglePkg = buildNewAnglePackage(newAngleTheme, scored, archetypeWeights);

  let primaryItem: ActionFeedItem;
  if (momentumScore < 40) {
    primaryItem = {
      section: "doThisNext",
      title: "Break the Pattern",
      badge: "Do This First",
      badgeColor: "primary",
      package: newAnglePkg,
    };
  } else {
    primaryItem = {
      section: "doThisNext",
      title: "High-Probability Repost",
      badge: "Do This First",
      badgeColor: "primary",
      video: repostTarget.video,
      package: repostPkg,
    };
  }

  const items: ActionFeedItem[] = [primaryItem];

  if (primaryItem.section === "doThisNext" && primaryItem.video?.id !== repostTarget.video.id) {
    items.push({
      section: "repost",
      title: "Strong Repost Opportunity",
      badge: "Repost",
      badgeColor: "secondary",
      video: repostTarget.video,
      package: repostPkg,
    });
  }

  items.push({
    section: "fixRetry",
    title: "Fix & Retry",
    badge: "Fix",
    badgeColor: "secondary",
    video: fixTarget.video,
    package: fixPkg,
  });

  items.push({
    section: "newAngle",
    title: `New Angle: ${newAngleTheme}`,
    badge: "Experiment",
    badgeColor: "secondary",
    package: newAnglePkg,
  });

  const warnings = generateWarnings(videos, scored, trend, recentThemes, executions);

  const gameplan = generateGameplan(primaryItem, items, warnings);

  const overallOpportunityScore = Math.min(100, Math.round(
    momentumScore * 0.4 +
    repostTarget.compositeScore * 30 +
    (100 - fixTarget.performanceRatio * 50) * 0.1 +
    20
  ));

  return {
    momentum: {
      score: momentumScore,
      trend,
      label: trend === "up" ? "Accelerating" : trend === "down" ? "Decelerating" : "Stable",
      details: `Recent 5 videos average (${formatNum(recentAvg)}) vs historical average (${formatNum(avgViews)}).`,
    },
    items,
    warnings,
    gameplan,
    overallOpportunityScore,
    videoCount: videos.length,
    lastSync,
  };
}

function buildRepostPackage(s: ScoredVideo, avgViews: number, weights: Record<string, number>): PostPackage {
  const pctOfAvg = avgViews > 0 ? Math.round((s.video.viewCount / avgViews) * 100) : 0;
  const diagParts: string[] = [];
  diagParts.push(`This video hit ${pctOfAvg}% of your channel average.`);
  if (s.hookScore > 0 && s.hookScore < 40) diagParts.push("Weak hook — reframe the opening.");
  if (s.thumbnailScore !== null && s.thumbnailScore > 0 && s.thumbnailScore < 40) diagParts.push("Thumbnail scored low on visual impact.");
  if (s.freshnessDays > 90) diagParts.push("Old enough that your audience has likely forgotten.");

  const hookVars = generateHookVariants(s.video.title, s.video.theme || "General");

  return {
    why: `Proven topics carry less risk. Double down on what already worked.`,
    diagnosis: diagParts.join(" "),
    actionPlan: `Extract a specific sub-point from "${s.video.title}". Re-record as a short with a high-energy hook. Post tomorrow at 10 AM.`,
    confidence: "High",
    hook: `I previously talked about this, but I left out the most important part...`,
    hookVariants: hookVars,
    captionStarter: `Expanding on my earlier video about ${s.video.title.slice(0, 40)}...`,
    ctaVariants: ["Comment if you agree!", "Save this for later.", "Tag someone who needs this."],
    hashtags: `#${(s.video.theme || "Growth").replace(/\s/g, "")} #Insights #Repost`,
    opportunityScore: Math.round(s.compositeScore * 100),
    scoreBreakdown: {
      performanceRatio: Math.round(s.performanceRatio * 100) / 100,
      freshness: s.freshnessDays,
      hookQuality: s.hookScore,
      thumbnailQuality: s.thumbnailScore,
      novelty: Math.round(s.noveltyScore * 100),
      fatiguePenalty: Math.round(s.fatiguePenalty * 100),
    },
  };
}

function buildFixPackage(s: ScoredVideo, avgViews: number, weights: Record<string, number>): PostPackage {
  const pctOfAvg = avgViews > 0 ? Math.round((s.video.viewCount / avgViews) * 100) : 0;
  const diagParts: string[] = [];
  diagParts.push(`Underperformed at ${pctOfAvg}% of your average.`);
  if (s.hookScore > 0 && s.hookScore < 40) diagParts.push("Weak hook — first 3 seconds likely lost viewers.");
  if (s.thumbnailScore !== null && s.thumbnailScore > 0 && s.thumbnailScore < 40) diagParts.push("Thumbnail likely caused low CTR.");
  if (s.fatiguePenalty > 0.2) diagParts.push("Theme saturation may have contributed.");
  if (s.freshnessDays < 7) diagParts.push("Still very recent — give it time before retrying.");

  const hookVars = generateHookVariants(s.video.title, s.video.theme || "General");

  return {
    why: "The core idea might be good, but the packaging failed. Don't let good content die from a bad intro.",
    diagnosis: diagParts.join(" "),
    actionPlan: `Reframe the title to create tension. Re-edit the first 10 seconds to cut filler. Consider a new thumbnail with higher contrast.`,
    confidence: "Medium",
    hook: `What I got wrong about ${s.video.title.slice(0, 30)}...`,
    hookVariants: hookVars,
    captionStarter: `I revisited this topic because the original didn't land...`,
    ctaVariants: ["What do you think went wrong?", "Share if this resonates.", "Link in bio for the full breakdown."],
    hashtags: `#FixAndRetry #${(s.video.theme || "Strategy").replace(/\s/g, "")}`,
    opportunityScore: Math.round(s.compositeScore * 100),
    scoreBreakdown: {
      performanceRatio: Math.round(s.performanceRatio * 100) / 100,
      freshness: s.freshnessDays,
      hookQuality: s.hookScore,
      thumbnailQuality: s.thumbnailScore,
      novelty: Math.round(s.noveltyScore * 100),
      fatiguePenalty: Math.round(s.fatiguePenalty * 100),
    },
  };
}

function buildNewAnglePackage(theme: string, scored: ScoredVideo[], weights: Record<string, number>): PostPackage {
  return {
    why: "Novelty prevents audience churn. A fresh format resets viewer retention expectations.",
    diagnosis: "Your recent content shows repetitive themes. Break the pattern to re-engage your audience.",
    actionPlan: `Film a raw, unscripted take using the "${theme}" framework. Keep it under 3 minutes. Focus on a single surprising insight.`,
    confidence: "Experimental",
    hook: `You probably haven't thought about this from this angle...`,
    hookVariants: [
      `An unpopular opinion nobody wants to hear...`,
      `Stop doing what everyone else does. Try this instead.`,
      `The biggest myth in our space is...`,
    ],
    captionStarter: `I'm trying something different today. Let me know if you want more of this.`,
    ctaVariants: ["Sound off below.", "Follow for more experiments.", "Drop a comment with your take."],
    hashtags: `#Experiment #${theme.replace(/\s/g, "")} #NewAngle`,
    opportunityScore: Math.round((weights.newAngle || 1) * 40),
    scoreBreakdown: {
      performanceRatio: 0,
      freshness: 0,
      hookQuality: 0,
      thumbnailQuality: 0,
      novelty: 100,
      fatiguePenalty: 0,
    },
  };
}

function generateWarnings(
  videos: Video[],
  scored: ScoredVideo[],
  trend: string,
  recentThemes: (string | null)[],
  executions: Execution[]
): string[] {
  const warnings: string[] = [];
  const avgViews = avg(videos.map(v => v.viewCount));

  if (videos.length > 0 && videos[0].viewCount < avgViews * 0.5) {
    warnings.push("Your last video tanked. Check the hook in the first 3 seconds.");
  }
  if (trend === "down") {
    warnings.push("Views are dropping across the board. Your audience might be fatigued. Try a completely new format.");
  }

  const uniqueThemes = new Set(recentThemes.filter(Boolean));
  if (recentThemes.length >= 3 && uniqueThemes.size <= 2) {
    warnings.push("You're posting the exact same type of content too often. Mix it up.");
  }

  const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
  const hasRecentExec = executions.some(e => new Date(e.executedAt).getTime() > threeDaysAgo);
  if (!hasRecentExec && executions.length > 0) {
    warnings.push("You haven't executed a growth action in 3+ days. Consistency matters.");
  }

  const lowThumbnails = scored.slice(0, 5).filter(s => s.thumbnailScore > 0 && s.thumbnailScore < 30);
  if (lowThumbnails.length >= 3) {
    warnings.push("Multiple recent thumbnails scored low on visual impact. Consider bolder colors and faces.");
  }

  return warnings;
}

function generateGameplan(primary: ActionFeedItem, items: ActionFeedItem[], warnings: string[]): string[] {
  const plan: string[] = [];
  plan.push(`1. ${primary.package.actionPlan.split(".")[0]}.`);
  if (items.length > 1) {
    plan.push(`2. Review the Fix & Retry suggestion — a quick re-edit could rescue underperforming content.`);
  }
  plan.push(`3. Spend 10 minutes adding context notes to your library for better future suggestions.`);
  if (warnings.length > 0) {
    plan.push(`4. Address the system warning${warnings.length > 1 ? "s" : ""} above before they compound.`);
  }
  plan.push(`5. After posting, come back and mark what you did + rate the result.`);
  return plan;
}

function getDecayMultiplier(days: number): number {
  if (days <= 7) return 0.3;
  if (days <= 14) return 0.5;
  if (days <= 30) return 0.7;
  if (days <= 90) return 0.9;
  return 1.0;
}

function isEventBased(notes: string | null | undefined): boolean {
  if (!notes) return false;
  return /\b(holiday|event|memorial|vacation|anniversary|seasonal|christmas|new year|easter|halloween)\b/i.test(notes);
}

function emptyFeed(videoCount: number, lastSync: string | null): ActionFeed {
  return {
    momentum: { score: 0, trend: "flat", label: "Need Data", details: "Connect YouTube and sync to generate your intelligence brief." },
    items: [],
    warnings: [],
    gameplan: [],
    overallOpportunityScore: 0,
    videoCount,
    lastSync,
  };
}

function avg(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
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
    const baseType = exec.type.replace("primary_", "").replace("_", "");
    const mapped = baseType === "newangle" || baseType === "new_angle" ? "newAngle"
      : baseType === "fixretry" || baseType === "fix" ? "fix"
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
