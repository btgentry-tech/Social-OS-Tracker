/**
 * Fetches YouTube transcript for a given videoId using the public timedtext endpoint.
 * This is a heuristic approach that mimics how some libraries fetch auto-generated captions.
 */
export async function fetchYouTubeTranscript(videoId: string): Promise<string | null> {
  try {
    // Step 1: Get the video page to find the caption track URL
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const response = await fetch(videoUrl);
    const html = await response.text();

    // Look for captionTracks in the ytInitialPlayerResponse
    const regex = /"captionTracks":\s*(\[.*?\])/;
    const match = html.match(regex);
    if (!match) {
      return null;
    }

    const captionTracks = JSON.parse(match[1]);
    // Prefer English (en) or auto-generated English (en-orig / en)
    const track = captionTracks.find((t: any) => t.languageCode === 'en') || captionTracks[0];
    
    if (!track || !track.baseUrl) {
      return null;
    }

    // Step 2: Fetch the actual transcript (it's usually XML or JSON based on fmt)
    const transcriptResponse = await fetch(track.baseUrl + "&fmt=json3");
    const transcriptData = await transcriptResponse.json();

    if (!transcriptData || !transcriptData.events) {
      return null;
    }

    // Step 3: Parse the transcript data into plain text
    const text = transcriptData.events
      .filter((event: any) => event.segs)
      .map((event: any) => event.segs.map((seg: any) => seg.utf8).join(""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    return text || null;
  } catch (err) {
    console.error(`Error fetching transcript for ${videoId}:`, err);
    return null;
  }
}
