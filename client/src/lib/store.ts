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
}

interface AppState {
  youtubeApiKey: string;
  youtubeChannelId: string;
  lastSyncedAt: string | null;
  videos: VideoData[];
  brief: GrowthBrief | null;
  isSyncing: boolean;
  
  setCredentials: (apiKey: string, channelId: string) => void;
  setSyncData: (videos: VideoData[], brief: GrowthBrief) => void;
  setSyncing: (status: boolean) => void;
  clearData: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      youtubeApiKey: "",
      youtubeChannelId: "",
      lastSyncedAt: null,
      videos: [],
      brief: null,
      isSyncing: false,
      
      setCredentials: (apiKey, channelId) => set({ youtubeApiKey: apiKey, youtubeChannelId: channelId }),
      setSyncData: (videos, brief) => set({ 
        videos, 
        brief, 
        lastSyncedAt: new Date().toISOString(),
        isSyncing: false
      }),
      setSyncing: (status) => set({ isSyncing: status }),
      clearData: () => set({ youtubeApiKey: "", youtubeChannelId: "", lastSyncedAt: null, videos: [], brief: null }),
    }),
    {
      name: "social-os-storage",
    }
  )
);
