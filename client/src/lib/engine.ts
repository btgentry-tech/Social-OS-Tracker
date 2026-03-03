import { VideoData } from "./store";

export interface PostPackage {
  why: string;
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
    repost: PostPackage & { sourceVideo: VideoData };
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

  // Pre-process videos with theme/format inference and freshness
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

  const sorted = [...processedVideos].sort((a, b) => b.viewCount - a.viewCount);
  const chronSorted = [...processedVideos].sort((a, b) => (a.freshness || 0) - (b.freshness || 0));
  
  const topPerformers = sorted.slice(0, 3);
  const recentVideos = chronSorted.slice(0, 5);
  
  const recentAvg = _avg(recentVideos.map(v => v.viewCount));
  const overallAvg = _avg(processedVideos.map(v => v.viewCount));
  
  let momentumScore = 50;
  let trend: 'up' | 'down' | 'flat' = 'flat';
  
  if (overallAvg > 0) {
    const ratio = recentAvg / overallAvg;
    if (ratio > 1.2) trend = 'up';
    else if (ratio < 0.8) trend = 'down';
    momentumScore = Math.min(100, Math.max(0, Math.round(ratio * 50)));
  }

  // Find themes/formats we've repeated recently
  const recentThemes = recentVideos.slice(0, 3).map(v => v.theme);
  const repetitionPenalty = new Set(recentThemes).size < 3 ? 30 : 0;
  
  // Find a target to repost (high performer, ideally not super recent)
  const repostTarget = topPerformers.find(v => (v.freshness || 0) > 14) || topPerformers[0];
  
  // Find a target to fix (underperformer)
  const lowestPerformers = [...processedVideos].sort((a, b) => a.viewCount - b.viewCount);
  const fixTarget = lowestPerformers.find(v => (v.freshness || 0) < 30) || lowestPerformers[0];
  
  // Experiment: suggest something opposite of the recent repeated theme
  const popularThemes = ['Tutorial', 'Vlog', 'Review', 'Analysis', 'Story', 'Interview'];
  const newAngleTheme = popularThemes.find(t => !recentThemes.includes(t)) || 'Contra-narrative';

  const brief: GrowthBrief = {
    momentum: {
      score: momentumScore,
      trend,
      label: trend === 'up' ? 'Accelerating' : trend === 'down' ? 'Decelerating' : 'Stable',
      details: `Recent 5 videos average (${_formatNum(recentAvg)}) vs historical average (${_formatNum(overallAvg)}).`
    },
    moves: {
      repost: {
        sourceVideo: repostTarget,
        why: `This video significantly outperformed your average. It's a strong candidate for a direct repost or a "Part 2" sequel.`,
        hook: `I previously talked about [Topic], but I left out the most important part...`,
        hookVariants: [
          `The secret behind my [Topic] breakdown...`,
          `Everyone asks about [Topic], here is the unseen truth.`,
          `If you liked my thoughts on [Topic], watch this.`
        ],
        captionStarter: `Expanding on my recent video about [X], I wanted to share...`,
        ctaVariants: [`Comment below if you agree!`, `Save this for later.`, `Tag someone who needs to hear this.`],
        hashtags: `#${repostTarget.theme?.replace(' ', '') || 'Growth'} #Insights`
      },
      fix: {
        sourceVideo: fixTarget,
        why: `This video underperformed compared to your average. Likely cause: weak hook or low novelty. Let's fix the intro and try again.`,
        hook: `3 reasons why [New Topic] is exactly like [Old Topic]...`,
        hookVariants: [
          `Here is how [New Topic] works, step-by-step.`,
          `The 3 pillars of [New Topic] you are missing.`,
          `A definitive guide to [New Topic].`
        ],
        captionStarter: `Just like we saw with [Previous Topic], the fundamentals apply here...`,
        ctaVariants: [`Link in bio for more.`, `What do you think?`, `Share this with a friend.`],
        hashtags: `#Strategy #Breakdown`
      },
      newAngle: {
        theme: newAngleTheme,
        format: 'Short-form / High Energy',
        why: `You've been posting similar topics recently. Try this new angle to avoid burning out your audience.`,
        hook: `You probably haven't thought about [Tangential Topic] this way...`,
        hookVariants: [
          `An unpopular opinion on [Topic]...`,
          `Stop doing [X], do [Y] instead.`,
          `The biggest myth in our industry is...`
        ],
        captionStarter: `I'm trying something different today. Let me know if...`,
        ctaVariants: [`Drop a 🚀 if you want more of this.`, `Sound off below.`, `Follow for more experiments.`],
        hashtags: `#Experiment #${newAngleTheme.replace(' ', '')}`
      }
    },
    warnings: [],
    opportunityScore: Math.min(100, Math.round(momentumScore * 0.8 + (100 - repetitionPenalty) * 0.2))
  };

  if (recentVideos[0].viewCount < overallAvg * 0.5) {
    brief.warnings.push("Your last video tanked. Check the hook in the first 3 seconds.");
  }
  if (trend === 'down') {
    brief.warnings.push("Views are dropping across the board. Your audience might be bored. Try the New Angle below.");
  }
  if (repetitionPenalty > 0) {
    brief.warnings.push("You are posting the exact same type of content too often. Mix it up.");
  }
  
  // User notes context check
  if (repostTarget.notes?.toLowerCase().includes('holiday') || repostTarget.notes?.toLowerCase().includes('event')) {
     brief.warnings.push(`Careful: The video recommended for repost ("${repostTarget.title}") has a note indicating it might be time-sensitive.`);
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
      repost: { sourceVideo: {} as any, why: '-', hook: '-', hookVariants: [], captionStarter: '-', ctaVariants: [], hashtags: '-' }, 
      fix: { sourceVideo: {} as any, why: '-', hook: '-', hookVariants: [], captionStarter: '-', ctaVariants: [], hashtags: '-' }, 
      newAngle: { theme: '-', format: '-', why: '-', hook: '-', hookVariants: [], captionStarter: '-', ctaVariants: [], hashtags: '-' },
    },
    warnings: [],
    opportunityScore: 0
  };
}
