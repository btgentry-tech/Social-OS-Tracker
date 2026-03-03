const CURIOSITY_WORDS = [
  "secret", "hidden", "truth", "actually", "really", "surprising", "shocking",
  "unexpected", "mistake", "wrong", "never", "always", "finally", "revealed",
  "unknown", "bizarre", "insane", "crazy", "unbelievable", "myth"
];

const TENSION_WORDS = [
  "but", "however", "except", "warning", "danger", "risk", "problem",
  "mistake", "fail", "wrong", "stop", "don't", "avoid", "never", "worst"
];

const FILLER_WORDS = [
  "basically", "essentially", "literally", "actually", "honestly",
  "um", "uh", "like", "you know", "kind of", "sort of", "i mean"
];

export function scoreHook(hookText: string): {
  score: number;
  features: {
    verbDensity: number;
    secondPerson: number;
    curiosityWords: number;
    specificity: number;
    tensionWords: number;
    hasQuestion: boolean;
    length: number;
    fillerPenalty: number;
  };
} {
  if (!hookText || hookText.trim().length === 0) {
    return {
      score: 0,
      features: { verbDensity: 0, secondPerson: 0, curiosityWords: 0, specificity: 0, tensionWords: 0, hasQuestion: false, length: 0, fillerPenalty: 0 }
    };
  }

  const text = hookText.toLowerCase().trim();
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;

  if (wordCount === 0) {
    return {
      score: 0,
      features: { verbDensity: 0, secondPerson: 0, curiosityWords: 0, specificity: 0, tensionWords: 0, hasQuestion: false, length: 0, fillerPenalty: 0 }
    };
  }

  const verbPatterns = /\b(is|are|was|were|do|does|did|have|has|had|will|would|can|could|should|must|shall|may|might|get|got|make|made|take|took|give|gave|go|went|come|came|see|saw|know|knew|think|thought|want|need|try|tried|use|used|find|found|tell|told|show|showed|start|stop|change|build|create|learn|watch|listen|read|write)\b/g;
  const verbMatches = text.match(verbPatterns) || [];
  const verbDensity = Math.min(1, verbMatches.length / wordCount * 3);

  const secondPersonPatterns = /\b(you|your|you're|you've|you'll|yourself)\b/g;
  const secondPersonCount = (text.match(secondPersonPatterns) || []).length;
  const secondPerson = Math.min(1, secondPersonCount / Math.max(1, wordCount) * 5);

  const curiosityCount = CURIOSITY_WORDS.filter(w => text.includes(w)).length;
  const curiosityScore = Math.min(1, curiosityCount / 2);

  const numberMatches = (text.match(/\b\d+\b/g) || []).length;
  const capitalWords = hookText.split(/\s+/).filter(w => /^[A-Z][a-z]/.test(w) && w.length > 2).length;
  const specificity = Math.min(1, (numberMatches + capitalWords * 0.5) / 3);

  const tensionCount = TENSION_WORDS.filter(w => text.includes(w)).length;
  const tensionScore = Math.min(1, tensionCount / 2);

  const hasQuestion = text.includes("?");

  const idealLength = 20;
  const lengthDiff = Math.abs(wordCount - idealLength);
  const lengthScore = Math.max(0, 1 - lengthDiff / idealLength);

  const fillerCount = FILLER_WORDS.filter(w => text.includes(w)).length;
  const fillerPenalty = Math.min(0.3, fillerCount * 0.1);

  const rawScore =
    verbDensity * 15 +
    secondPerson * 20 +
    curiosityScore * 20 +
    specificity * 15 +
    tensionScore * 15 +
    (hasQuestion ? 5 : 0) +
    lengthScore * 10 -
    fillerPenalty * 100;

  const score = Math.round(Math.max(0, Math.min(100, rawScore)));

  return {
    score,
    features: {
      verbDensity: Math.round(verbDensity * 100) / 100,
      secondPerson: Math.round(secondPerson * 100) / 100,
      curiosityWords: curiosityCount,
      specificity: Math.round(specificity * 100) / 100,
      tensionWords: tensionCount,
      hasQuestion,
      length: wordCount,
      fillerPenalty: Math.round(fillerPenalty * 100) / 100,
    },
  };
}

export function extractHookText(transcript: string | null | undefined): string | null {
  if (!transcript || transcript.trim().length === 0) return null;
  const words = transcript.split(/\s+/);
  const hookWords = words.slice(0, 40);
  return hookWords.join(" ");
}

const HOOK_ARCHETYPES = [
  { name: "Contrarian", template: (topic: string) => `Everyone thinks ${topic} works this way. They're wrong.` },
  { name: "Direct Value", template: (topic: string) => `Here are 3 ways to immediately improve your ${topic}.` },
  { name: "Story", template: (topic: string) => `I spent 30 days testing ${topic}. Here's what actually happened.` },
  { name: "Curiosity Gap", template: (topic: string) => `The one thing about ${topic} nobody talks about.` },
  { name: "Challenge", template: (topic: string) => `Stop doing ${topic} the old way. Do this instead.` },
];

export function generateHookVariants(title: string, theme: string): string[] {
  const topic = extractTopicFromTitle(title);
  const selected = HOOK_ARCHETYPES.slice(0, 3);
  return selected.map(a => a.template(topic));
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
