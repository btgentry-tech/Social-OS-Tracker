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
    leverage: PostPackage & { sourceVideoId: string };
    reinforcement: PostPackage & { sourceVideoId: string };
    experiment: PostPackage & { theme: string, format: string };
    structural: PostPackage & { details: string };
  };
  warnings: string[];
  penalties: {
    fatigue: number;
    novelty: number;
    repetition: number;
  };
  postingWindows: { day: string; time: string; confidence: string }[];
  todayGameplan: string[];
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
  
  // Leverage: best performing recent video
  const leverageTarget = topPerformers[0];
  // Reinforcement: consistent performer
  const reinforcementTarget = topPerformers[1] || topPerformers[0];
  
  // Experiment: suggest something opposite of the recent repeated theme
  const popularThemes = ['Tutorial', 'Vlog', 'Review', 'Analysis', 'Story', 'Interview'];
  const experimentTheme = popularThemes.find(t => !recentThemes.includes(t)) || 'Contra-narrative';

  const brief: GrowthBrief = {
    momentum: {
      score: momentumScore,
      trend,
      label: trend === 'up' ? 'Accelerating' : trend === 'down' ? 'Decelerating' : 'Stable',
      details: `Recent 5 videos average (${_formatNum(recentAvg)}) vs historical average (${_formatNum(overallAvg)}).`
    },
    moves: {
      leverage: {
        sourceVideoId: leverageTarget.id,
        why: `"${leverageTarget.title}" hit above average. Extract a sub-topic from this and dive deeper.`,
        hook: `I previously talked about [Topic], but I left out the most important part...`,
        hookVariants: [
          `The secret behind my [Topic] breakdown...`,
          `Everyone asks about [Topic], here is the unseen truth.`,
          `If you liked my thoughts on [Topic], watch this.`
        ],
        captionStarter: `Expanding on my recent video about [X], I wanted to share...`,
        ctaVariants: [`Comment below if you agree!`, `Save this for later.`, `Tag someone who needs to hear this.`],
        hashtags: `#${leverageTarget.theme?.replace(' ', '') || 'Growth'} #Insights`
      },
      reinforcement: {
        sourceVideoId: reinforcementTarget.id,
        why: `"${reinforcementTarget.title}" showed strong resonance. Use a similar structural format but a new topic.`,
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
      experiment: {
        theme: experimentTheme,
        format: 'Short-form / High Energy',
        why: `Momentum allows for risk. Test the "${experimentTheme}" theme to see if it captures a tangential audience.`,
        hook: `You probably haven't thought about [Tangential Topic] this way...`,
        hookVariants: [
          `An unpopular opinion on [Topic]...`,
          `Stop doing [X], do [Y] instead.`,
          `The biggest myth in our industry is...`
        ],
        captionStarter: `I'm trying something different today. Let me know if...`,
        ctaVariants: [`Drop a 🚀 if you want more of this.`, `Sound off below.`, `Follow for more experiments.`],
        hashtags: `#Experiment #${experimentTheme.replace(' ', '')}`
      },
      structural: {
        details: 'Format Optimization',
        why: 'Average view duration drops when intros exceed 15 seconds. Cut the fluff.',
        hook: `[No specific hook - structural adjustment]`,
        hookVariants: [],
        captionStarter: `[N/A]`,
        ctaVariants: [],
        hashtags: ''
      }
    },
    warnings: [],
    penalties: {
      fatigue: momentumScore < 40 ? 45 : 10,
      novelty: momentumScore > 70 ? 15 : 60,
      repetition: repetitionPenalty
    },
    postingWindows: _extractBestWindows(topPerformers),
    todayGameplan: [
      `Draft a script expanding on "${leverageTarget.title}"`,
      `Brainstorm 3 new topics for the "${reinforcementTarget.format}" format`,
      `Record a rough take for a ${experimentTheme} concept`
    ],
    opportunityScore: Math.min(100, Math.round(momentumScore * 0.8 + (100 - repetitionPenalty) * 0.2))
  };

  if (recentVideos[0].viewCount < overallAvg * 0.5) {
    brief.warnings.push("Severe underperformance on latest drop. Review thumbnail CTR & hook retention.");
  }
  if (trend === 'down') {
    brief.warnings.push("Consecutive drop in viewer interest. Audience may be experiencing format fatigue.");
  }
  if (repetitionPenalty > 0) {
    brief.warnings.push("High repetition penalty: You are using the same themes too often recently.");
  }
  if (brief.warnings.length === 0) {
    brief.warnings.push("No critical warnings. Operations normal.");
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
  if (t.includes('podcast') || t.includes('interview')) return 'Long-form Discussion';
  return 'Standard Video';
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

function _extractBestWindows(videos: any[]) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const windows = videos.map(v => {
    const d = new Date(v.publishedAt);
    return {
      day: days[d.getDay()],
      time: `${d.getHours()}:00 ${d.getHours() >= 12 ? 'PM' : 'AM'}`,
      confidence: "High (Historical Data)"
    };
  });
  
  const unique = [];
  const seen = new Set();
  for (const w of windows) {
    const key = w.day + w.time;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(w);
    }
  }
  
  return unique.length > 0 ? unique : [
    { day: "Tuesday", time: "10:00 AM", confidence: "Algorithmic Default" },
    { day: "Thursday", time: "2:00 PM", confidence: "Algorithmic Default" }
  ];
}

function _generateEmptyBrief(): GrowthBrief {
  return {
    momentum: { score: 0, trend: 'flat', label: 'Insufficient Data', details: 'Need at least 5 synced videos to calculate momentum.' },
    moves: { 
      leverage: { sourceVideoId: '', why: '-', hook: '-', hookVariants: [], captionStarter: '-', ctaVariants: [], hashtags: '-' }, 
      reinforcement: { sourceVideoId: '', why: '-', hook: '-', hookVariants: [], captionStarter: '-', ctaVariants: [], hashtags: '-' }, 
      experiment: { theme: '-', format: '-', why: '-', hook: '-', hookVariants: [], captionStarter: '-', ctaVariants: [], hashtags: '-' },
      structural: { details: '-', why: '-', hook: '-', hookVariants: [], captionStarter: '-', ctaVariants: [], hashtags: '-' }
    },
    warnings: ['Sync required to generate insights.'],
    penalties: { fatigue: 0, novelty: 0, repetition: 0 },
    postingWindows: [],
    todayGameplan: [],
    opportunityScore: 0
  };
}
