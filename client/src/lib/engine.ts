import { VideoData } from "./store";

export interface PostPackage {
  why: string;
  diagnosis: string;
  actionPlan: string;
  confidence: 'High' | 'Medium' | 'Experimental';
  hook: string;
  hookVariants: string[];
  captionStarter: string;
  ctaVariants: string[];
  hashtags: string;
}

export interface GrowthBrief {
  momentum: {
    score: number; // 0-100
    trend: 'up' | 'down' | 'flat';
    label: string;
    details: string;
  };
  moves: {
    primary: PostPackage & { type: 'repost' | 'fix' | 'newAngle', sourceVideo?: VideoData, theme?: string, format?: string };
    highProbability: PostPackage & { sourceVideo: VideoData };
    fix: PostPackage & { sourceVideo: VideoData };
    newAngle: PostPackage & { theme: string, format: string };
  };
  warnings: string[];
  opportunityScore: number;
}

export function generateStrategicBrief(videos: VideoData[], recentExecutions: any[] = []): GrowthBrief {
  if (!videos || videos.length < 5) {
    return _generateEmptyBrief();
  }

  // 1. PRE-PROCESS: Theme, Format, Freshness
  const processedVideos = videos.map(v => {
    const d = new Date(v.publishedAt);
    const diffTime = Math.abs(new Date().getTime() - d.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return {
      ...v,
      freshness: diffDays,
      theme: _inferTheme(v.title, v.tags),
      format: _inferFormat(v.title)
    };
  });

  const sortedByViews = [...processedVideos].sort((a, b) => b.viewCount - a.viewCount);
  const chronSorted = [...processedVideos].sort((a, b) => (a.freshness || 0) - (b.freshness || 0));
  
  const recentVideos = chronSorted.slice(0, 5);
  const recentAvg = _avg(recentVideos.map(v => v.viewCount));
  const overallAvg = _avg(processedVideos.map(v => v.viewCount));
  
  // 2. SCORING & PENALTIES
  let momentumScore = 50;
  let trend: 'up' | 'down' | 'flat' = 'flat';
  if (overallAvg > 0) {
    const ratio = recentAvg / overallAvg;
    if (ratio > 1.2) trend = 'up';
    else if (ratio < 0.8) trend = 'down';
    momentumScore = Math.min(100, Math.max(0, Math.round(ratio * 50)));
  }

  const recentThemes = recentVideos.slice(0, 3).map(v => v.theme);
  const repetitionPenalty = new Set(recentThemes).size < 3 ? 30 : 0;

  // 3. TARGET IDENTIFICATION (with time-sensitive context checking)
  let validRepostTargets = sortedByViews.filter(v => {
    const isOldEnough = (v.freshness || 0) > 14;
    const isEvent = v.notes?.toLowerCase().match(/(holiday|event|memorial|vacation|anniversary)/);
    return isOldEnough && !isEvent;
  });
  
  // Fallback if all top videos are event-based
  if (validRepostTargets.length === 0) validRepostTargets = sortedByViews;
  const repostTarget = validRepostTargets[0];

  const lowestPerformers = [...processedVideos].sort((a, b) => a.viewCount - b.viewCount);
  const fixTarget = lowestPerformers.find(v => (v.freshness || 0) < 30) || lowestPerformers[0];
  
  const popularThemes = ['Tutorial', 'Vlog', 'Review', 'Analysis', 'Story', 'Interview', 'Behind the Scenes'];
  const newAngleTheme = popularThemes.find(t => !recentThemes.includes(t)) || 'Contra-narrative';

  // 4. GENERATE PACKAGES
  const repostRatio = overallAvg > 0 ? ((repostTarget.viewCount / overallAvg) * 100).toFixed(0) : '0';
  const fixRatio = overallAvg > 0 ? ((fixTarget.viewCount / overallAvg) * 100).toFixed(0) : '0';

  const repostPackage = {
    sourceVideo: repostTarget,
    diagnosis: `This video outperformed your channel average by a significant margin (${repostRatio}% of avg). The topic has proven demand.`,
    actionPlan: `Extract a specific sub-point from this video. Re-record it as a dedicated short with a direct, high-energy hook. Post tomorrow at 10 AM.`,
    why: `Proven topics carry less risk. Instead of inventing a new idea, double down on what already worked.`,
    confidence: 'High' as const,
    hook: `I previously talked about [Topic], but I left out the most important part...`,
    hookVariants: [
      `The secret behind my [Topic] breakdown...`,
      `Everyone asks about [Topic], here is the unseen truth.`,
      `If you liked my thoughts on [Topic], watch this.`
    ],
    captionStarter: `Expanding on my recent video about [X], I wanted to share...`,
    ctaVariants: [`Comment below if you agree!`, `Save this for later.`, `Tag someone who needs to hear this.`],
    hashtags: `#${repostTarget.theme?.replace(' ', '') || 'Growth'} #Insights`
  };

  const fixPackage = {
    sourceVideo: fixTarget,
    diagnosis: `Underperformed significantly (${fixRatio}% of avg). Likely due to weak hook retention or structural pacing issues in the first 5 seconds.`,
    actionPlan: `Change the framing. Shift from a passive title to a high-tension hook. Re-edit the first 10 seconds to cut fluff, then re-upload.`,
    why: `The core idea might be good, but the packaging failed. Don't let a good concept die because of a bad intro.`,
    confidence: 'Medium' as const,
    hook: `3 reasons why [New Topic] is exactly like [Old Topic]...`,
    hookVariants: [
      `Here is how [New Topic] works, step-by-step.`,
      `The 3 pillars of [New Topic] you are missing.`,
      `A definitive guide to [New Topic].`
    ],
    captionStarter: `Just like we saw with [Previous Topic], the fundamentals apply here...`,
    ctaVariants: [`Link in bio for more.`, `What do you think?`, `Share this with a friend.`],
    hashtags: `#Strategy #Breakdown`
  };

  const newAnglePackage = {
    theme: newAngleTheme,
    format: 'Short-form / High Energy',
    diagnosis: `System detected repetition fatigue. Your audience is seeing too much of the same format/theme recently.`,
    actionPlan: `Break the pattern. Film a raw, unedited take using the "${newAngleTheme}" framework to reset audience expectations.`,
    why: `Novelty prevents audience churn. Injecting a new format resets the algorithm's understanding of your viewer retention.`,
    confidence: 'Experimental' as const,
    hook: `You probably haven't thought about [Tangential Topic] this way...`,
    hookVariants: [
      `An unpopular opinion on [Topic]...`,
      `Stop doing [X], do [Y] instead.`,
      `The biggest myth in our industry is...`
    ],
    captionStarter: `I'm trying something different today. Let me know if...`,
    ctaVariants: [`Drop a 🚀 if you want more of this.`, `Sound off below.`, `Follow for more experiments.`],
    hashtags: `#Experiment #${newAngleTheme.replace(' ', '')}`
  };

  // Determine Primary Move (Do This Next)
  let primaryMove: GrowthBrief['moves']['primary'];
  if (momentumScore < 40) {
    // If momentum is dying, prioritize fixing underperformers or breaking pattern
    primaryMove = { ...newAnglePackage, type: 'newAngle' };
  } else {
    // If momentum is good, ride the wave with a proven winner
    primaryMove = { ...repostPackage, type: 'repost' };
  }

  const brief: GrowthBrief = {
    momentum: {
      score: momentumScore,
      trend,
      label: trend === 'up' ? 'Accelerating' : trend === 'down' ? 'Decelerating' : 'Stable',
      details: `Recent 5 videos average (${_formatNum(recentAvg)}) vs historical average (${_formatNum(overallAvg)}).`
    },
    moves: {
      primary: primaryMove,
      highProbability: repostPackage,
      fix: fixPackage,
      newAngle: newAnglePackage
    },
    warnings: [],
    opportunityScore: Math.min(100, Math.round(momentumScore * 0.5 + (100 - repetitionPenalty) * 0.3 + 20))
  };

  // Generate actionable warnings based on context
  if (recentVideos[0].viewCount < overallAvg * 0.5) {
    brief.warnings.push("Your last video tanked. Check the hook in the first 3 seconds.");
  }
  if (trend === 'down') {
    brief.warnings.push("Views are dropping across the board. Your audience might be bored. Try the New Idea below.");
  }
  if (repetitionPenalty > 0) {
    brief.warnings.push("You are posting the exact same type of content too often. Mix it up.");
  }

  // Check if primary recommendation is time-sensitive based on user notes
  if (primaryMove.type === 'repost' && primaryMove.sourceVideo?.notes?.toLowerCase().match(/(holiday|event|memorial)/)) {
     brief.warnings.push(`Careful: The main recommendation ("${primaryMove.sourceVideo.title}") has a note indicating it might be time-sensitive.`);
  }

  return brief;
}

export function enhanceVideoData(videos: any[]): VideoData[] {
  return videos.map(v => {
    const d = new Date(v.publishedAt);
    const diffTime = Math.abs(new Date().getTime() - d.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return {
      ...v,
      freshness: diffDays,
      theme: _inferTheme(v.title, v.tags),
      format: _inferFormat(v.title)
    };
  });
}

function _inferTheme(title: string, tags: string[]) {
  const t = title.toLowerCase();
  if (t.includes('how to') || t.includes('tutorial') || t.includes('guide')) return 'Tutorial';
  if (t.includes('review') || t.includes('vs')) return 'Review';
  if (t.includes('why') || t.includes('truth')) return 'Analysis';
  if (t.includes('vlog') || t.includes('day in')) return 'Vlog';
  return 'General';
}

function _inferFormat(title: string) {
  const t = title.toLowerCase();
  if (t.includes('shorts') || t.includes('#shorts')) return 'Shorts';
  if (t.includes('podcast') || t.includes('interview')) return 'Long-form';
  if (t.match(/\b(top|best|reasons|tips)\b/i)) return 'Listicle';
  return 'Standard';
}

function _avg(arr: number[]) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function _formatNum(num: number) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return Math.round(num).toString();
}

function _generateEmptyBrief(): GrowthBrief {
  return {
    momentum: { score: 0, trend: 'flat', label: 'Need Data', details: 'Connect YouTube to see momentum.' },
    moves: { 
      primary: { type: 'repost', sourceVideo: {} as any, why: '-', diagnosis: '-', actionPlan: '-', confidence: 'Medium', hook: '-', hookVariants: [], captionStarter: '-', ctaVariants: [], hashtags: '-' },
      highProbability: { sourceVideo: {} as any, why: '-', diagnosis: '-', actionPlan: '-', confidence: 'High', hook: '-', hookVariants: [], captionStarter: '-', ctaVariants: [], hashtags: '-' }, 
      fix: { sourceVideo: {} as any, why: '-', diagnosis: '-', actionPlan: '-', confidence: 'Medium', hook: '-', hookVariants: [], captionStarter: '-', ctaVariants: [], hashtags: '-' }, 
      newAngle: { theme: '-', format: '-', why: '-', diagnosis: '-', actionPlan: '-', confidence: 'Experimental', hook: '-', hookVariants: [], captionStarter: '-', ctaVariants: [], hashtags: '-' },
    },
    warnings: [],
    opportunityScore: 0
  };
}
