import { create } from "zustand";
import { persist } from "zustand/middleware";
import { type GrowthBrief } from "./engine";

export interface VideoData {
  id: string;
  title: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  tags: string[];
  thumbnail: string;
  
  // Inferred
  theme?: string;
  format?: string;
  freshness?: number; // days ago
  
  // User context
  notes?: string;
}

export interface ExecutedMove {
  id: string;
  videoId: string;
  type: 'repost' | 'fix' | 'new_angle' | 'warning';
  executedAt: string;
  feedback?: 'better' | 'same' | 'worse';
}

interface PersistedState {
  youtubeChannelId: string;
  lastSyncedAt: string | null;
  videos: VideoData[];
  brief: GrowthBrief | null;
  executions: ExecutedMove[];
  
  setChannelId: (channelId: string) => void;
  setSyncData: (videos: VideoData[], brief: GrowthBrief) => void;
  executeMove: (move: Omit<ExecutedMove, 'id' | 'executedAt'>) => void;
  addFeedback: (executionId: string, feedback: 'better' | 'same' | 'worse') => void;
  updateVideoNote: (videoId: string, note: string) => void;
  clearData: () => void;
}

interface SessionState {
  youtubeApiKey: string;
  isSyncing: boolean;
  setApiKey: (key: string) => void;
  setSyncing: (status: boolean) => void;
}

export const usePersistedStore = create<PersistedState>()(
  persist(
    (set) => ({
      youtubeChannelId: "",
      lastSyncedAt: null,
      videos: [],
      brief: null,
      executions: [],
      
      setChannelId: (channelId) => set({ youtubeChannelId: channelId }),
      setSyncData: (videos, brief) => set({ 
        videos, 
        brief, 
        lastSyncedAt: new Date().toISOString()
      }),
      executeMove: (move) => set((state) => ({
        executions: [...state.executions, { ...move, id: crypto.randomUUID(), executedAt: new Date().toISOString() }]
      })),
      addFeedback: (executionId, feedback) => set((state) => ({
        executions: state.executions.map(e => e.id === executionId ? { ...e, feedback } : e)
      })),
      updateVideoNote: (videoId, notes) => set((state) => ({
        videos: state.videos.map(v => v.id === videoId ? { ...v, notes } : v)
      })),
      clearData: () => set({ youtubeChannelId: "", lastSyncedAt: null, videos: [], brief: null, executions: [] }),
    }),
    {
      name: "social-os-db",
    }
  )
);

export const useSessionStore = create<SessionState>((set) => ({
  youtubeApiKey: "",
  isSyncing: false,
  setApiKey: (key) => set({ youtubeApiKey: key }),
  setSyncing: (status) => set({ isSyncing: status })
}));
