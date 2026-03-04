export function extractWinnerDNA(videos:any[]) {

  const winners = videos
    .filter(v => v.views > (v.channelAverage || 0) * 1.5)
    .slice(0,20)

  const hookPatterns:any = {}
  const topics:any = {}

  for (const v of winners) {

    const title = (v.title || "").toLowerCase()

    // detect mistake hooks
    if(title.includes("mistake")) hookPatterns.mistake = (hookPatterns.mistake||0)+1

    if(title.includes("wrong")) hookPatterns.contrarian = (hookPatterns.contrarian||0)+1

    if(title.includes("before") || title.includes("after"))
      hookPatterns.transformation = (hookPatterns.transformation||0)+1

    const words = title.split(" ")

    for(const w of words){

      if(w.length < 4) continue

      topics[w] = (topics[w] || 0) + 1
    }
  }

  const dominantHook = Object.entries(hookPatterns)
    .sort((a:any,b:any)=>b[1]-a[1])[0]?.[0]

  const dominantTopics = Object.entries(topics)
    .sort((a:any,b:any)=>b[1]-a[1])
    .slice(0,10)
    .map((t:any)=>t[0])

  return {

    dominantHook,
    dominantTopics,
    hookPatterns,
    winnersAnalyzed:winners.length

  }

}
