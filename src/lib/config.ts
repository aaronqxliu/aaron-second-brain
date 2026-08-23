/**
 * Global configuration for Second Brain
 * All tunable parameters in one place for easy adjustment
 */

import type { RssFeedSource } from "./storage";

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
  { url: "https://www.nextplatform.com/feed/", label: "The Next Platform" },
  { url: "https://semiengineering.com/feed/", label: "Semiconductor Engineering" },
  { url: "https://www.trendforce.com/feed/Semiconductors.html", label: "TrendForce · Semiconductors" },
  { url: "https://www.trendforce.com/feed/Energy.html", label: "TrendForce · Energy" },
  { url: "https://spectrum.ieee.org/feeds/topic/semiconductors.rss", label: "IEEE Spectrum · Semiconductors" },
  { url: "https://spectrum.ieee.org/feeds/topic/energy.rss", label: "IEEE Spectrum · Energy" },
  { url: "https://www.datacenterdynamics.com/rss/", label: "Data Center Dynamics" },
  { url: "https://www.servethehome.com/feed/", label: "ServeTheHome" },
  { url: "https://developer.nvidia.com/blog/feed/", label: "NVIDIA Technical Blog" },
  { url: "https://blog.cloudflare.com/rss/", label: "Cloudflare Blog" },

  // ── Independent analysts ──
  { url: "https://newsletter.semianalysis.com/feed", label: "SemiAnalysis" },
  { url: "https://www.fabricatedknowledge.com/feed", label: "Fabricated Knowledge" },
  { url: "https://thechipletter.substack.com/feed", label: "The Chip Letter" },
  { url: "https://d2d.substack.com/feed", label: "Digits to Dollars" },
  { url: "https://www.chinatalk.media/feed", label: "ChinaTalk" },
  { url: "https://magazine.sebastianraschka.com/feed", label: "Ahead of AI" },
  { url: "https://importai.substack.com/feed", label: "Import AI" },
  { url: "https://www.latent.space/feed", label: "Latent Space" },
  { url: "https://biotechbio.substack.com/feed", label: "Techbio<>Biotech" },
  { url: "https://scalingbiotech.substack.com/feed", label: "Scaling Biotech" },
  { url: "https://www.statnews.com/feed/", label: "STAT News" },

  // ── Institutional research (podcast feeds — the reports themselves are gated) ──
  { url: "https://rss.art19.com/thoughts-on-the-market", label: "Morgan Stanley · Thoughts on the Market" },
  { url: "https://feeds.megaphone.fm/GLD9218176758", label: "Goldman Sachs · Exchanges" },

  // ── Journals: one or two per domain, kept for signal density ──
  { url: "http://feeds.nature.com/nature/rss/current", label: "Nature" },
  { url: "https://www.nature.com/natmachintell.rss", label: "Nature Machine Intelligence" },
  { url: "https://www.nature.com/nbt.rss", label: "Nature Biotechnology" },
  { url: "https://www.nature.com/nm.rss", label: "Nature Medicine" },
  { url: "https://www.nature.com/natelectron.rss", label: "Nature Electronics" },
  { url: "https://www.nature.com/nphoton.rss", label: "Nature Photonics" },

  // ── Physical AI ──
  { url: "https://www.science.org/action/showFeed?type=etoc&feed=rss&jc=scirobotics", label: "Science Robotics" },
  { url: "https://spectrum.ieee.org/feeds/topic/robotics.rss", label: "IEEE Spectrum · Robotics" },
  { url: "https://www.therobotreport.com/feed/", label: "The Robot Report" },
  { url: "https://aiproem.substack.com/feed", label: "AI Proem" },
  { url: "https://waymo.com/blog/rss.xml", label: "Waymo Blog" },

  // ── arXiv. Empty at weekends by design: new submissions are announced on
  //    business days, so a quiet Saturday feed is not a broken one. ──
  { url: "https://rss.arxiv.org/rss/cs.AI", label: "arXiv cs.AI" },
  { url: "https://rss.arxiv.org/rss/cs.LG", label: "arXiv cs.LG" },
  { url: "https://rss.arxiv.org/rss/cs.CL", label: "arXiv cs.CL" },
  { url: "https://rss.arxiv.org/rss/cs.RO", label: "arXiv cs.RO" },
  { url: "https://rss.arxiv.org/rss/cs.AR", label: "arXiv cs.AR" },
  { url: "https://rss.arxiv.org/rss/cs.DC", label: "arXiv cs.DC" },
  { url: "https://rss.arxiv.org/rss/q-bio.BM", label: "arXiv q-bio.BM" },
  { url: "https://rss.arxiv.org/rss/physics.optics", label: "arXiv physics.optics" },
  { url: "https://rss.arxiv.org/rss/cond-mat.mtrl-sci", label: "arXiv cond-mat.mtrl-sci" },

  // ── Company engineering and research ──
  { url: "https://openai.com/news/rss.xml", label: "OpenAI" },
  { url: "https://deepmind.google/blog/rss.xml", label: "Google DeepMind" },
  { url: "https://research.google/blog/rss/", label: "Google Research" },
  { url: "https://www.microsoft.com/en-us/research/feed/", label: "Microsoft Research" },
  { url: "https://aws.amazon.com/blogs/machine-learning/feed/", label: "AWS Machine Learning" },
  { url: "https://huggingface.co/blog/feed.xml", label: "Hugging Face" },
  { url: "https://engineering.fb.com/feed/", label: "Meta Engineering" },

  // ── News ──
  { url: "https://feeds.arstechnica.com/arstechnica/index", label: "Ars Technica" },
  { url: "https://www.technologyreview.com/feed/", label: "MIT Technology Review" },
  { url: "https://feeds.bloomberg.com/technology/news.rss", label: "Bloomberg Technology" },
  { url: "https://techcrunch.com/category/artificial-intelligence/feed/", label: "TechCrunch AI" },
  { url: "https://news.ycombinator.com/rss", label: "Hacker News" },

  // ── Web3 (deprioritized: one analytical outlet, not a news bundle) ──
  { url: "https://www.theblock.co/rss.xml", label: "The Block" },
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
