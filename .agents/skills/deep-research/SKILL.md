---
name: deep-research
description: "针对已立项的选题，自动进行全网深度资料抓取，利用 Python code_execution 计算 EREI 指数，输出三账本结构的深度研报。当用户确认选题立项后触发。"
---

# Deep Research and Report Workflow

当 Aaron 对某选题确认立项后，请自动执行以下深度研报生成步骤。

## 前置检查

1. 读取 `USER.md`，确保所有数据来源符合 Compliance 要求（仅使用公开数据）。
2. 检查 `10_Inbox/` 下是否存在对应的选题评估卡片，读取其中的 EREI 预评分和竞品分析作为研报起点。

## 1. 增量抓取与清洗 (Data Acquisition)

### 1.1 财务与商业数据
- 使用 `google_search` 抓取：
  - 目标企业官网 About/Pricing 页面
  - 最新季度/年度财务数据（SEC filings、Crunchbase、PitchBook 公开摘要）
  - 融资历程与估值变化
  - 员工规模（LinkedIn 公开数据、企业官网 Careers 页面计数）
- 使用 `url_context` 读取找到的关键页面，提取结构化数据。

### 1.2 技术架构数据
- 使用 `google_search` 检索：
  - 技术博客 / Engineering Blog 文章
  - 开源仓库 (GitHub) 的 Stars、Contributors、Commit 频率
  - 技术白皮书或 arXiv 论文
  - 基础设施选型（云服务商、GPU 使用量、推理框架）
- 使用 `url_context` 对关键白皮书/博文进行全文提取。

### 1.3 PDF 解析 (如适用)
- 如果抓取到 PDF 文件（如 S-1 招股书、技术白皮书），使用 `code_execution` 运行 Python:

```python
# PDF 文本提取示例
import subprocess
subprocess.run(["pip", "install", "PyPDF2"], capture_output=True)

from PyPDF2 import PdfReader

reader = PdfReader("downloaded_file.pdf")
for page in reader.pages:
    text = page.extract_text()
    # 提取关键财务表格和技术架构数据
```

## 2. 商业与技术账本计算 (EREI 2.0 Index)

使用 `code_execution` 运行以下 Python 计算脚本：

```python
import json

def calculate_erei(data: dict) -> dict:
    """
    计算 EREI 2.0 (AI-Native Efficiency Index)
    
    Input data dict keys:
      - arr: Annual Recurring Revenue ($)
      - employees: Total employee count
      - net_profit: Net profit ($), can be negative
      - compute_cost: Annual compute & API cost ($)
      - total_funding: Total funding raised ($)
    """
    arr = data.get("arr", 0)
    employees = data.get("employees", 1)  # avoid division by zero
    net_profit = data.get("net_profit", 0)
    compute_cost = data.get("compute_cost", 0)
    total_funding = data.get("total_funding", 1)

    rpe = arr / employees                          # 人均创收
    ppe = net_profit / employees                    # 人均创利
    car = 1 - (compute_cost / arr) if arr > 0 else 0  # 算力套利率
    ce = arr / total_funding                        # 资本效率

    # 标准化评分 (0-10)，基于 AI-native 行业基准
    benchmarks = {
        "rpe": {"median": 200000, "p90": 500000},
        "ppe": {"median": -50000, "p90": 100000},
        "car": {"median": 0.5, "p90": 0.8},
        "ce":  {"median": 0.3, "p90": 1.0},
    }

    def normalize(value, median, p90):
        if value <= 0 and median > 0:
            return max(0, 5 * (value / median))
        return min(10, 10 * (value / p90))

    scores = {
        "RPE_raw": rpe, "RPE_score": round(normalize(rpe, **benchmarks["rpe"]), 1),
        "PPE_raw": ppe, "PPE_score": round(normalize(ppe, **benchmarks["ppe"]), 1),
        "CAR_raw": car, "CAR_score": round(normalize(car, **benchmarks["car"]), 1),
        "CE_raw": ce,   "CE_score": round(normalize(ce, **benchmarks["ce"]), 1),
    }
    scores["EREI_composite"] = round(
        (scores["RPE_score"] * 0.3 +
         scores["PPE_score"] * 0.2 +
         scores["CAR_score"] * 0.3 +
         scores["CE_score"] * 0.2), 1
    )
    return scores

# 使用方式：用真实数据填充
company_data = {
    "arr": 0,           # 替换为实际数据
    "employees": 1,     # 替换为实际数据
    "net_profit": 0,    # 替换为实际数据
    "compute_cost": 0,  # 替换为实际数据
    "total_funding": 1, # 替换为实际数据
}

results = calculate_erei(company_data)
print(json.dumps(results, indent=2, ensure_ascii=False))
```

## 3. 输出深度 Report 结构

将深度报告保存至 `20_Knowledge_Atlas/{YYYY-MM-DD}_{topic_slug}_深度研报.md`。

报告**必须严格**包含以下三大模块：

```markdown
---
title: "{company_name} 深度研报"
date: {YYYY-MM-DD}
status: draft
published: false
privacy: true
tags: [deep-research, {industry_tag}]
erei_composite: {score}
---

# {company_name} 深度研报

## Executive Summary
{一段话概括核心发现，不超过 100 字}

---

## 一、工程基础设施账本

### 1.1 底层技术栈
{技术架构描述：语言、框架、基础设施选型}

### 1.2 算力套利路径
{如何优化 GPU/TPU 使用效率、推理成本控制策略}

### 1.3 工程效率指标
{开发者数量、代码提交频率、开源社区活跃度}

---

## 二、商业运营账本

### 2.1 营收结构
{ARR、MRR、收入构成、定价策略}

### 2.2 人效比分析
{RPE、PPE 及其行业对标}

### 2.3 客户经济学
{LTV/CAC 比例、NRR、客户构成}

---

## 三、VC 创投逻辑与远期定价

### 3.1 护城河评估
{数据壁垒、网络效应、技术先发优势、转换成本}

### 3.2 融资历程与估值变化
{各轮融资详情、估值倍数}

### 3.3 远期定价模型
{基于 ARR 增速的估值区间}

---

## EREI 2.0 评分卡

| 指标 | 原始值 | 标准化分 (0-10) |
|------|--------|-----------------|
| 人均创收 (RPE) | ${rpe} | {rpe_score} |
| 人均创利 (PPE) | ${ppe} | {ppe_score} |
| 算力套利率 (CAR) | {car}% | {car_score} |
| 资本效率 (CE) | {ce}x | {ce_score} |
| **EREI 综合分** | — | **{composite}** |

---

## 数据来源与免责声明
{列出所有数据来源 URL，标注未经验证的数据点}
```

## 4. 后处理

- 将研报保存后，在 `40_MOC/` 下更新或创建对应行业的 MOC 笔记，建立双向链接。
- 提示 Aaron：研报已就绪，可以运行 `/write-script` 生成视频脚本。
