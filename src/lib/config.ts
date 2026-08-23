/**
 * Global configuration for Second Brain
 * All tunable parameters in one place for easy adjustment
 */

import type { RssFeedSource } from "./storage";

/**
 * Knowledge areas used to tag feed items, so a scan of the list shows which
 * field each item belongs to before reading any of it.
 */
export const FEED_CATEGORIES = [
  "AI Infra",
  "AI x Science",
  "Life Science",
  "Physical AI",
  "Models & Research",
  "Industry",
  "Policy",
  "Web3",
] as const;

export const FEED_CONFIG = {
  cacheHours: 6,           // How long to cache feed results
  maxInterests: 5,         // Max search topics to extract from library
  maxFeedItems: 30,        // Max items to show in feed (from ~50 search results)
  maxItemsPerFeed: 8,     // Newest items taken per RSS feed — see fetchRSS
  blockedRetryMs: 1500,   // Pause before retrying a feed that answered with a bot check
};

// Bounds on how much history is packed into agent prompts. Without these,
// context grows with the library and every feed/capture gets slower forever.
export const AGENT_CONTEXT_CONFIG = {
  feedLibrarySources: 50,    // newest sources given to feed filtering/briefing (summaries only — cheap)
  connectionCandidates: 60,  // newest sources compared against a new capture
  interactionWindowDays: 30, // how far back reading interactions count
  maxSignalsPerType: 20,     // newest interactions kept per signal type
};

export const API_CONFIG = {
  braveSearchBaseUrl: "https://api.search.brave.com/res/v1",
  braveResultsPerQuery: 10, // Results per search query
};

// Curated frontier-AI starting set, grouped by domain. Every URL here was
// fetched and confirmed to parse before being added — a feed that 404s or
// serves a format the parser misses fails silently and just yields nothing.
export const DEFAULT_RSS_FEEDS: RssFeedSource[] = [
  // ── AI infrastructure: chips, storage, optical, power ──
  { url: "https://www.nextplatform.com/feed/", label: "The Next Platform", tier: "secondary" },
  { url: "https://semiengineering.com/feed/", label: "Semiconductor Engineering", tier: "secondary" },
  { url: "https://www.trendforce.com/feed/Semiconductors.html", label: "TrendForce · Semiconductors", tier: "primary" },
  { url: "https://www.trendforce.com/feed/Energy.html", label: "TrendForce · Energy", tier: "primary" },
  { url: "https://spectrum.ieee.org/feeds/topic/semiconductors.rss", label: "IEEE Spectrum · Semiconductors", tier: "secondary" },
  { url: "https://spectrum.ieee.org/feeds/topic/energy.rss", label: "IEEE Spectrum · Energy", tier: "secondary" },
  { url: "https://www.datacenterdynamics.com/rss/", label: "Data Center Dynamics", tier: "secondary" },
  { url: "https://www.servethehome.com/feed/", label: "ServeTheHome", tier: "secondary" },
  { url: "https://developer.nvidia.com/blog/feed/", label: "NVIDIA Technical Blog", tier: "primary" },
  { url: "https://blog.cloudflare.com/rss/", label: "Cloudflare Blog", tier: "primary" },

  // ── Independent analysts ──
  { url: "https://newsletter.semianalysis.com/feed", label: "SemiAnalysis", tier: "secondary" },
  { url: "https://thechipletter.substack.com/feed", label: "The Chip Letter", tier: "secondary" },
  { url: "https://d2d.substack.com/feed", label: "Digits to Dollars", tier: "secondary" },
  { url: "https://www.chinatalk.media/feed", label: "ChinaTalk", tier: "secondary" },
  { url: "https://magazine.sebastianraschka.com/feed", label: "Ahead of AI", tier: "secondary" },
  { url: "https://importai.substack.com/feed", label: "Import AI", tier: "secondary" },
  { url: "https://www.latent.space/feed", label: "Latent Space", tier: "secondary" },
  { url: "https://biotechbio.substack.com/feed", label: "Techbio<>Biotech", tier: "secondary" },
  { url: "https://scalingbiotech.substack.com/feed", label: "Scaling Biotech", tier: "secondary" },
  { url: "https://www.statnews.com/feed/", label: "STAT News", tier: "secondary" },

  // ── Institutional research (podcast feeds — the reports themselves are gated) ──
  { url: "https://rss.art19.com/thoughts-on-the-market", label: "Morgan Stanley · Thoughts on the Market", tier: "primary" },
  { url: "https://feeds.megaphone.fm/GLD9218176758", label: "Goldman Sachs · Exchanges", tier: "primary" },

  // ── Journals: one or two per domain, kept for signal density ──
  { url: "http://feeds.nature.com/nature/rss/current", label: "Nature", tier: "primary" },
  { url: "https://www.nature.com/natmachintell.rss", label: "Nature Machine Intelligence", tier: "primary" },
  { url: "https://www.nature.com/nbt.rss", label: "Nature Biotechnology", tier: "primary" },
  { url: "https://www.nature.com/nm.rss", label: "Nature Medicine", tier: "primary" },
  { url: "https://www.nature.com/natelectron.rss", label: "Nature Electronics", tier: "primary" },
  { url: "https://www.nature.com/nphoton.rss", label: "Nature Photonics", tier: "primary" },

  // ── Physical AI ──
  { url: "https://www.science.org/action/showFeed?type=etoc&feed=rss&jc=scirobotics", label: "Science Robotics", tier: "primary" },
  { url: "https://spectrum.ieee.org/feeds/topic/robotics.rss", label: "IEEE Spectrum · Robotics", tier: "secondary" },
  { url: "https://www.therobotreport.com/feed/", label: "The Robot Report", tier: "secondary" },
  { url: "https://aiproem.substack.com/feed", label: "AI Proem", tier: "secondary" },
  { url: "https://waymo.com/blog/rss.xml", label: "Waymo Blog", tier: "primary" },

  // ── arXiv. Empty at weekends by design: new submissions are announced on
  //    business days, so a quiet Saturday feed is not a broken one. ──
  { url: "https://rss.arxiv.org/rss/cs.AI", label: "arXiv cs.AI", tier: "primary" },
  { url: "https://rss.arxiv.org/rss/cs.LG", label: "arXiv cs.LG", tier: "primary" },
  { url: "https://rss.arxiv.org/rss/cs.CL", label: "arXiv cs.CL", tier: "primary" },
  { url: "https://rss.arxiv.org/rss/cs.RO", label: "arXiv cs.RO", tier: "primary" },
  { url: "https://rss.arxiv.org/rss/cs.AR", label: "arXiv cs.AR", tier: "primary" },
  { url: "https://rss.arxiv.org/rss/cs.DC", label: "arXiv cs.DC", tier: "primary" },
  { url: "https://rss.arxiv.org/rss/q-bio.BM", label: "arXiv q-bio.BM", tier: "primary" },
  { url: "https://rss.arxiv.org/rss/physics.optics", label: "arXiv physics.optics", tier: "primary" },
  { url: "https://rss.arxiv.org/rss/cond-mat.mtrl-sci", label: "arXiv cond-mat.mtrl-sci", tier: "primary" },

  // ── Company engineering and research ──
  { url: "https://openai.com/news/rss.xml", label: "OpenAI", tier: "primary" },
  { url: "https://deepmind.google/blog/rss.xml", label: "Google DeepMind", tier: "primary" },
  { url: "https://research.google/blog/rss/", label: "Google Research", tier: "primary" },
  { url: "https://www.microsoft.com/en-us/research/feed/", label: "Microsoft Research", tier: "primary" },
  { url: "https://aws.amazon.com/blogs/machine-learning/feed/", label: "AWS Machine Learning", tier: "primary" },
  { url: "https://huggingface.co/blog/feed.xml", label: "Hugging Face", tier: "primary" },
  { url: "https://engineering.fb.com/feed/", label: "Meta Engineering", tier: "primary" },

  // ── News ──
  { url: "https://feeds.arstechnica.com/arstechnica/index", label: "Ars Technica", tier: "secondary" },
  { url: "https://www.technologyreview.com/feed/", label: "MIT Technology Review", tier: "secondary" },
  { url: "https://feeds.bloomberg.com/technology/news.rss", label: "Bloomberg Technology", tier: "secondary" },
  { url: "https://techcrunch.com/category/artificial-intelligence/feed/", label: "TechCrunch AI", tier: "secondary" },
  { url: "https://news.ycombinator.com/rss", label: "Hacker News", tier: "secondary" },

  // ── Web3 (deprioritized: one analytical outlet, not a news bundle) ──
  { url: "https://www.theblock.co/rss.xml", label: "The Block", tier: "secondary" },
];

// Kept short on purpose: search runs every interest against every domain, so
// each entry here multiplies Brave API calls per feed refresh.
export const DEFAULT_SEARCH_SOURCES = ["stratechery.com", "hai.stanford.edu", "epoch.ai"];

// First-run starter pack: curated public reads a new user can capture with
// one click. Only titles and URLs ship here — each user's agent fetches and
// analyzes their own copy, so no third-party content lives in the repo.
export const STARTER_PACK: { title: string; url: string }[] = [
  { title: "Building a C compiler with parallel Claudes — Anthropic", url: "https://www.anthropic.com/engineering/building-c-compiler" },
  { title: "Harness engineering — OpenAI", url: "https://openai.com/index/harness-engineering/" },
  { title: "Bezos's Prometheus raises $12B — TechCrunch", url: "https://techcrunch.com/2026/06/11/jeff-bezoss-prometheus-raises-12b-to-build-an-artificial-general-engineer-for-the-physical-world/" },
  { title: "What to Do — Paul Graham", url: "https://www.paulgraham.com/do.html" },
];

// Seconds between starter-pack captures, so a laptop isn't asked to run
// five analysis pipelines at once.
export const STARTER_PACK_STAGGER_SECONDS = 15;

// Sources worth searching rather than subscribing to: either they publish no
// usable feed (institutional research) or their feed has gone stale behind a
// paywall while the site itself keeps updating.
export const SUGGESTED_SEARCH_SOURCES = [
  { domain: "semianalysis.com", label: "SemiAnalysis" },
  { domain: "stratechery.com", label: "Stratechery" },
  { domain: "morganstanley.com", label: "Morgan Stanley" },
  { domain: "goldmansachs.com", label: "Goldman Sachs" },
  { domain: "mckinsey.com", label: "McKinsey" },
  { domain: "a16z.com", label: "a16z" },
  { domain: "epoch.ai", label: "Epoch AI" },
  { domain: "reddit.com", label: "Reddit" },
  { domain: "bloomberg.com", label: "Bloomberg" },
  { domain: "wired.com", label: "Wired" },
];
