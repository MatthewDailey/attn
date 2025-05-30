# minimal flow
- login to different pages (open up twitter, linkedin)
- script that runs in a loop and scrolls and writes a feed to a file
  - post link to create embed
  - text content
- web app to browser that feed of embedded posts -> can mark "thumbsup" or "thumbsdown"
- save the ratings to a file, use that to evaluate future posts
- (bonus) mcp server - provide a prompt for 'get my posts' that give a clean summary
- (bonus) script to synthesize my taste

# todo
[x] login script to open browser and save cookies
[x] fn to scroll a page and gather posts from twitter scrollAndGatherTwitter(page)
  - find next <article> tag, scroll it to view
  - screenshot the tag, have google look at it and describe what it is and evaluate if it should be shown (or added to a category), save image if i might want to see
[x] fn to scroll and gather posts from linkedin scrollAndGatherLinkedin(page)
  - text inside div with data-id="urn:li:activity:7333910771602530322"
  - refactored with shared logic in social-media-utils.ts for extensibility
[x] agent to evaluate posts
  - could categorize (eg have /default /programming-memes)
[x] local postdb (description, imageUrl, timestamp, rating) with 'list'
[x] loop to gather from both
  [x] unify storage to `~/.attn/screenshots/..` and `~/.attn/posts.json`
  [] update logging to includ efull image links
[x] only include in DB if categorized and include category in db, allow querying based on hat
[x] web app for scrolling through content
[x] allow runnning dev on a specific dir to look at prior browses
[x] need to change tabs in browser when starting to read that one
[x] clean up ui a bit
[x] have linkedin scroll so top of target node is at 60px from top
[x] handle images -> turned off expanding
[x] hide when disliked
[x] ngrok tunnel to view from phone (is there a JS package i can just include?)
[x] try headless

demo:
- I'm matt, I'll demo Attention - an agent to protect your attention
- we've all had moments where go on social media and wake up 5 10, 60 minutes later like what happened
- we've also all found amazing useful information or connection as well.
- As a human I prefer to limit social media as much as possible but as a founder I need to be up-to-date on my domain and participate in the discorse to get my product out there.
- So i built "Attn" to do the mindless scrolling and filter out the content that matters to me.


- this is a short hackathon version - a full implementaiton would run in the background so you'd be able to use, use native embeds etc
