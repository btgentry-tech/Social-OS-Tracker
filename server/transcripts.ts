// server/transcripts.ts
import fetch from "node-fetch";

/**
 * Best-effort transcript fetch for YouTube videos without OAuth.
 * Works for many videos where captions are publicly accessible.
 *
 * If it fails, we return null and the rest of the system should
 * treat transcript as unavailable (no "generic transcript claims").
 */

function extractPlayerResponse(html: string): any | null {
  // Try multiple known patterns (YouTube changes this a lot)
  const patterns = [
    /ytInitialPlayerResponse\s*=\s*(\{[\s\S]*?\})\s*;/,
    /var\s+ytInitialPlayerResponse\s*=\s*(\{[\s\S]*?\})\s*;/,
    /"ytInitialPlayerResponse"\s*:\s*(\{[\s\S]*?\})\s*,\s*"ytInitialData"/,
  ];

  for (const re of patterns) {
    const m = html.match(re);
    if (!m?.[1]) continue;
    try {
      return JSON.parse(m[1]);
    } catch {
      // continue
    }
  }

  return null;
}

function getCaptionTrackUrl(playerResponse: any): string | null {
  const tracks =
    playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

  if (!Array.isArray(tracks) || tracks.length === 0) return null;

  // Prefer English if available, else first track.
  const en =
    tracks.find((t: any) => String(t.languageCode || "").startsWith("en")) ||
    tracks[0];

  const baseUrl = en?.baseUrl;
  if (!baseUrl) return null;

  // Ask for JSON3 (easier to parse) if not already present
  const url = baseUrl.includes("fmt=")
    ? baseUrl
    : `${baseUrl}&fmt=json3`;

  return url;
}

function json3ToPlainText(json: any): string {
  const events = json?.events;
  if (!Array.isArray(events)) return "";

  const parts: string[] = [];
  for (const ev of events) {
    const segs = ev?.segs;
    if (!Array.isArray(segs)) continue;
    for (const s of segs) {
      const t = s?.utf8;
      if (typeof t === "string") parts.push(t);
    }
  }

  // Normalize spacing
  return parts
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function fetchYouTubeTranscript(videoId: string): Promise<string | null> {
  try {
    const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
    const res = await fetch(watchUrl, {
      headers: {
        // Some regions require a UA to return the full HTML
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!res.ok) return null;

    const html = await res.text();
    const playerResponse = extractPlayerResponse(html);
    if (!playerResponse) return null;

    const captionUrl = getCaptionTrackUrl(playerResponse);
    if (!captionUrl) return null;

    const capRes = await fetch(captionUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari",
      },
    });

    if (!capRes.ok) return null;

    const json = await capRes.json();
    const text = json3ToPlainText(json);
    if (!text) return null;

    return text;
  } catch {
    return null;
  }
}
