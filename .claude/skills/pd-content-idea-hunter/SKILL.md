---
name: pd-content-idea-hunter
description: Find a strong YouTube content idea fast using Patrick Dang's 5-criteria framework — Hot Emerging Topic, High Demand x Low Supply, Outlier, Adoption Curve, and Unique Angle. Researches free public sources (Google Trends, Reddit, X/Twitter, forums, YouTube search) and returns 3 ranked content ideas scored against all 5 criteria, with a clear recommendation on which to make first. Use this skill whenever someone says "find me content ideas", "what should I make on YouTube", "content idea generator", "is this a good idea", "validate my video idea", "give me YouTube ideas about [topic]", "/content-idea", "/ideas", "/hunt-idea", or wants help deciding what video to film next. ALWAYS use this skill for any content ideation or video idea validation request — don't fall back to generic web search. Works for any creator in any niche.
---

# pd-content-idea-hunter

A lightweight content idea finder built on Patrick Dang's 5-criteria framework. Helps any creator (in any niche) pressure-test an idea or surface a new one using free public research sources — no paid tools required.

## The 5 criteria (what makes a "good idea")

Every content idea gets scored against these five questions. A *great* idea hits 4-5 of them. A weak idea hits 0-2. Use this as the decision filter, not a vibe check.

### 1. Hot Emerging Topic
**Is this a growing topic?** New topics that are climbing in interest have far less competition than mature topics. Riding the wave early means the YouTube algorithm rewards you with outsized distribution because there isn't a saturated supply of videos yet.

**How to check:** Google Trends rising queries (last 30-90 days), Reddit thread velocity, X/Twitter mention frequency, Google search "best of" lists from the last 60 days.

### 2. High Demand x Low Supply
**Does the topic have enough audience demand to hit your view goals? What's the competition level?** A trending niche with no audience is a dead end. A massive audience with 10,000 videos already covering it is also a dead end. The sweet spot is *real demand with manageable supply* — searchers want answers, but only a few creators are giving them the right ones.

**How to check:** YouTube search volume (count the number of videos on the topic — fewer is better given equal demand), Google search results count, Reddit subreddit subscriber count vs post volume, "people also ask" questions on Google.

### 3. Outlier
**Are there breakout videos on this topic — recently?** When small/mid-size channels are getting view counts 4x+ above their channel baseline on a topic, that's a signal the topic is undersupplied right now. The algorithm is hungry for more content there.

**Rule of thumb:** Want to see a **4x outlier video in the last 3 months.** For AI/tech topics, demand a **4x outlier in the last 1 month** — those niches move faster.

**How to check:** YouTube search the topic, sort by upload date, scan recent videos. Look at view count vs the channel's typical performance. (Channels with 10K subs that suddenly have a 200K-view video on this topic = strong outlier signal.)

### 4. Adoption Curve
**Where does this idea sit on the adoption curve?** Early-adopter topics have the most upside but require explaining the basics. Mainstream topics have huge demand but heavy competition. Late-adopter topics are commodity content.

The best zone is **Early Majority** — past the "what is this even" phase, but before everyone has made a video on it.

**How to check:** Are mainstream news outlets covering it yet? If yes → mainstream. Are only specialist communities (Reddit, niche Twitter, forums) talking about it? Early adopter. Mix of both? Sweet spot.

### 5. Unique Angle
**What perspective can you take that's uniquely different?** This is the hardest criterion to fake. If the topic is hot but every video has the same hook ("Top 10 X tips"), you need a different angle: a contrarian take, a specific outcome story, a niche audience cut, a personal credential nobody else has.

**How to check:** Watch the top 5 videos on the topic. What angles are they ALL using? What angle is missing? Pick that.

---

## How to run this skill

When invoked, follow this sequence:

### Step 1 — Clarify the user's niche and goal

Ask the user 2 questions before researching (skip if they've already given you the answers):
- **What's your niche or topic area?** (e.g., "fitness," "AI tools," "real estate," "personal finance for beginners")
- **What kind of audience are you trying to reach — beginners, intermediates, or experts?**

These two answers shape the entire research direction.

### Step 2 — Research across public sources

For the user's niche, gather signal from these free sources. Spread budget — don't go deep on any single one.

| Source | What to look for | How |
|---|---|---|
| **Google Trends** | Rising queries in the niche, last 30-90 days, US | `trends.google.com/trends/explore` — pull rising terms and related topics |
| **YouTube search** | Recent videos on the niche, scan view counts vs channel size to spot outliers | YouTube.com search → sort by upload date → eyeball outliers |
| **Reddit** | Top posts in relevant subreddits (last week + last month) | `reddit.com/r/[subreddit]/top/?t=week` |
| **X/Twitter** | High-engagement posts in the niche | Search keyword + "min_faves:100" + recent date filter |
| **Google search** | Recent news, "people also ask" questions, "best of" round-ups | Standard Google search with date filter |
| **Forums** | Indie Hackers, Hacker News, niche-specific forums | Search by keyword, look at comment count + recency |

You're looking for three things:
1. **What's rising** (timing signal)
2. **What's underserved** (supply gap)
3. **What's already a proven outlier** (demand confirmation)

### Step 3 — Generate 3 candidate ideas

Based on the research, propose 3 content ideas that each could plausibly hit. Don't propose 10 — three is sharper. Each idea should:
- Have a working video title (the title formula matters — describe a transformation or outcome, not a topic)
- Sit in the user's niche
- Have at least one piece of evidence (a rising query, a recent outlier, an undersupplied angle)

### Step 4 — Score each candidate against the 5 criteria

For each of the 3 candidates, score 1-5 on each criterion:

```
Idea: "[Working title]"
- Hot Emerging Topic: X/5 — [why]
- High Demand x Low Supply: X/5 — [why]
- Outlier: X/5 — [reference a real outlier video if you found one]
- Adoption Curve: X/5 — [where it sits + why]
- Unique Angle: X/5 — [what angle the user could take]
TOTAL: XX/25
```

### Step 5 — Recommend the top idea + how to film it

Pick the highest-scoring idea and explain:
- **Why this one** (which 2-3 criteria it dominates)
- **Suggested title** (in dream-selling format if appropriate — leads with outcome)
- **One contrarian angle** to differentiate from existing videos
- **Three reference videos** (URLs or just channel names) the user should watch before filming to understand what's working

End with: "If you want help writing the script, ask for it."

---

## Output format

```markdown
# Content Idea Hunt — [User's niche], [date]

## Quick scan of the niche
[2-3 sentences on what's rising, what's saturated, what's underserved — based on the research]

## 3 Candidate Ideas

### Idea 1: "[Working title]"
- Hot Emerging Topic: X/5 — reason
- High Demand x Low Supply: X/5 — reason
- Outlier: X/5 — reason (cite real video if found)
- Adoption Curve: X/5 — reason
- Unique Angle: X/5 — reason
**Total: XX/25**

### Idea 2: "[Working title]"
[same structure]

### Idea 3: "[Working title]"
[same structure]

## Top Recommendation
**Make Idea [N] first.** Here's why:
- [Why it scores highest]
- Suggested title: "[Sharper version of the working title]"
- Contrarian angle to take: [specific perspective that's missing in existing videos]
- Reference videos to watch first: [3 examples]

## Sources used
[Bulleted list of links — Google Trends URLs, Reddit threads, YouTube videos, X posts that informed the recommendation]
```

---

## Important behaviors

- **Default to evidence, not opinion.** If you couldn't find a real outlier on a topic, say so — don't fabricate.
- **Don't over-list ideas.** Three sharp candidates always beat ten mediocre ones.
- **Be honest about weak topics.** If the user's niche has zero rising signals and the supply is already saturated, tell them and suggest 1-2 adjacent niches that score higher.
- **Don't write the script.** This skill is for picking the idea, not making the video. If the user wants a script, point them to YouTube script tools or ask for help in a separate step.
- **Stay niche-agnostic.** This skill works for any creator — don't bias toward a specific niche.
- **Free tools only.** Don't recommend paid platforms (vidIQ, 1of10, TubeBuddy paid features, etc.) in the output. Public sources are the constraint.

## When the user already has an idea

If the user invokes this skill with an existing video idea (e.g., "is X a good idea?"), skip Step 3 and run their idea directly through the 5-criteria scoring in Step 4. Still pull live research to score against. If the idea scores under 15/25, recommend an adjusted version that would score higher — don't just say "no."

## What this skill does NOT do

- Doesn't predict view counts or guarantee results
- Doesn't run sophisticated competitor mapping or paid-tool outlier analysis — for that, the creator needs deeper tools and a real content strategy framework
- Doesn't write thumbnails, titles, or scripts — picks the idea only
- Doesn't audit a channel's existing content strategy

If the user wants any of the above, this skill is the starting point — they'll need additional resources to go deeper.
