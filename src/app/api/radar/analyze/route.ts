import { NextResponse } from "next/server";
import { getCurrentRootPath } from "@/lib/storage";
import { promises as fs } from "fs";
import path from "path";
import { callAgent } from "@/lib/agent";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request) {
  try {
    const { video } = await req.json();
    if (!video || !video.title) {
      return NextResponse.json({ success: false, error: "Missing video payload" }, { status: 400 });
    }

    const videoContext = `
视频标题: ${video.title}
发布频道: ${video.channelTitle}
发布时间: ${video.publishedAt}
视频链接: ${video.url}
播放数据: 播放量 ${video.viewCount} | 点赞数 ${video.likeCount} | 评论数 ${video.commentCount}

视频描述/背景:
${video.description || "（暂无详细描述）"}
`.trim();

    const systemPrompt = `
你是一位顶级科技/AI 领域的内容总监与主编，负责为 Aaron 的 IP（定位：“硅谷引擎舱”、硬核 AI 科技、科技资本、商业深度）进行视频选题评估。

请对以下 YouTube 爆款视频进行全维度的深度拆解与评估。

你必须输出一段结构清晰的 Markdown 报告，包含以下五个核心部分：

1. 🧠 **LLM 评估思维链与推理过程 (Reasoning Trace)**
   - 详细写出你是如何结合视频数据（播放量、互动粘性比）与描述信息，去推演这个视频的内容质量和潜在热度的。

2. 🎯 **核心摘要与信息密度分析**
   - 总结视频的核心主题、主要论点与亮点。

3. ⚖️ **平台调性契合度 (Platform Tone Match Score: 1-10)**
   - 评估该视频是否符合 Aaron 的平台定位（“硅谷引擎舱” / 硬核 AI / 科技资本）。
   - 它是泛娱乐追热点，还是有深度商业/技术逻辑？给出具体理由。

4. 💡 **选题参考价值与切入视角 (Topic Reference Value Score: 1-10)**
   - 对于我们二次创作的参考价值多高？
   - 我们可以从哪个独到的角度进行反驳、补充或延伸？

5. 🎬 **5-8 分钟单人视频口播脚本切入方案 (Single Presenter Video Script Outline)**
   - **Hook 黄金 5 秒**：怎么吸睛开场？
   - **核心论点三层推进**：分层次列出口播大纲与核心台词要点。
   - **结尾行动呼吁 (CTA)**。

请直接输出 Markdown 内容，不要包装在 JSON 中。
`.trim();

    const fullPrompt = `${systemPrompt}\n\n=== 待评估视频数据 ===\n${videoContext}`;

    // Directly call agent to perform deep reasoning
    const aiAnalysisResult = await callAgent(fullPrompt, `radar-eval-${video.id}`);

    // Save as standard Notebook Document so it immediately appears in the Notebook tree
    const rootDir = getCurrentRootPath();
    const docId = `doc-${uuidv4().slice(0, 8)}`;
    const folderPath = path.join(rootDir, "notebook", "IP", "20_Knowledge_Atlas", docId);
    await fs.mkdir(folderPath, { recursive: true });

    const safeSlug = video.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, "-").slice(0, 30);
    const dateStr = new Date().toISOString().split("T")[0];
    const docTitle = `${dateStr}_${safeSlug}_评估研报`;

    const meta = {
      id: docId,
      title: docTitle,
      createdAt: new Date().toISOString(),
      output: "content.md",
      folder: "IP/20_Knowledge_Atlas"
    };

    const markdownContent = `---
title: "${docTitle}"
type: "视频评估研报"
source_url: "${video.url}"
created_at: "${new Date().toISOString()}"
tags: ["IP", "选题评估", "${video.channelTitle}"]
---

# 📹 视频选题评估: ${video.title}

- **发布频道**: ${video.channelTitle}
- **播放数据**: 👁️ ${video.viewCount} | 👍 ${video.likeCount} | 💬 ${video.commentCount}
- **原链接**: [点击前往 YouTube](${video.url})

---

${aiAnalysisResult}
`.trim();

    // Write meta.json and content.md for standard Notebook rendering
    await fs.writeFile(path.join(folderPath, "meta.json"), JSON.stringify(meta, null, 2), "utf-8");
    await fs.writeFile(path.join(folderPath, "content.md"), markdownContent, "utf-8");

    return NextResponse.json({
      success: true,
      docId,
      docTitle,
      filePath: `notebook/IP/20_Knowledge_Atlas/${docId}/content.md`
    });
  } catch (error: any) {
    console.error("Radar analysis error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
