# Founder letter

The letter is in `web/src/content/founder.ts`. It is **hidden on the site** (`FOUNDER_PUBLISHED = false`) until you have read it and made it yours.

## What it already says (all true of the product today)
- You are building Reprummble, and the problem is "five apps and five subscriptions".
- Three promises: real data only, scores you can check, your data is yours.
- It is young: the website is live, the apps are coming, you are testing with friends and family, and people can write to support@reprummble.com.

## What only you can add (a letter lands when it is personal)
Add two or three sentences in your own words, then change the file:
1. **Why you, why now.** What made you start? A moment, a person, a frustration. One honest sentence beats a polished paragraph.
2. **Your background.** Where you are from or based, and what you did before (training, engineering, something else), if you want to share it.
3. **Who is on the team.** The letter says "I". If other people are building it with you, say who, and change "I" to "we" where it fits.
4. **Anything in the letter that is not true.** Delete or fix it. In particular, check "testing it with friends and family".

## To publish
1. Edit the paragraphs in `web/src/content/founder.ts`.
2. Optionally add a photo: put `founder.jpg` in `web/public/` and set `photo: '/founder.jpg'` in that file.
3. Set `FOUNDER_PUBLISHED = true`.
4. The letter then appears on the About page, above "What we are building".
