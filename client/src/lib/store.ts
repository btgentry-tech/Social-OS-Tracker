import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PersistedState {
  youtubeChannelId: string;
  setChannelId: (channelId: string) => void;
  clearChannelId: () => void;
}

interface SessionState {
  youtubeApiKey: string;
  isSyncing: boolean;
  isAnalyzing: boolean;
  setApiKey: (key: string) => void;
  setSyncing: (status: boolean) => void;
  setAnalyzing: (status: boolean) => void;
}

export const usePersistedStore = create<PersistedState>()(
  persist(
    (set) => ({
      youtubeChannelId: "",
      setChannelId: (channelId) => set({ youtubeChannelId: channelId }),
      clearChannelId: () => set({ youtubeChannelId: "" }),
    }),
    {
      name: "creator-os-config",
    }
  )
);

export const useSessionStore = create<SessionState>((set) => ({
  youtubeApiKey: "",
  isSyncing: false,
  isAnalyzing: false,
  setApiKey: (key) => set({ youtubeApiKey: key }),
  setSyncing: (status) => set({ isSyncing: status }),
  setAnalyzing: (status) => set({ isAnalyzing: status }),
}));
