import React, { useState, useEffect } from "react";
import { RefreshCw, PlayCircle, Eye, ThumbsUp, MessageSquare, Sparkles, CheckCircle2, Loader2 } from "lucide-react";
import type { RadarScan, RadarVideo } from "@/lib/radar";
import { formatDistanceToNow } from "date-fns";
import { theme } from "@/lib/theme";

interface RadarSectionProps {
  palette: Record<number, string>;
  onSelectDocument?: (docId: string) => void;
}

const DEFAULT_CHANNELS = [
  "@XiaoLinTalk",
  "@Kouki_Momo",
  // TODO: Add more default channels based on user preferences
];

export function RadarSection({ palette, onSelectDocument }: RadarSectionProps) {
  const [scan, setScan] = useState<RadarScan | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyzingMap, setAnalyzingMap] = useState<Record<string, boolean>>({});
  const [successMap, setSuccessMap] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchLatestScan();
  }, []);

  const fetchLatestScan = async () => {
    try {
      const res = await fetch("/api/radar/scan");
      const data = await res.json();
      if (data.success && data.scan) {
        setScan(data.scan);
      }
    } catch (err) {
      console.error("Failed to fetch latest scan", err);
    }
  };

  const handleScan = async () => {
    setIsScanning(true);
    setError(null);
    try {
      const res = await fetch("/api/radar/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channels: DEFAULT_CHANNELS }),
      });
      const data = await res.json();
      if (data.success) {
        setScan(data.scan);
      } else {
        setError(data.error || "Scan failed");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setIsScanning(false);
    }
  };

  const handleAnalyzeVideo = async (e: React.MouseEvent, video: RadarVideo) => {
    e.preventDefault();
    e.stopPropagation();

    setAnalyzingMap((prev) => ({ ...prev, [video.id]: true }));
    try {
      const res = await fetch("/api/radar/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ video }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMap((prev) => ({ ...prev, [video.id]: data.docId }));
        if (onSelectDocument && data.docId) {
          onSelectDocument(data.docId);
        }
      } else {
        alert(`评估失败: ${data.error}`);
      }
    } catch (err: any) {
      alert(`评估出错: ${err.message}`);
    } finally {
      setAnalyzingMap((prev) => ({ ...prev, [video.id]: false }));
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
    if (num >= 1000) return (num / 1000).toFixed(1) + "K";
    return num.toString();
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold mb-1">IP Radar</h1>
          <p className="text-sm" style={{ color: theme.textMuted }}>
            自动扫描你关注的 YouTube 频道最近 7 天发布的爆款视频。
          </p>
        </div>
        <button
          onClick={handleScan}
          disabled={isScanning}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-colors"
          style={{ backgroundColor: palette[600], opacity: isScanning ? 0.7 : 1 }}
        >
          <RefreshCw size={16} className={isScanning ? "animate-spin" : ""} />
          {isScanning ? "扫描中..." : "开始扫描"}
        </button>
      </div>

      {error && (
        <div className="p-4 mb-6 rounded-lg text-sm bg-red-500/10 text-red-500 border border-red-500/20">
          Error: {error}. 请确保你已经正确配置了 YOUTUBE_API_KEY。
        </div>
      )}

      {scan ? (
        <div>
          <div className="mb-4 text-xs font-medium uppercase tracking-wider" style={{ color: theme.textMuted }}>
            最后更新于 {new Date(scan.timestamp).toLocaleString()}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {scan.videos.map((video, idx) => (
              <a
                key={video.id}
                href={video.url}
                target="_blank"
                rel="noreferrer"
                className="group flex flex-col rounded-xl border overflow-hidden transition-all hover:shadow-md bg-white dark:bg-neutral-950 block"
                style={{ borderColor: theme.border }}
              >
                <div className="relative aspect-video w-full overflow-hidden bg-black/5">
                  <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <PlayCircle className="text-white w-12 h-12" />
                  </div>
                </div>
                
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-medium line-clamp-2 mb-2 group-hover:text-emerald-600 transition-colors" style={{ color: theme.text }}>
                    {video.title}
                  </h3>
                  
                  <div className="text-xs mb-4 line-clamp-1" style={{ color: theme.textMuted }}>
                    <span className="font-semibold">{video.channelTitle}</span> • {formatDistanceToNow(new Date(video.publishedAt), { addSuffix: true })}
                  </div>
                  
                  <div className="mt-auto pt-3 flex items-center justify-between border-t border-black/5 dark:border-white/5 text-xs font-medium" style={{ color: theme.textMuted }}>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-emerald-600">
                        <Eye size={13} />
                        {formatNumber(video.viewCount)}
                      </div>
                      <div className="flex items-center gap-1">
                        <ThumbsUp size={13} />
                        {formatNumber(video.likeCount)}
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleAnalyzeVideo(e, video)}
                      disabled={analyzingMap[video.id]}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-900/50 transition-colors"
                      title="调用 LLM 进行深度调性评估与选题切入点拆解"
                    >
                      {analyzingMap[video.id] ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          <span>评估中...</span>
                        </>
                      ) : successMap[video.id] ? (
                        <div 
                          className="flex items-center gap-1 cursor-pointer"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (onSelectDocument && successMap[video.id]) {
                              onSelectDocument(successMap[video.id]);
                            }
                          }}
                        >
                          <CheckCircle2 size={12} className="text-emerald-500" />
                          <span>查看研报 ➔</span>
                        </div>
                      ) : (
                        <>
                          <Sparkles size={12} />
                          <span>LLM 深度评估</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </a>
            ))}
            
            {scan.videos.length === 0 && (
              <div className="col-span-full py-12 text-center text-sm" style={{ color: theme.textMuted }}>
                最近 7 天没有找到新视频。
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center pb-20">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 bg-black/5 dark:bg-white/5">
            <RefreshCw size={24} style={{ color: palette[500] }} />
          </div>
          <h2 className="text-lg font-medium mb-2">雷达就绪</h2>
          <p className="max-w-md text-sm" style={{ color: theme.textMuted }}>
            点击右上角的「开始扫描」按钮，雷达会为你获取 YouTube 上关注频道的最新动态。
          </p>
        </div>
      )}
    </div>
  );
}
