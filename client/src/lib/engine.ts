import { VideoData } from "./store";

export interface GrowthBrief {
  momentum: {
    score: number; // 0-100
    trend: 'up' | 'down' | 'flat';
    label: string;
    details: string;
  };
  moves: {
    leverage: string;
    reinforcement: string;
    experiment: string;
  };
  warnings: string[];
  hookArchetypes: string[];
  penalties: {
    fatigue: number;
    novelty: number;
    repetition: number;
  };
  postingWindows: { day: string; time: string; confidence: string }[];
}

export function generateStrategicBrief(videos: VideoData[]): GrowthBrief {
  if (!videos || videos.length < 5) {
    return _generateEmptyBrief();
  }

  // Sort videos by date (newest first)
  const sorted = [...videos].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  
  // Recent 3 vs Previous 7
  const recent = sorted.slice(0, 3);
  const baseline = sorted.slice(3, 10);
  
  const recentAvg = _avg(recent.map(v => v.viewCount));
  const baselineAvg = _avg(baseline.map(v => v.viewCount));
  
  let momentumScore = 50;
  let trend: 'up' | 'down' | 'flat' = 'flat';
  
  if (baselineAvg > 0) {
    const ratio = recentAvg / baselineAvg;
    if (ratio > 1.2) trend = 'up';
    else if (ratio < 0.8) trend = 'down';
    
    // Normalize to 0-100
    momentumScore = Math.min(100, Math.max(0, Math.round((ratio) * 50)));
  }

  // Analyze titles for keywords/hooks
  const topPerformers = [...sorted].sort((a, b) => b.viewCount - a.viewCount).slice(0, 3);
  const bestTitleWords = topPerformers[0].title.split(' ').filter(w => w.length > 4);
  const leverageTopic = bestTitleWords.length > 0 ? bestTitleWords[0] : "your core topic";

  // Deterministic rule generation
  const brief: GrowthBrief = {
    momentum: {
      score: momentumScore,
      trend,
      label: trend === 'up' ? 'Accelerating' : trend === 'down' ? 'Decelerating' : 'Stable',
      details: `Recent avg views (${_formatNum(recentAvg)}) is ${trend === 'up' ? 'above' : trend === 'down' ? 'below' : 'matching'} baseline (${_formatNum(baselineAvg)}).`
    },
    moves: {
      leverage: `Double down on concepts related to "${leverageTopic}". This proved highly resonant in your top video.`,
      reinforcement: `Maintain the structural pacing used in "${topPerformers[1]?.title || 'your recent hits'}".`,
      experiment: momentumScore > 60 
        ? "With high momentum, test a controversial take or a tangential niche to capture broader audience."
        : "Stick to core content pillars. Avoid wild format experiments until momentum stabilizes."
    },
    warnings: [],
    hookArchetypes: [
      "The Contra-Narrative (e.g., 'Why everyone is wrong about [Topic]')",
      "The Process Breakdown (e.g., 'Step-by-step how I built [X]')",
      "The Warning (e.g., 'Stop doing [Y] before it ruins your [Z]')"
    ],
    penalties: {
      fatigue: _calculateFatigue(sorted),
      novelty: momentumScore > 70 ? 20 : 80, // high novelty needed if low momentum
      repetition: 15
    },
    postingWindows: _extractBestWindows(topPerformers)
  };

  // Generate deterministic warnings
  if (recent[0].viewCount < baselineAvg * 0.5) {
    brief.warnings.push("Severe underperformance on latest drop. Review thumbnail CTR & hook retention.");
  }
  if (trend === 'down') {
    brief.warnings.push("Consecutive drop in viewer interest. Audience may be experiencing format fatigue.");
  }
  if (brief.warnings.length === 0) {
    brief.warnings.push("No critical warnings. Operations normal.");
  }

  return brief;
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

function _calculateFatigue(videos: VideoData[]) {
  // Simple heuristic: if titles have similar words and views are dropping
  return 35; // mock deterministic value
}

function _extractBestWindows(videos: VideoData[]) {
  // Infer from publish times of best videos
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const windows = videos.map(v => {
    const d = new Date(v.publishedAt);
    return {
      day: days[d.getDay()],
      time: `${d.getHours()}:00 ${d.getHours() >= 12 ? 'PM' : 'AM'}`,
      confidence: "High (Historical Data)"
    };
  });
  
  // Deduplicate
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
    moves: { leverage: '-', reinforcement: '-', experiment: '-' },
    warnings: ['Sync required to generate insights.'],
    hookArchetypes: ['-'],
    penalties: { fatigue: 0, novelty: 0, repetition: 0 },
    postingWindows: []
  };
}
