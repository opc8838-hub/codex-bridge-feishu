# codex-bridge-feishu

> 📱💻 Chat with [OpenAI Codex CLI](https://github.com/openai/codex) from Feishu/Lark — code, debug, and refactor from your phone.

**codex-bridge-feishu** is a lightweight Node.js daemon that bridges Feishu/Lark messaging to your local Codex CLI. Send a message in Feishu, and Codex executes in your project directory. Responses are streamed back as real-time cards with live progress, tool execution status, and token usage.

---

## ✨ Why codex-bridge-feishu?

| Advantage | Detail |
|-----------|--------|
| **Code from anywhere** | Phone, tablet, or any device with Feishu — no terminal needed |
| **Real-time streaming** | See Codex thinking and executing live, just like in terminal |
| **Session continuity** | Multi-turn conversations with `/resume` — pick up where you left off |
| **Group collaboration** | Invite the bot to a group chat, your whole team can interact with Codex |
| **Zero public IP** | Feishu WebSocket persistent connection — no port forwarding, no cloud server |
| **Lightweight** | Single Node.js process, ~300MB memory with Codex child process |
| **Dual auth** | Use your ChatGPT/Codex subscription, or an OpenAI API key |
| **Clean abstraction** | Provider pattern — swap Codex for any other AI agent by writing one file |

---

## 🏗️ How It Works

```
┌──────────┐    WebSocket      ┌──────────────────┐    SDK spawn     ┌──────────┐
│  Feishu  │ ◀══════════════▶  │  Bridge Daemon   │ ──────────────▶ │  Codex   │
│   Bot    │   persistent      │   (Node.js)      │   subprocess    │   CLI    │
│          │   connection      │                  │ ◀────────────── │ (local)  │
│  📱→📤   │                   │  config.env       │   JSON stream   │          │
│  📥←📲   │   streaming       │  session store    │                 │ git repo │
│          │   cards + text    │  permissions      │                 │   ~/proj │
└──────────┘                   └──────────────────┘                 └──────────┘
```

### Detailed Flow

1. **Message arrives** — Feishu pushes `im.message.receive_v1` event through persistent WebSocket
2. **Bridge routes** — `bridge.ts` checks for slash commands, then delegates to conversation engine
3. **Codex starts** — `codex-provider.ts` uses `@openai/codex-sdk` to start a Codex thread in the working directory
4. **Events stream** — Codex emits `ThreadEvent` JSON (text deltas, tool calls, tool results, usage)
5. **SSE conversion** — Provider translates Codex events into unified SSE format (`text`, `tool_use`, `tool_result`, `result`)
6. **Card rendering** — `conversation.ts` aggregates SSE events, builds streaming Feishu CardKit cards
7. **Real-time updates** — Each card patch is delivered to Feishu via REST API, giving users live progress

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js >= 20 |
| Language | TypeScript (strict) |
| Codex SDK | `@openai/codex-sdk` v0.130 |
| Feishu SDK | `@larksuiteoapi/node-sdk` v1.60 |
| Bundler | esbuild (zero-config, 50ms builds) |
| Persistence | JSON files in `.bridge/data/` |
| Streaming | Feishu CardKit v2 (streaming cards) |

---

## 📦 Installation

### Prerequisites

- **Node.js >= 20** — `node --version`
- **Codex CLI** — `npm install -g @openai/codex` then `codex login`
- **Feishu self-built app** — see [Feishu Setup](#-feishu-app-setup) below

### Install

```bash
# Clone
git clone https://github.com/opc8838-hub/codex-bridge-feishu.git
cd codex-bridge-feishu

# Install dependencies
npm install

# Build
npm run build
```

### Configure

```bash
cp config.env.example config.env
```

Edit `config.env` with your credentials:

```bash
# ── Required ──
CTI_FEISHU_APP_ID=cli_xxxxxxxxxx        # From Feishu Open Platform
CTI_FEISHU_APP_SECRET=xxxxxxxxxxxxxx    # From Feishu Open Platform
CTI_DEFAULT_WORKDIR=/home/me/projects   # Where Codex runs

# ── Optional ──
CTI_DEFAULT_MODE=code                   # code | plan | ask
# CTI_DEFAULT_MODEL=                    # Leave empty for ChatGPT Plus auto-select
CTI_FEISHU_DOMAIN=feishu                # feishu | lark
CTI_FEISHU_REQUIRE_MENTION=true         # @bot in group chats
CTI_AUTO_APPROVE=true                   # Recommended for Codex

# ── OpenAI API (choose one) ──
# Option A: ChatGPT/Codex subscription (no config needed, just run `codex login`)
# Option B: API key
# OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx
# OPENAI_BASE_URL=https://api.openai.com/v1
```

### Authentication

| Method | Setup | Best For |
|--------|-------|----------|
| **ChatGPT / Codex subscription** | `codex login` in terminal | Individual developers with subscription |
| **OpenAI API key** | Set `OPENAI_API_KEY` in `config.env` | Pay-as-you-go, team shared keys |
| **Third-party API** | Set `OPENAI_API_KEY` + `OPENAI_BASE_URL` | Custom endpoints |

> ⚠️ **ChatGPT Plus users**: Leave `CTI_DEFAULT_MODEL` empty (commented out). Codex will auto-detect a compatible model. Forcing a specific model like `gpt-5` will cause a "not supported" error.

### Start

```bash
# Foreground (testing)
npm start

# Daemon — auto-restart on crash (macOS)
bash scripts/daemon.sh start
bash scripts/daemon.sh status
bash scripts/daemon.sh logs

# Windows / Linux — use pm2 or similar
pm2 start dist/daemon.mjs --name codex-bridge-feishu
```

### Verify

```bash
bash scripts/daemon.sh logs
```

You should see:
```
[info]: client ready
[info]: event-dispatch is ready
[info]: ws client ready
```

Then send any message to the bot in Feishu — it should reply via Codex.

---

## 🔧 Feishu App Setup

1. Go to [Feishu Open Platform](https://open.feishu.cn/app) → **Create enterprise self-built app**
2. Enable **Bot** capability
3. **Events & Callbacks** → select **Use persistent connection** (WebSocket)
4. Subscribe to event: `im.message.receive_v1`
5. Add permissions:
   - `im:message` — Send messages
   - `im:message.receive_v1` — Receive messages
   - `im:message:readonly` — Read messages
   - `im:resource` — Upload/download files
   - `im:chat:readonly` — Read chat info
   - `im:message.reactions:write_only` — Typing indicator
   - `cardkit:card` — Streaming cards
6. **Publish** and activate

---

## 📖 Usage

### Chat Normally

Once the bridge is running, just send a message to the Feishu bot. Codex will:

1. Read your message as a prompt
2. Execute in the configured working directory
3. Stream thinking, tool calls, and final response as a live card

### Slash Commands

| Command | Action |
|---------|--------|
| `/new` | Start a fresh session |
| `/resume <id>` | Continue a previous session |
| `/list` | Show recent sessions |
| `/delete <id>` | Delete a session |
| `/model <name>` | Switch the model |
| `/mode code` | Switch to code mode |
| `/mode plan` | Switch to plan mode |
| `/mode ask` | Switch to ask mode |
| `/usage` | Token usage for current session |
| `/usage_all` | Token usage across all sessions |
| `/help` | Show available commands |

### Group Chat

Invite the bot to a group chat. By default, the bot only responds when `@mention`ed. Set `CTI_FEISHU_REQUIRE_MENTION=false` to let it respond to every message.

---

## 🏛️ Architecture

```
src/
├── main.ts              # Entry point, process lifecycle, watchdog
├── config.ts            # config.env loader
├── types.ts             # Shared TypeScript types & interfaces
├── codex-provider.ts    # Codex SDK → unified SSE stream
├── conversation.ts      # SSE → streaming CardKit cards
├── bridge.ts            # Message router, slash commands, /help
├── feishu.ts            # Feishu WebSocket + REST API client
├── feishu-markdown.ts   # Markdown → Feishu CardKit JSON converter
├── store.ts             # JSON-file session store (.bridge/data/)
├── permissions.ts       # Pending permission/approval queue
├── delivery.ts          # Stream delivery with rate limiting
├── validators.ts        # Input validation & sanitization
├── session-scanner.ts   # Discover existing Codex sessions
└── logger.ts            # Structured logging with secret redaction
```

### Design Principles

- **Provider abstraction** — only `codex-provider.ts` knows about Codex. Swap it to support any other AI agent.
- **Unified SSE format** — all providers emit the same `text | tool_use | tool_result | result | error` events.
- **Card streaming engine** — `conversation.ts` is provider-agnostic. It just consumes SSE and renders cards.
- **Clean shutdown** — SIGTERM/SIGINT gracefully close Codex threads and deny pending permissions.

---

## 🚀 Quick Comparison

| Feature | codex-bridge-feishu | codex CLI alone |
|---------|---------------------|-----------------|
| Access from phone | ✅ Feishu app | ❌ Terminal only |
| Group collaboration | ✅ Invite bot to group | ❌ |
| Multi-turn sessions | ✅ `/resume` | ✅ `codex resume` |
| Streaming response | ✅ Real-time cards | ✅ Terminal |
| Image attachments | ✅ Paste in Feishu | ✅ `--image` flag |
| Session management | ✅ `/list`, `/delete` | ❌ Manual file management |
| Multi-project | ✅ Per-session `workDir` | ❌ One cwd at a time |
| OTA updates | ✅ Just `git pull` | ❌ `npm update -g` |

---

## 🔒 Security

- **No cloud proxy** — Codex runs locally on your machine. Messages pass through Feishu's encrypted WebSocket.
- **Secret redaction** — Logger automatically strips `token`, `secret`, `password`, `api_key` patterns from logs.
- **Access control** — Optional `CTI_FEISHU_ALLOWED_USERS` whitelist.
- **Auto-approve** — Recommended for Codex since interactive permission forwarding is not supported. Use `CTI_AUTO_APPROVE=true`.

---

## 📄 License

MIT
