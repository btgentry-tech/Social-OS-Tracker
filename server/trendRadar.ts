export async function getTrendingTopics() {

  const trends = [
    "backyard makeover",
    "DIY landscaping",
    "garden transformation",
    "budget backyard",
    "mulch landscaping",
    "before and after yard",
    "DIY walkway",
    "home improvement hacks"
  ]

  return trends
}

export function matchTrends(videos: any[], trends: string[]) {

  const matches: any[] = []

  for (const video of videos) {

    const text = (video.title + " " + (video.description || "")).toLowerCase()

    for (const trend of trends) {

      if (text.includes(trend)) {

        matches.push({
          videoId: video.id,
          trend,
          title: video.title,
          confidence: "High"
        })

      }

    }

  }

  return matches
}
