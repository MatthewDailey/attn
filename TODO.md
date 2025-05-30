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
[] use the likes and dislikes in filtering
  [] update ui
  [] hide when disliked
[] ability to mark a post as viewed (eg inbox 0 it)
[] ngrok tunnel to view from phone (is there a JS package i can just include?)
[] `npm start` to run the main command 
[] try headless
[] try getting link to post working
[] onboarding ux
  [] ensure gemini API key is present
  [] do an initial scroll and open the home page

