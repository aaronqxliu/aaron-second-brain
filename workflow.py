"""
Aaron Second Brain — Antigravity SDK Content Pipeline

A fully automated, multi-turn agentic workflow that takes a topic proposal
through evaluation, deep research, and video script generation.

Usage:
    python workflow.py "Cursor (Anysphere)"

Requirements:
    pip install google-antigravity

Environment:
    GEMINI_API_KEY must be set (get one at https://aistudio.google.com/app/api-keys)
"""

import asyncio
import os
import sys
from pathlib import Path

from google.antigravity import Agent, LocalAgentConfig
from google.antigravity.hooks import policy
from google.antigravity.types import TemplatedSystemInstructions


# ──────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────

WORKSPACE_DIR = Path(__file__).resolve().parent
SKILLS_DIR = WORKSPACE_DIR / ".agents" / "skills"
SAVE_DIR = WORKSPACE_DIR / ".agent_state"


def load_file(path: Path) -> str:
    """Load a markdown file from the workspace."""
    if path.exists():
        return path.read_text(encoding="utf-8")
    return ""


def build_system_instructions() -> TemplatedSystemInstructions:
    """Build system instructions from USER.md and MEMORY.md."""
    user_profile = load_file(WORKSPACE_DIR / "USER.md")
    memory = load_file(WORKSPACE_DIR / "MEMORY.md")

    identity = (
        "你是 Aaron 的私人 AI 研究助手，专门为"硅谷引擎舱"频道提供选题评估、"
        "深度研报生成和视频脚本撰写服务。\n\n"
        "你必须严格遵守以下用户画像和合规规则：\n\n"
        f"{user_profile}\n\n"
        "以下是你的跨会话记忆，请据此保持行为一致性：\n\n"
        f"{memory}"
    )
    return TemplatedSystemInstructions(identity=identity)


def build_config() -> LocalAgentConfig:
    """Build the agent configuration with skills, persistence, and safety."""
    SAVE_DIR.mkdir(exist_ok=True)

    return LocalAgentConfig(
        system_instructions=build_system_instructions(),
        skills_paths=[str(SKILLS_DIR)],
        save_dir=str(SAVE_DIR),
        app_data_dir=str(WORKSPACE_DIR / ".agent_artifacts"),
        policies=[policy.allow_all()],  # Local dev — allow code execution
    )


# ──────────────────────────────────────────────
# Pipeline Steps
# ──────────────────────────────────────────────

async def step_propose_and_score(agent: Agent, topic: str) -> str:
    """Step 1: Evaluate the topic's viral potential and scarcity."""
    prompt = f"""
请使用 propose-and-score 技能，严格按照 SKILL.md 中定义的流程，对以下选题进行全面评估：

选题：{topic}

要求：
1. 执行市场先例审计（在 B站、小红书搜索竞品）
2. 执行语义稀缺性评估（检索英文技术研报和白皮书）
3. 计算 EREI 预评分（如果选题涉及具体公司）
4. 输出标准化的选题评估卡片
5. 将评估卡片保存至 10_Inbox/ 目录
"""
    response = await agent.chat(prompt)
    return await response.text()


async def step_deep_research(agent: Agent, topic: str) -> str:
    """Step 2: Conduct deep research and generate the three-ledger report."""
    prompt = f"""
选题「{topic}」已确认立项。请使用 deep-research 技能，执行完整的深度研报生成流程：

要求：
1. 全网抓取该公司/技术的最新公开财务数据和工程技术架构信息
2. 使用 Python code_execution 计算 EREI 2.0 指数
3. 生成包含「工程基础设施账本」「商业运营账本」「VC 创投逻辑」的三账本结构研报
4. 将研报保存至 20_Knowledge_Atlas/ 目录
5. 更新 40_MOC/ 下的相关 MOC 笔记
"""
    response = await agent.chat(prompt)
    return await response.text()


async def step_write_script(agent: Agent, topic: str) -> str:
    """Step 3: Transform the research report into a video script."""
    prompt = f"""
「{topic}」的深度研报已完成。请使用 write-script 技能，将研报转化为视频脚本：

要求：
1. 读取 20_Knowledge_Atlas/ 下最新的研报
2. 严格按照三段论结构（痛点起笔 → 降维解局 → 时代降噪）生成脚本
3. 控制总字数不超过 1800 汉字
4. 包含所有视觉转场标记和 BGM 节点
5. 片尾使用 Aaron 专属 Slogan（逐字不变）
6. 执行质量自检清单并附上结果
7. 将脚本保存至 30_Scripts_Archive/ 目录
"""
    response = await agent.chat(prompt)
    return await response.text()


# ──────────────────────────────────────────────
# Main Pipeline
# ──────────────────────────────────────────────

async def run_content_pipeline(topic: str):
    """Run the full content pipeline: Evaluate → Research → Script."""
    config = build_config()

    async with Agent(config) as agent:
        # ── Step 1: Propose & Score ──
        print(f"\n{'='*60}")
        print(f"🚀 [Step 1/3] 选题评估: {topic}")
        print(f"{'='*60}\n")

        score_result = await step_propose_and_score(agent, topic)
        print(score_result)

        # Check if the topic was rejected
        if "❌" in score_result and "回避" in score_result:
            print("\n⚠️  选题未通过评估，流程终止。请更换选题后重试。")
            return

        # ── Step 2: Deep Research ──
        print(f"\n{'='*60}")
        print(f"🚀 [Step 2/3] 深度研报生成: {topic}")
        print(f"{'='*60}\n")

        research_result = await step_deep_research(agent, topic)
        print(research_result)

        # ── Step 3: Write Script ──
        print(f"\n{'='*60}")
        print(f"🚀 [Step 3/3] 视频脚本生成: {topic}")
        print(f"{'='*60}\n")

        script_result = await step_write_script(agent, topic)
        print(script_result)

        # ── Done ──
        print(f"\n{'='*60}")
        print(f"🎉 Pipeline 完成!")
        print(f"{'='*60}")
        print(f"  📋 评估卡片: 10_Inbox/")
        print(f"  📊 深度研报: 20_Knowledge_Atlas/")
        print(f"  🎬 视频脚本: 30_Scripts_Archive/")
        print(f"{'='*60}\n")


def main():
    if len(sys.argv) < 2:
        print("Usage: python workflow.py \"<topic>\"")
        print("Example: python workflow.py \"Cursor (Anysphere)\"")
        sys.exit(1)

    topic = sys.argv[1]
    asyncio.run(run_content_pipeline(topic))


if __name__ == "__main__":
    main()
