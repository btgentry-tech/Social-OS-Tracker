import { VideoData } from "./store";

export async function fetchYouTubeData(apiKey: string, channelId: string): Promise<VideoData[]> {
  try {
    // 1. Fetch latest videos from channel (search endpoint is expensive, but simplest for channel videos)
    // Alternatively, fetch the "uploads" playlist from channels endpoint, then playlistItems.
    // That costs less quota and is more reliable.
    
    // Step A: Get channel's upload playlist ID
    const channelRes = await fetch(`https://youtube.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${apiKey}`);
    if (!channelRes.ok) throw new Error("Failed to fetch channel details. Check API Key and Channel ID.");
    
    const channelData = await channelRes.json();
    if (!channelData.items || channelData.items.length === 0) {
      throw new Error("Channel not found.");
    }
    
    const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;
    
    // Step B: Get latest 20 videos from uploads playlist
    const playlistRes = await fetch(`https://youtube.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=20&playlistId=${uploadsPlaylistId}&key=${apiKey}`);
    if (!playlistRes.ok) throw new Error("Failed to fetch playlist items.");
    
    const playlistData = await playlistRes.json();
    const videoIds = playlistData.items.map((item: any) => item.snippet.resourceId.videoId).join(',');
    
    if (!videoIds) return [];

    // Step C: Get video statistics
    const statsRes = await fetch(`https://youtube.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}&key=${apiKey}`);
    if (!statsRes.ok) throw new Error("Failed to fetch video statistics.");
    
    const statsData = await statsRes.json();
    
    return statsData.items.map((item: any): VideoData => ({
      id: item.id,
      title: item.snippet.title,
      publishedAt: item.snippet.publishedAt,
      viewCount: parseInt(item.statistics.viewCount || '0', 10),
      likeCount: parseInt(item.statistics.likeCount || '0', 10),
      commentCount: parseInt(item.statistics.commentCount || '0', 10),
      tags: item.snippet.tags || [],
      thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url || ''
    }));

  } catch (error: any) {
    console.error("YouTube API Error:", error);
    throw error;
  }
}
