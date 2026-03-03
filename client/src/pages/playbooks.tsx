import { BookOpen, Zap, Copy, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const PLAYBOOKS = [
  {
    title: "The High-Energy Repost",
    category: "Repost",
    description: "Take a proven winner and re-angle it for a new audience segment.",
    steps: [
      "Pick your top-performing video from the last 90 days.",
      "Identify the single most compelling sub-point from that video.",
      "Write 3 new hook variants using different archetypes (contrarian, curiosity gap, direct value).",
      "Re-record a 60-90 second version focusing only on that sub-point.",
      "Use a completely new thumbnail with higher contrast and a face close-up.",
      "Post at 10 AM in your audience's primary timezone.",
      "In the caption, reference the original video to drive traffic back.",
    ],
    hookTemplates: [
      "I talked about [Topic] before, but I missed the most important part...",
      "Everyone got this wrong about [Topic]. Let me fix that.",
      "The real reason [Topic] works is not what you think.",
    ],
  },
  {
    title: "The Fix & Retry",
    category: "Fix",
    description: "Rescue underperforming content by fixing the packaging, not the idea.",
    steps: [
      "Find a video that underperformed (< 80% of your average views).",
      "Diagnose: Was it the hook (first 3 seconds), thumbnail, or title?",
      "Re-write the title to create tension or curiosity.",
      "Create a new thumbnail — bolder colors, text overlay, face with emotion.",
      "Re-edit the first 10 seconds: cut all filler, start with the payoff.",
      "Re-upload with the new title and thumbnail.",
      "Monitor the first 48 hours for CTR and retention signals.",
    ],
    hookTemplates: [
      "What I got wrong about [Topic]...",
      "I made this mistake with [Topic]. Here's the fix.",
      "The version of [Topic] nobody asked for — but everyone needs.",
    ],
  },
  {
    title: "The Pattern Breaker",
    category: "New Angle",
    description: "Combat audience fatigue by injecting novelty into your content mix.",
    steps: [
      "Check your last 5 videos — if 3+ share the same theme/format, it's time to break the pattern.",
      "Pick a format you haven't used recently (vlog, interview, behind-the-scenes, reaction).",
      "Choose a topic adjacent to your niche but not your usual lane.",
      "Film it raw and unscripted — authenticity resets audience expectations.",
      "Keep it under 3 minutes for the first experiment.",
      "In your caption, explicitly say 'trying something different — tell me what you think.'",
      "Track engagement rate (not views) as the success metric for experiments.",
    ],
    hookTemplates: [
      "I've never done this before, but...",
      "This is not my usual content. But I think you need to hear it.",
      "An experiment: what happens when I try [New Format]?",
    ],
  },
  {
    title: "The Caption Formula",
    category: "Writing",
    description: "A repeatable structure for captions that drive engagement.",
    steps: [
      "Line 1: Hook — make it impossible not to read line 2.",
      "Line 2-3: Context — briefly explain why this matters to THEM.",
      "Line 4-5: Value — the insight, tip, or story payoff.",
      "Line 6: CTA — one clear action (comment, save, share, or follow).",
      "Line 7: Hashtags — 3-5 relevant tags, mix niche + broad.",
      "Keep total length under 150 words for shorts, under 300 for long-form.",
      "Use line breaks generously — walls of text get skipped.",
    ],
    hookTemplates: [
      "Stop scrolling. This will change how you think about [Topic].",
      "The 3-second version: [Main Point]. Now let me explain.",
      "Nobody talks about this part of [Topic]. Until now.",
    ],
  },
];

function PlaybookCard({ playbook }: { playbook: typeof PLAYBOOKS[0] }) {
  const [expanded, setExpanded] = useState(false);
  const { toast } = useToast();

  const copyHooks = () => {
    navigator.clipboard.writeText(playbook.hookTemplates.join("\n"));
    toast({ title: "Hooks copied!" });
  };

  const categoryColors: Record<string, string> = {
    Repost: "bg-green-500/10 text-green-500 border-green-500/20",
    Fix: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    "New Angle": "bg-purple-500/10 text-purple-500 border-purple-500/20",
    Writing: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  };

  return (
    <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm" data-testid={`card-playbook-${playbook.category.toLowerCase().replace(" ", "-")}`}>
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border mb-2 ${categoryColors[playbook.category] || categoryColors.Writing}`}>
              {playbook.category}
            </span>
            <h3 className="font-bold text-xl">{playbook.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{playbook.description}</p>
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          data-testid={`button-expand-${playbook.category.toLowerCase().replace(" ", "-")}`}
        >
          {expanded ? "Hide steps" : "Show steps"}
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {expanded && (
          <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
            <ol className="space-y-2">
              {playbook.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <span className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>

            <div className="bg-secondary/10 p-4 rounded-lg border border-border/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-muted-foreground uppercase">Hook Templates</span>
                <button onClick={copyHooks} className="text-xs text-primary flex items-center gap-1 hover:text-primary/80" data-testid={`button-copy-hooks-${playbook.category.toLowerCase().replace(" ", "-")}`}>
                  <Copy className="w-3 h-3" /> Copy
                </button>
              </div>
              <ul className="space-y-1.5">
                {playbook.hookTemplates.map((h, i) => (
                  <li key={i} className="text-sm text-muted-foreground">• {h}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Playbooks() {
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 pt-8 md:pt-10 pb-20 animate-in slide-in-from-bottom-4 fade-in duration-500">
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 flex items-center gap-3" data-testid="text-page-title">
          <BookOpen className="w-8 h-8 text-primary" />
          Playbooks
        </h1>
        <p className="text-muted-foreground text-lg">Proven frameworks you can follow. No guessing.</p>
      </div>

      <div className="grid gap-6">
        {PLAYBOOKS.map((pb, i) => (
          <PlaybookCard key={i} playbook={pb} />
        ))}
      </div>
    </div>
  );
}
