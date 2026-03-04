export function buildExecutionPlan(video:any, rewrittenHooks:any[], bestTimes:any){

  const nextSlot = bestTimes[0]

  return {

    action:"Repost with improved hook",

    schedule:{

      day:nextSlot?.day || "Tuesday",
      time:nextSlot?.time || "11:00 AM"

    },

    hookSuggestion:rewrittenHooks[0],

    caption:

`Most people struggle with this.

Here's what actually worked.`,

    thumbnailSuggestion:"Add bold result text"

  }

}
