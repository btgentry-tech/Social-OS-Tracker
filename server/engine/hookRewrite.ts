export function rewriteHook(video:any, dna:any){

  const topic = dna.dominantTopics[0] || "this"

  const hooks:any = []

  if(dna.dominantHook === "mistake"){

    hooks.push(`The biggest mistake with ${topic}`)
    hooks.push(`You're probably doing ${topic} wrong`)
    hooks.push(`This ${topic} mistake costs people thousands`)

  }

  if(dna.dominantHook === "contrarian"){

    hooks.push(`Everything you've been told about ${topic} is wrong`)
    hooks.push(`Why most people fail at ${topic}`)

  }

  if(dna.dominantHook === "transformation"){

    hooks.push(`Before fixing ${topic} vs after`)
    hooks.push(`I tested 5 ways to fix ${topic}`)

  }

  return hooks
}
