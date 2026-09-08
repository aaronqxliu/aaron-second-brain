"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { FeedItem, FeedSignals, InsightItem, StructuredBriefing } from "@/lib/types";
import { useLocalStorage } from "@/hooks/useLocalStorage";

export interface FeedState {
  items: FeedItem[];
  interests: string[];
  generatedAt: string | null;
  fromCache: boolean;
  stale: boolean; // Past cacheHours — informational only, never auto-triggers a refetch
  message?: string;
  briefing?: StructuredBriefing;
  signals?: FeedSignals;
  insights?: InsightItem[];
}

const FEED_STORAGE_KEY = "secondbrain_feed_cache_v1";

interface PersistedFeedState {
  feed: FeedState;
  starredBriefingTexts: string[];
  readBriefingTexts: string[];
  availableDates: string[];
  selectedDate: string | null;
}

let memoryFeedState: FeedState | null = null;
let memoryStarredTexts: Set<string> = new Set();
let memoryReadBriefingTexts: Set<string> = new Set();
let memoryAvailableDates: string[] = [];
let memorySelectedDate: string | null = null;
let memoryInitialized = false;

function initMemoryFromStorage() {
  if (memoryInitialized || typeof window === "undefined") return;
  memoryInitialized = true;
  try {
    const raw = localStorage.getItem(FEED_STORAGE_KEY);
    if (raw) {
      const parsed: PersistedFeedState = JSON.parse(raw);
      if (parsed && parsed.feed) {
        memoryFeedState = parsed.feed;
        memoryStarredTexts = new Set(parsed.starredBriefingTexts || []);
        memoryReadBriefingTexts = new Set(parsed.readBriefingTexts || []);
        memoryAvailableDates = parsed.availableDates || [];
        memorySelectedDate = parsed.selectedDate || null;
      }
    }
  } catch (err) {
    console.warn("Failed to load feed from localStorage:", err);
  }
}

function persistFeed(
  nextFeed: FeedState,
  starred: Set<string>,
  read: Set<string>,
  dates: string[],
  selectedDate: string | null
) {
  memoryFeedState = nextFeed;
  memoryStarredTexts = starred;
  memoryReadBriefingTexts = read;
  memoryAvailableDates = dates;
  memorySelectedDate = selectedDate;

  if (typeof window === "undefined") return;
  try {
    const payload: PersistedFeedState = {
      feed: nextFeed,
      starredBriefingTexts: Array.from(starred),
      readBriefingTexts: Array.from(read),
      availableDates: dates,
      selectedDate,
    };
    localStorage.setItem(FEED_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn("Failed to save feed to localStorage:", err);
  }
}

export function useFeed() {
  initMemoryFromStorage();

  const [feed, setFeedState] = useState<FeedState>(() => memoryFeedState ?? {
    items: [],
    interests: [],
    generatedAt: null,
    fromCache: false,
    stale: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useLocalStorage<string[]>("feed-dismissed", []);
  const dismissedSet = useMemo(() => new Set(dismissedIds), [dismissedIds]);
  const [starredTexts, setStarredTexts] = useState<Set<string>>(() => new Set(memoryStarredTexts));
  const [readBriefingTexts, setReadBriefingTexts] = useState<Set<string>>(() => new Set(memoryReadBriefingTexts));
  const [availableDates, setAvailableDates] = useState<string[]>(() => memoryAvailableDates);
  const [selectedDate, setSelectedDate] = useState<string | null>(() => memorySelectedDate);

  // Mirrors selectedDate so an in-flight refresh can tell whether the user
  // navigated to a past snapshot while it was generating.
  const selectedDateRef = useRef<string | null>(memorySelectedDate);

  const selectDate = useCallback((date: string | null) => {
    selectedDateRef.current = date;
    setSelectedDate(date);
    persistFeed(feed, starredTexts, readBriefingTexts, availableDates, date);
  }, [feed, starredTexts, readBriefingTexts, availableDates]);

  // Filter out dismissed items
  const visibleItems = feed.items.filter((item) => !dismissedSet.has(item.id));

  // Record URLs the user is finished with, so the next refresh does not pay to
  // re-rank them. Feed generation drops seen URLs before the agent sees them.
  const markSeen = useCallback((urls: string[], text?: string) => {
    if (urls.length === 0 && !text) return;
    fetch("/api/feed/seen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls, text }),
    }).catch(() => {});
  }, []);

  // Mark specific URLs as seen/unseen (called when user toggles briefing items)
  const markBriefingRead = useCallback((text: string, urls: string[]) => {
    setReadBriefingTexts(prev => {
      const next = new Set(prev).add(text);
      persistFeed(feed, starredTexts, next, availableDates, selectedDateRef.current);
      return next;
    });
    markSeen(urls, text);
  }, [markSeen, feed, starredTexts, availableDates]);

  const markBriefingUnread = useCallback((text: string, urls: string[]) => {
    setReadBriefingTexts(prev => {
      const next = new Set(prev);
      next.delete(text);
      persistFeed(feed, starredTexts, next, availableDates, selectedDateRef.current);
      return next;
    });
    fetch("/api/feed/seen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls, unseen: true, text }),
    }).catch(() => {});
  }, [feed, starredTexts, availableDates]);

  const starBriefingItem = useCallback((text: string, meta?: { feedDate?: string; refs?: { url: string; title: string }[] }) => {
    setStarredTexts(prev => {
      const next = new Set(prev).add(text);
      persistFeed(feed, next, readBriefingTexts, availableDates, selectedDateRef.current);
      return next;
    });
    fetch("/api/feed/star", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, ...meta }),
    }).catch(() => {});
  }, [feed, readBriefingTexts, availableDates]);

  const unstarBriefingItem = useCallback((text: string) => {
    setStarredTexts(prev => {
      const next = new Set(prev);
      next.delete(text);
      persistFeed(feed, next, readBriefingTexts, availableDates, selectedDateRef.current);
      return next;
    });
    fetch("/api/feed/star", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, unstar: true }),
    }).catch(() => {});
  }, [feed, readBriefingTexts, availableDates]);

  const loadFeed = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent && (!memoryFeedState || memoryFeedState.items.length === 0)) {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await fetch("/api/feed");
      const data = await res.json();

      if (data.success && data.feed) {
        const feedItems = data.feed.items ?? [];
        const nextFeed: FeedState = {
          items: feedItems,
          interests: data.feed.interests ?? [],
          generatedAt: data.feed.generatedAt ?? null,
          fromCache: data.feed.fromCache ?? false,
          stale: data.feed.stale ?? false,
          message: data.feed.message,
          briefing: data.feed.briefing,
          signals: data.feed.signals,
          insights: data.feed.insights,
        };
        const nextStarred = data.feed.starredBriefingTexts
          ? new Set<string>(data.feed.starredBriefingTexts)
          : starredTexts;
        const nextRead = data.feed.readBriefingTexts
          ? new Set<string>(data.feed.readBriefingTexts)
          : readBriefingTexts;
        const nextDates = data.availableDates ?? availableDates;

        setFeedState(nextFeed);
        if (data.feed.starredBriefingTexts) setStarredTexts(nextStarred);
        if (data.feed.readBriefingTexts) setReadBriefingTexts(nextRead);
        if (data.availableDates) setAvailableDates(nextDates);

        persistFeed(nextFeed, nextStarred, nextRead, nextDates, selectedDateRef.current);
      } else if (data.message) {
        setFeedState((prev) => {
          const next = { ...prev, message: data.message };
          persistFeed(next, starredTexts, readBriefingTexts, availableDates, selectedDateRef.current);
          return next;
        });
      } else {
        setError(data.error || "Failed to load feed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load feed");
    } finally {
      setLoading(false);
    }
  }, [starredTexts, readBriefingTexts, availableDates]);

  const refreshFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    selectDate(null);

    try {
      const res = await fetch("/api/feed", { method: "POST" });
      const data = await res.json();

      if (data.success && data.feed) {
        const nextDates = data.availableDates ?? availableDates;
        if (data.availableDates) {
          setAvailableDates(nextDates);
        }
        // The user switched to a past snapshot while this refresh was
        // generating — don't yank their view; the new feed is cached and
        // shows when they return to the latest view.
        if (selectedDateRef.current !== null) {
          return;
        }
        const feedItems = data.feed.items ?? [];
        const nextFeed: FeedState = {
          items: feedItems,
          interests: data.feed.interests ?? [],
          generatedAt: data.feed.generatedAt ?? null,
          fromCache: false,
          stale: false, // just regenerated — fresh by definition
          message: data.feed.message,
          briefing: data.feed.briefing,
          signals: data.feed.signals,
          insights: data.feed.insights,
        };
        const nextStarred = data.feed.starredBriefingTexts
          ? new Set<string>(data.feed.starredBriefingTexts)
          : starredTexts;
        const nextRead = data.feed.readBriefingTexts
          ? new Set<string>(data.feed.readBriefingTexts)
          : readBriefingTexts;

        setFeedState(nextFeed);
        if (data.feed.starredBriefingTexts) setStarredTexts(nextStarred);
        if (data.feed.readBriefingTexts) setReadBriefingTexts(nextRead);

        persistFeed(nextFeed, nextStarred, nextRead, nextDates, null);
      } else {
        setError(data.error || "Failed to refresh feed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh feed");
    } finally {
      setLoading(false);
    }
  }, [selectDate, availableDates, starredTexts, readBriefingTexts]);

  const loadFeedForDate = useCallback(async (date: string | null) => {
    if (!date) {
      // Go back to current/latest feed
      selectDate(null);
      await loadFeed();
      return;
    }

    setLoading(true);
    setError(null);
    selectDate(date);

    try {
      const res = await fetch(`/api/feed?date=${date}`);
      const data = await res.json();

      if (data.success && data.feed) {
        const nextFeed: FeedState = {
          items: data.feed.items ?? [],
          interests: data.feed.interests ?? [],
          generatedAt: data.feed.generatedAt ?? null,
          fromCache: true,
          stale: false, // a dated snapshot is a fixed point in time, not "stale"
          message: data.feed.message,
          briefing: data.feed.briefing,
          signals: data.feed.signals,
          insights: data.feed.insights,
        };
        const nextStarred = data.feed.starredBriefingTexts
          ? new Set<string>(data.feed.starredBriefingTexts)
          : starredTexts;
        const nextRead = data.feed.readBriefingTexts
          ? new Set<string>(data.feed.readBriefingTexts)
          : readBriefingTexts;
        const nextDates = data.availableDates ?? availableDates;

        setFeedState(nextFeed);
        if (data.feed.starredBriefingTexts) setStarredTexts(nextStarred);
        if (data.feed.readBriefingTexts) setReadBriefingTexts(nextRead);
        if (data.availableDates) setAvailableDates(nextDates);

        persistFeed(nextFeed, nextStarred, nextRead, nextDates, date);
      } else {
        setError(data.error || "Failed to load feed for date");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load feed for date");
    } finally {
      setLoading(false);
    }
  }, [loadFeed, selectDate, starredTexts, readBriefingTexts, availableDates]);

  // Dismissing only hid the item locally, so the next refresh spent an agent
  // call re-ranking something the user had already rejected.
  const dismissItem = useCallback((id: string) => {
    setDismissedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    const url = feed.items.find((item) => item.id === id)?.url;
    if (url) markSeen([url]);
  }, [setDismissedIds, feed.items, markSeen]);

  return {
    items: visibleItems,
    interests: feed.interests,
    generatedAt: feed.generatedAt,
    fromCache: feed.fromCache,
    stale: feed.stale,
    message: feed.message,
    briefing: feed.briefing,
    signals: feed.signals,
    insights: feed.insights,
    starredBriefingTexts: starredTexts,
    readBriefingTexts,
    availableDates,
    selectedDate,
    loading,
    error,
    loadFeed,
    refreshFeed,
    loadFeedForDate,
    dismissItem,
    markSeen,
    markBriefingRead,
    markBriefingUnread,
    starBriefingItem,
    unstarBriefingItem,
  };
}
