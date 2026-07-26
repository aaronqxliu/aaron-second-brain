import { getCurrentRootPath } from "./storage";
import { promises as fs } from "fs";
import path from "path";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

export interface RadarVideo {
  id: string;
  title: string;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  thumbnailUrl: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  url: string;
}

export interface RadarScan {
  timestamp: string;
  videos: RadarVideo[];
}

export async function resolveChannelId(handle: string): Promise<string | null> {
  if (!YOUTUBE_API_KEY) throw new Error("YOUTUBE_API_KEY is not configured.");
  
  // Clean handle
  const query = handle.startsWith("@") ? handle : `@${handle}`;
  
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(query)}&key=${YOUTUBE_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error("Failed to resolve channel:", await res.text());
    return null;
  }
  const data = await res.json();
  if (data.items && data.items.length > 0) {
    return data.items[0].snippet.channelId;
  }
  return null;
}

export async function getChannelRecentVideos(channelId: string): Promise<string[]> {
  if (!YOUTUBE_API_KEY) throw new Error("YOUTUBE_API_KEY is not configured.");
  
  // First get the "uploads" playlist ID for the channel
  const channelUrl = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${YOUTUBE_API_KEY}`;
  const channelRes = await fetch(channelUrl);
  if (!channelRes.ok) return [];
  const channelData = await channelRes.json();
  
  if (!channelData.items || channelData.items.length === 0) return [];
  const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;
  
  // Now get the recent items in the uploads playlist
  const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=20&playlistId=${uploadsPlaylistId}&key=${YOUTUBE_API_KEY}`;
  const playlistRes = await fetch(playlistUrl);
  if (!playlistRes.ok) return [];
  const playlistData = await playlistRes.json();
  
  if (!playlistData.items) return [];
  
  // Filter for videos published in the last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const videoIds: string[] = [];
  for (const item of playlistData.items) {
    const publishedAt = new Date(item.contentDetails.videoPublishedAt);
    if (publishedAt >= sevenDaysAgo) {
      videoIds.push(item.contentDetails.videoId);
    }
  }
  
  return videoIds;
}

export async function getVideoStats(videoIds: string[]): Promise<RadarVideo[]> {
  if (!YOUTUBE_API_KEY) throw new Error("YOUTUBE_API_KEY is not configured.");
  if (videoIds.length === 0) return [];
  
  // Can only query 50 at a time, but we expect < 50 for MVP
  const idsParam = videoIds.join(",");
  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${idsParam}&key=${YOUTUBE_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error("Failed to fetch video stats:", await res.text());
    return [];
  }
  const data = await res.json();
  
  if (!data.items) return [];
  
  return data.items.map((item: any) => ({
    id: item.id,
    title: item.snippet.title,
    channelId: item.snippet.channelId,
    channelTitle: item.snippet.channelTitle,
    publishedAt: item.snippet.publishedAt,
    thumbnailUrl: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
    viewCount: parseInt(item.statistics.viewCount || "0", 10),
    likeCount: parseInt(item.statistics.likeCount || "0", 10),
    commentCount: parseInt(item.statistics.commentCount || "0", 10),
    url: `https://www.youtube.com/watch?v=${item.id}`
  }));
}

export async function saveRadarScan(scan: RadarScan) {
  const rootDir = getCurrentRootPath();
  const radarDir = path.join(rootDir, "user_data", "radar");
  await fs.mkdir(radarDir, { recursive: true });
  const filename = path.join(radarDir, `scan-${scan.timestamp}.json`);
  await fs.writeFile(filename, JSON.stringify(scan, null, 2), "utf-8");
}

export async function loadLatestRadarScan(): Promise<RadarScan | null> {
  try {
    const rootDir = getCurrentRootPath();
    const radarDir = path.join(rootDir, "user_data", "radar");
    const files = await fs.readdir(radarDir);
    const scanFiles = files.filter(f => f.startsWith("scan-") && f.endsWith(".json"));
    if (scanFiles.length === 0) return null;
    
    // Sort descending by filename timestamp
    scanFiles.sort().reverse();
    
    const content = await fs.readFile(path.join(radarDir, scanFiles[0]), "utf-8");
    return JSON.parse(content) as RadarScan;
  } catch (err) {
    return null;
  }
}
