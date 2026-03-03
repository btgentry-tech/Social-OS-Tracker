import type { InsertVideo } from "@shared/schema";

export async function fetchChannelVideos(apiKey: string, channelId: string, maxResults = 50): Promise<InsertVideo[]> {
  const channelRes = await fetch(
    `https://youtube.googleapis.com/youtube/v3/channels?part=contentDetails,statistics&id=${channelId}&key=${apiKey}`
  );
  if (!channelRes.ok) throw new Error("Failed to fetch channel details. Check API Key and Channel ID.");

  const channelData = await channelRes.json();
  if (!channelData.items || channelData.items.length === 0) {
    throw new Error("Channel not found.");
  }

  const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;

  const allVideoIds: string[] = [];
  let nextPageToken: string | undefined;
  let fetched = 0;

  while (fetched < maxResults) {
    const batchSize = Math.min(50, maxResults - fetched);
    const url = `https://youtube.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=${batchSize}&playlistId=${uploadsPlaylistId}&key=${apiKey}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) break;
    const data = await res.json();
    const ids = (data.items || []).map((item: any) => item.snippet.resourceId.videoId);
    allVideoIds.push(...ids);
    fetched += ids.length;
    nextPageToken = data.nextPageToken;
    if (!nextPageToken) break;
  }

  if (allVideoIds.length === 0) return [];

  const videosData: InsertVideo[] = [];
  const chunks = chunkArray(allVideoIds, 50);

  for (const chunk of chunks) {
    const ids = chunk.join(",");
    const statsRes = await fetch(
      `https://youtube.googleapis.com/youtube/v3/videos?part=statistics,snippet,contentDetails&id=${ids}&key=${apiKey}`
    );
    if (!statsRes.ok) continue;
    const statsData = await statsRes.json();

    for (const item of statsData.items || []) {
      videosData.push({
        id: item.id,
        channelId,
        title: item.snippet.title,
        description: item.snippet.description || "",
        publishedAt: item.snippet.publishedAt,
        duration: item.contentDetails?.duration || null,
        viewCount: parseInt(item.statistics.viewCount || "0", 10),
        likeCount: parseInt(item.statistics.likeCount || "0", 10),
        commentCount: parseInt(item.statistics.commentCount || "0", 10),
        tags: item.snippet.tags || [],
        thumbnailUrl: item.snippet.thumbnails?.maxres?.url || item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url || "",
        theme: inferTheme(item.snippet.title, item.snippet.tags || []),
        format: inferFormat(item.snippet.title, item.contentDetails?.duration),
      });
    }
  }

  const avgViews = videosData.length > 0 ? videosData.reduce((s, v) => s + (v.viewCount || 0), 0) / videosData.length : 0;
  for (const v of videosData) {
    v.performanceRatio = avgViews > 0 ? (v.viewCount || 0) / avgViews : 0;
  }

  return videosData;
}

export async function testYouTubeConnection(apiKey: string, channelId: string): Promise<{ ok: boolean; message: string; channelTitle?: string }> {
  try {
    const res = await fetch(`https://youtube.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${apiKey}`);
    if (!res.ok) return { ok: false, message: "Invalid API key or network error." };
    const data = await res.json();
    if (!data.items || data.items.length === 0) return { ok: false, message: "Channel not found." };
    return { ok: true, message: "Connection successful!", channelTitle: data.items[0].snippet.title };
  } catch (err: any) {
    return { ok: false, message: err.message || "Connection failed." };
  }
}

export function inferTheme(title: string, tags: string[]): string {
  const t = title.toLowerCase();
  if (t.includes("how to") || t.includes("tutorial") || t.includes("guide")) return "Tutorial";
  if (t.includes("review") || t.includes(" vs ")) return "Review";
  if (t.includes("why") || t.includes("truth") || t.includes("analysis")) return "Analysis";
  if (t.includes("vlog") || t.includes("day in")) return "Vlog";
  if (t.includes("story") || t.includes("storytime")) return "Story";
  if (t.includes("interview") || t.includes("podcast")) return "Interview";
  if (t.includes("behind the scenes") || t.includes("bts")) return "Behind the Scenes";
  if (t.match(/\b(top|best|worst|reasons|tips|things)\b/)) return "Listicle";
  return "General";
}

export function inferFormat(title: string, duration?: string | null): string {
  const t = title.toLowerCase();
  if (t.includes("shorts") || t.includes("#shorts")) return "Shorts";
  if (t.includes("podcast") || t.includes("interview")) return "Long-form";
  if (t.match(/\b(top|best|reasons|tips)\b/i)) return "Listicle";
  if (duration) {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (match) {
      const h = parseInt(match[1] || "0");
      const m = parseInt(match[2] || "0");
      const s = parseInt(match[3] || "0");
      const totalSeconds = h * 3600 + m * 60 + s;
      if (totalSeconds <= 60) return "Shorts";
      if (totalSeconds > 1200) return "Long-form";
    }
  }
  return "Standard";
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}
