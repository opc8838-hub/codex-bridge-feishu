# CLAUDE.md — Setup Guide for AI Assistants

When a user clones this project and asks you to help set it up, follow these steps.

## What This is

Feishu Codex Bridge — a Node.js daemon that connects Feishu/Lark to OpenAI Codex CLI. Users chat with a bot in Feishu, the daemon calls Codex via `@openai/codex-sdk`, and streams responses back as real-time cards.

## Prerequisites

- **Node.js >= 20** (`node --version`)
- **Codex CLI** installed and authenticated (`codex --version`)
- **Feishu enterprise self-built app** (see Feishu App Setup below)

## Install & Build

```bash
cd /path/to/codex-bridge-feishu
npm install
npm run build
```

`npm run build` uses esbuild to bundle `src/` → `dist/daemon.mjs`.

## Configure

```bash
cp config.env.example config.env
```

Edit `config.env`:

```bash
# ── Required ──
CTI_FEISHU_APP_ID=cli_xxxxxxxxxx
CTI_FEISHU_APP_SECRET=xxxxxxxxxxxxxxxx
CTI_DEFAULT_WORKDIR=/path/to/your/project

# ── Optional ──
CTI_FEISHU_DOMAIN=feishu            # "feishu" or "lark"
CTI_DEFAULT_MODE=code               # code / plan / ask
CTI_DEFAULT_MODEL=                # Optional — leave empty for ChatGPT Plus auto-select
CTI_FEISHU_REQUIRE_MENTION=true     # Require @bot in group chats
# CTI_FEISHU_ALLOWED_USERS=ou_xxx   # Access control (comma-separated)
CTI_AUTO_APPROVE=true               # Auto-approve tool executions (recommended)
# CTI_CODEX_EXECUTABLE=/path/to/codex  # Override CLI path

# ── OpenAI API (if using API key instead of ChatGPT subscription) ──
# OPENAI_API_KEY=your-key
# OPENAI_BASE_URL=https://your-provider.com/v1
```

## Feishu App Setup

In the [Feishu Open Platform](https://open.feishu.cn/app):

1. Create enterprise self-built app
2. Enable **Bot** capability
3. Go to **Events & Callbacks** → select **Use persistent connection** (WebSocket)
4. Subscribe to event: `im.message.receive_v1`
5. Add scopes:
   - `im:message` — Send messages
   - `im:message.receive_v1` — Receive messages
   - `im:message:readonly` — Read messages
   - `im:resource` — Upload/download resources
   - `im:chat:readonly` — Read chat list
   - `im:message.reactions:write_only` — Typing indicator
   - `cardkit:card` — CardKit v2 streaming cards
6. Publish app version

## Start

```bash
# Daemon mode (macOS launchd, auto-restarts on crash)
bash scripts/daemon.sh start

# Check status
bash scripts/daemon.sh status

# View logs
bash scripts/daemon.sh logs

# Stop
bash scripts/daemon.sh stop
```

Or foreground for debugging: `npm run dev` or `npm start` (requires build first)

> `daemon.sh` is macOS-only (uses launchd). On other platforms, use `npm run dev` or a process manager like pm2 / systemd.

## Verify It Works

```bash
bash scripts/daemon.sh logs
```

Look for these lines in order:
1. `[ws] client ready` — REST client initialized
2. `[feishu] Started (botOpenId: ou_xxx)` — Bot identity resolved
3. `[ws] ws client ready` — WebSocket connected

Then send any message to the bot in Feishu. It should reply via Codex.

## Development

```bash
npm run typecheck              # TypeScript check (tsc --noEmit)
npm run dev                    # Foreground mode
npm run build                  # Production build
```

## Key Differences from feishu-claude-bridge

| Feature | Claude Bridge | Codex Bridge |
|---------|--------------|--------------|
| Provider SDK | `@anthropic-ai/claude-agent-sdk` | `@openai/codex-sdk` |
| Permission forwarding | Supported (1/2/3 quick reply) | Not supported — use `CTI_AUTO_APPROVE=true` |
| Session discovery | `~/.claude/projects/` | `~/.codex/session_index.jsonl` |
| Session resume | `/resume <session_id>` | `/resume <thread_id>` |
| Auth | `ANTHROPIC_API_KEY` | `OPENAI_API_KEY` or ChatGPT subscription |

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Cannot start: missing appId or appSecret` | Check `config.env` exists in the project root and has credentials |
| WebSocket doesn't connect | Enable "使用长连接接收事件" in Feishu dev console |
| Bot doesn't respond in group | @mention the bot, or set `CTI_FEISHU_REQUIRE_MENTION=false` |
| Permission denied / 403 | Add missing scopes in Feishu dev console and republish |
| `codex` CLI not found | Install Codex CLI, or set `CTI_CODEX_EXECUTABLE` |
| Card rendering fails | Add `cardkit:card` scope and republish |
| Codex auth error | Run `codex login` or set `OPENAI_API_KEY`. If using ChatGPT Plus, do NOT set CTI_DEFAULT_MODEL — leave it empty so Codex auto-selects a compatible model. |
| Codex permission stuck | Set `CTI_AUTO_APPROVE=true` — interactive permission not supported |
