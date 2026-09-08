"use client";

import { useState, useCallback, useEffect, useRef } from "react";

export type DisplayLanguage = "en" | "zh";

const LANG_STORAGE_KEY = "secondbrain-display-lang";
const TRANSLATION_CACHE_KEY = "secondbrain-translations-v1";

// In-memory module-level cache for instant lookups across components
const memoryTranslationCache = new Map<string, string>();
let isCacheLoadedFromStorage = false;

// Global listeners to notify all hook instances when cache updates
const cacheListeners = new Set<() => void>();
function notifyCacheUpdate() {
  cacheListeners.forEach((fn) => {
    try {
      fn();
    } catch {}
  });
}

function loadCacheFromStorage() {
  if (isCacheLoadedFromStorage || typeof window === "undefined") return;
  isCacheLoadedFromStorage = true;
  try {
    const raw = localStorage.getItem(TRANSLATION_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        for (const [k, v] of Object.entries(parsed)) {
          if (typeof v === "string") {
            memoryTranslationCache.set(k, v);
          }
        }
      }
    }
  } catch (err) {
    console.warn("Failed to load translations from localStorage:", err);
  }
}

function saveCacheToStorage() {
  if (typeof window === "undefined") return;
  try {
    const obj: Record<string, string> = {};
    // Cap cache at 2000 entries to avoid localStorage bloat
    let count = 0;
    for (const [k, v] of memoryTranslationCache.entries()) {
      if (count++ > 2000) break;
      obj[k] = v;
    }
    localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(obj));
  } catch (err) {
    console.warn("Failed to save translations to localStorage:", err);
  }
}

async function translateWithGoogleDirect(text: string, targetLang: DisplayLanguage): Promise<string> {
  const tl = targetLang === "zh" ? "zh-CN" : "en";
  const sl = targetLang === "zh" ? "auto" : "zh-CN";
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google Translate status: ${res.status}`);
  const data = await res.json();
  if (Array.isArray(data) && Array.isArray(data[0])) {
    const translated = data[0]
      .map((item: unknown) => (Array.isArray(item) && typeof item[0] === "string" ? item[0] : ""))
      .join("");
    return translated || text;
  }
  return text;
}

export function useTranslation() {
  loadCacheFromStorage();

  const [lang, setLangState] = useState<DisplayLanguage>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(LANG_STORAGE_KEY);
      if (saved === "zh" || saved === "en") return saved;
    }
    return "en";
  });

  const [cacheVersion, setCacheVersion] = useState(0);
  const [isTranslating, setIsTranslating] = useState(false);
  const inFlightBatchRef = useRef<Set<string>>(new Set());

  // Listen to cross-component cache updates
  useEffect(() => {
    const onUpdate = () => setCacheVersion((v) => v + 1);
    cacheListeners.add(onUpdate);
    return () => {
      cacheListeners.delete(onUpdate);
    };
  }, []);

  const setLang = useCallback((nextLang: DisplayLanguage) => {
    setLangState(nextLang);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(LANG_STORAGE_KEY, nextLang);
      } catch {}
    }
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === "en" ? "zh" : "en");
  }, [lang, setLang]);

  // Synchronous text translator: if in English, returns original; if in Chinese, returns cached translation or original
  const t = useCallback(
    (text: string | undefined | null, fallback?: string): string => {
      if (!text) return fallback ?? "";
      if (lang === "en") return text;
      const cached = memoryTranslationCache.get(text.trim());
      return cached || fallback || text;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lang, cacheVersion] // depends on cacheVersion so UI updates immediately when translations arrive
  );

  // Translate a batch of key-value texts with chunking to prevent LLM truncation
  const translateBatch = useCallback(
    async (
      texts: Record<string, string>,
      targetLang: DisplayLanguage = "zh"
    ): Promise<Record<string, string>> => {
      const result: Record<string, string> = {};
      const needed: Record<string, string> = {};

      for (const [key, text] of Object.entries(texts)) {
        if (!text || !text.trim()) {
          result[key] = text;
          continue;
        }
        const trimmed = text.trim();
        if (targetLang === "en") {
          result[key] = text;
          continue;
        }
        const cached = memoryTranslationCache.get(trimmed);
        if (cached) {
          result[key] = cached;
        } else if (!inFlightBatchRef.current.has(trimmed)) {
          needed[key] = trimmed;
          inFlightBatchRef.current.add(trimmed);
        }
      }

      if (Object.keys(needed).length === 0) {
        return result;
      }

      setIsTranslating(true);

      const entries = Object.entries(needed);
      let anyNew = false;
      const unresolved: Record<string, string> = {};

      try {
        // 1. Direct in-browser Google Translate (fast 50ms, 0 Claude tokens)
        const CONCURRENCY = 6;
        for (let i = 0; i < entries.length; i += CONCURRENCY) {
          const slice = entries.slice(i, i + CONCURRENCY);
          await Promise.all(
            slice.map(async ([key, text]) => {
              try {
                const translated = await translateWithGoogleDirect(text, targetLang);
                if (translated) {
                  result[key] = translated;
                  memoryTranslationCache.set(text, translated);
                  anyNew = true;
                } else {
                  unresolved[key] = text;
                }
              } catch {
                unresolved[key] = text;
              }
            })
          );
        }

        // 2. If any items failed (e.g. offline/network issues), fallback to Agent CLI /api/translate
        const unresolvedEntries = Object.entries(unresolved);
        if (unresolvedEntries.length > 0) {
          const CHUNK_SIZE = 25;
          for (let i = 0; i < unresolvedEntries.length; i += CHUNK_SIZE) {
            const chunk = Object.fromEntries(unresolvedEntries.slice(i, i + CHUNK_SIZE));
            try {
              const res = await fetch("/api/translate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ texts: chunk, targetLang }),
              });

              const data = await res.json();
              if (data.success && data.translations) {
                for (const [key, translated] of Object.entries(
                  data.translations as Record<string, string>
                )) {
                  result[key] = translated;
                  const orig = chunk[key];
                  if (orig && translated) {
                    memoryTranslationCache.set(orig, translated);
                    anyNew = true;
                  }
                }
              } else {
                for (const [key, orig] of Object.entries(chunk)) {
                  result[key] = orig;
                }
              }
            } catch (chunkErr) {
              console.error("[useTranslation] Fallback translation failed:", chunkErr);
              for (const [key, orig] of Object.entries(chunk)) {
                result[key] = orig;
              }
            }
          }
        }

        if (anyNew) {
          saveCacheToStorage();
          notifyCacheUpdate();
        }
      } finally {
        for (const trimmed of Object.values(needed)) {
          inFlightBatchRef.current.delete(trimmed);
        }
        setIsTranslating(false);
      }

      return result;
    },
    []
  );

  return {
    lang,
    setLang,
    toggleLang,
    t,
    translateBatch,
    isTranslating,
  };
}
