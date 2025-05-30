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
[] only include in DB if categorized and include category in db, allow querying based on hat
[] web app for scrolling through content
[] onboarding ux
  [] ensure API key is present
  [] do an initial scroll and open the home page
[] ability to mark a post as viewed (eg inbox 0 it)
[] ngrok tunnel to view from phone

its okay if there are no interesting posts

thing i like:
- building cool stuff with ai
- new AI models, especially related to ai coding
- ai agent developers
- ai coding tools

things i don't like:
- fund raising posts
- job updates
- recruiting posts
- political content

twitter
- text inside  tag
  - find contained user avatar position, click just below user avatar to get tweet link. go back to feed
  - open new page to https://publish.twitter.com/?query=https://x.com/tdinh_me/status/1928072926038794267&widget=Tweet
  - read from <code class="EmbedCode-code">..

li:
  - find child button with aria-label="Open control menu ..."
  [] link to embed
  <iframe src="https://www.linkedin.com/embed/feed/update/urn:li:share:7333894278835838976" height="1322" width="504" frameborder="0" allowfullscreen="" title="Embedded post"></iframe>