---
name: propose-and-score
description: "评估 Aaron 视频选题的爆款潜力与稀缺性。使用 google_search 抓取竞争对手数据，结合 EREI 算法进行多维度打分。当用户提出一个选题提案时触发。"
---

# Propose and Score Workflow

当你（Agent）收到 Aaron 给出的选题提案时，请严格按照以下步骤执行。

## 前置检查

1. 读取工作区根目录下的 `USER.md`，确认选题不违反任何 Compliance Blocklist 条目。
2. 读取 `MEMORY.md`，参考已学习的偏好模式。

## 1. 市场先例审计 (Market Audit)

- 使用 `google_search` 在简中互联网（小红书、哔哩哔哩、微信公众号）中搜索该选题的发布情况。
  - 搜索关键词模板: `"{选题关键词}" site:bilibili.com OR site:xiaohongshu.com OR site:mp.weixin.qq.com`
- 收集排名前 3 位同选题视频/文章的数据表现（点赞、收藏、播放量估算）。
- **逻辑决策分支**：
  - 若**做过且数据表现极佳**（B站播放量 > 50万 或 小红书收藏 > 1万）：标记为「✅ 已被验证的高势能选题」，予以通过。
  - 若**做过但数据表现平庸**（播放量 < 5万 且无突出互动）：判定为「❌ 直接回避选题」，提示 Aaron 并建议替代方向。
  - 若**没人做过**：进入「稀缺性评估」分支。

## 2. 语义稀缺性评估 (Scarcity Evaluation)

- 使用 `google_search` 检索全球前沿技术英文研报、YC 新项目库或技术白皮书。
  - 搜索关键词模板: `"{topic}" site:ycombinator.com OR site:arxiv.org OR filetype:pdf whitepaper`
- 检查本地 `40_MOC/` 目录下是否已有相关 MOC (Map of Content) 笔记。
- 评估维度:
  - **信息维度差 (OOD Score)**: 该选题的核心信息是否超出简中互联网主流认知？(0-10)
  - **技术拆解可行性**: 是否有足够的公开技术/商业数据支撑一期 5-8 分钟的深度视频？(Yes/No)
  - **时效窗口**: 该选题是否有时效性？若有，预估最佳发布时间。

## 3. EREI 预评分 (Quick EREI Pre-Score)

如果该选题涉及一家具体公司，快速预估以下指标（使用公开数据，无法获取时标注 `[N/A]`）：

| 指标 | 公式 | 预估值 |
|------|------|--------|
| 人均创收 (RPE) | ARR / 员工数 | |
| 人均创利 (PPE) | 净利润 / 员工数 | |
| 算力套利率 (CAR) | 1 - (算力成本 / ARR) | |
| 资本效率 (CE) | ARR / 累计融资额 | |

## 4. 输出格式

请为 Aaron 输出一份平实、无废话的选题评估卡片，使用以下 Markdown 模板：

```markdown
# 选题评估卡片

## 基本信息
- **选题名称**: {topic}
- **评估日期**: {YYYY-MM-DD}
- **评估状态**: ✅ 通过 / ❌ 回避 / ⚠️ 待补充数据

## 综合评分: {X}/10

## 竞品现状分析
{market_audit_summary}

## 核心稀缺度分析
- **OOD 信息维度差**: {score}/10
- **稀缺度原因**: {reason}

## EREI 预评分
{erei_table}

## 建议
{actionable_recommendation}
```

## 5. 后处理

- 将评估卡片保存至 `10_Inbox/{YYYY-MM-DD}_{topic_slug}_评估卡片.md`。
- 如果评估通过，提示 Aaron 可以运行 `/deep-research` 进入下一阶段。
