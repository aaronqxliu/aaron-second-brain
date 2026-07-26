import { NextResponse } from "next/server";
import { resolveChannelId, getChannelRecentVideos, getVideoStats, saveRadarScan, loadLatestRadarScan } from "@/lib/radar";

export async function POST(req: Request) {
  try {
    const { channels } = await req.json();
    if (!channels || !Array.isArray(channels)) {
      return NextResponse.json({ success: false, error: "Invalid channels array" }, { status: 400 });
    }

    const allVideoIds = new Set<string>();
    
    // Resolve handles to IDs if necessary, then fetch recent videos
    for (const channel of channels) {
      let channelId = channel;
      if (channel.startsWith("@")) {
        const resolved = await resolveChannelId(channel);
        if (resolved) channelId = resolved;
        else continue;
      }
      
      const videoIds = await getChannelRecentVideos(channelId);
      for (const id of videoIds) allVideoIds.add(id);
    }

    // Fetch stats for all found videos
    const videos = await getVideoStats(Array.from(allVideoIds));
    
    // Sort by views descending and take top 20
    videos.sort((a, b) => b.viewCount - a.viewCount);
    const topVideos = videos.slice(0, 20);

    const scan = {
      timestamp: new Date().toISOString(),
      videos: topVideos
    };

    await saveRadarScan(scan);

    return NextResponse.json({ success: true, scan });
  } catch (error: any) {
    console.error("Radar scan error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const scan = await loadLatestRadarScan();
    return NextResponse.json({ success: true, scan });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
