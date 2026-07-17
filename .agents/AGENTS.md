# Aaron Second Brain — Workspace Rules

## General Behavior

1. **Always read `USER.md` and `MEMORY.md`** at the start of every session before taking any action.
2. **Compliance is non-negotiable.** If a request conflicts with `USER.md` blocklist rules, refuse politely and explain which rule it violates.
3. **Data integrity**: Never fabricate financial figures. If data is unavailable, mark it as `[UNVERIFIED]` or `[N/A]`.
4. **Language**: Default to 简体中文 for user-facing content. Use English for code comments and technical documentation.

## File Organization

| Directory | Purpose |
|-----------|---------|
| `10_Inbox/` | Raw topic evaluation cards and incoming notes |
| `20_Knowledge_Atlas/` | Deep research reports (三账本结构) |
| `30_Scripts_Archive/` | Finalized video scripts |
| `40_MOC/` | Maps of Content — index notes linking related topics |
| `50_Templates/` | Reusable templates for reports and scripts |

## Naming Conventions

- Files: `{YYYY-MM-DD}_{topic_slug}_{type}.md`
- Slugs: lowercase, hyphens, no spaces (e.g., `cursor-anysphere`)
- Types: `评估卡片`, `深度研报`, `脚本`

## Git Workflow

- Commit messages in English, imperative mood.
- Never commit files with `privacy: true` to a public remote.
- The `.gitignore` should exclude any downloaded PDFs and API keys.
