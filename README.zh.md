# codex-bridge-feishu

中文 | [**English**](./README.md)

> 📱💻 在飞书里操控 [OpenAI Codex CLI](https://github.com/openai/codex) —— 离开电脑也能写代码、改项目、生成文件。

**codex-bridge-feishu** 是一个轻量 Node.js 守护进程，把飞书消息桥接到本地 Codex CLI。飞书发一条消息，Codex 就在你的项目目录里执行，思考和工具调用过程实时流式回传，像终端一样直观。

---

## ✨ 为什么选它？

| 亮点 | 说明 |
|------|------|
| **随时随地写代码** | 手机、平板、任意设备打开飞书就能操控电脑上的 Codex |
| **实时流式卡片** | 工具调用进度、思考过程、运行结果，像看终端一样实时更新 |
| **完全读写权限** | 改代码、跑脚本、Git 提交、装依赖，没有任何限制 |
| **生成文件自动回传** | PPT、图片、视频、文档，Codex 生成完自动推送到飞书对话 |
| **跨会话记忆** | 告诉它一次你的偏好、项目结构，以后每次对话自动带上 |
| **群聊协作** | 把机器人拉进群，全组一起用 |
| **无需公网 IP** | 飞书长连接 WebSocket，不用内网穿透、不用云服务器 |
| **轻量零依赖** | 纯 Node.js，~300MB 内存，不依赖任何云服务 |
| **双重认证** | ChatGPT/Codex 订阅 或 OpenAI API Key 都行 |

---

## 🏗️ 工作原理

```
┌──────────┐    WebSocket      ┌──────────────────┐    SDK 启动      ┌──────────┐
│  飞书 Bot │ ◀══════════════▶  │  Bridge Daemon   │ ─────────────▶ │  Codex   │
│          │   长连接实时推送    │   (Node.js)      │   子进程        │   CLI    │
│  📱→📤   │                   │                  │ ◀───────────── │ (本地)   │
│  📥←📲   │   流式卡片+文件    │  config.env       │   JSON 事件流   │          │
│          │                   │  session store    │                 │ git 仓库 │
└──────────┘                   └──────────────────┘                 └──────────┘
```

### 详细流程

1. **消息到达** — 飞书通过 WebSocket 长连接推送 `im.message.receive_v1` 事件
2. **桥接路由** — `bridge.ts` 识别斜杠命令，否则交给对话引擎
3. **启动 Codex** — `codex-provider.ts` 通过 `@openai/codex-sdk` 在工作目录启动 Codex 线程
4. **事件流** — Codex 输出 `ThreadEvent` 流（文字增量、工具调用、结果、用量）
5. **SSE 转换** — Provider 把 Codex 事件转成统一 SSE 格式
6. **卡片渲染** — `conversation.ts` 拼装流式 Feishu CardKit 卡片
7. **实时更新** — 卡片增量通过 REST API 推送到飞书，用户看到实时进度

---

## 📦 安装

### 前置条件

- **Node.js >= 20**
- **Codex CLI** — `npm install -g @openai/codex`，然后 `codex login`
- **飞书自建应用** — 见下方 [飞书配置](#-飞书应用配置)

### 平台支持

| 平台 | 状态 | 守护进程 |
|------|------|----------|
| **macOS** | ✅ 完整支持 | `launchd`（`scripts/daemon.sh`） |
| **Linux** | ✅ 完整支持 | `systemd` 或 `pm2` |
| **Windows** | ✅ 完整支持 | `pm2` 或任务计划程序 |

### 安装步骤

```bash
git clone https://github.com/opc8838-hub/codex-bridge-feishu.git
cd codex-bridge-feishu
npm install
npm run build
```

### 配置

```bash
cp config.env.example config.env
```

编辑 `config.env`：

```bash
# ── 必填 ──
CTI_FEISHU_APP_ID=cli_xxxxxxxxxx        # 飞书开放平台获取
CTI_FEISHU_APP_SECRET=xxxxxxxxxxxxxx    # 飞书开放平台获取
CTI_DEFAULT_WORKDIR=/home/me/projects   # Codex 工作目录

# ── 可选 ──
CTI_DEFAULT_MODE=code                   # code | plan | ask
# CTI_DEFAULT_MODEL=                    # ChatGPT Plus 用户不要填
CTI_AUTO_APPROVE=true                   # 推荐开启，允许 Codex 自由操作
```

### 认证方式

| 方式 | 操作 | 适合 |
|------|------|------|
| **ChatGPT / Codex 订阅** | 终端执行 `codex login` | 有订阅的个人开发者 |
| **OpenAI API Key** | 在 `config.env` 里设 `OPENAI_API_KEY` | 按量付费 |
| **第三方 API** | 设 `OPENAI_API_KEY` + `OPENAI_BASE_URL` | 自定义端点 |

> ⚠️ **ChatGPT Plus 用户**：不要设置 `CTI_DEFAULT_MODEL`，让 Codex 自动选择模型。

### 启动

```bash
# 前台测试（所有平台通用）
npm start
```

**macOS (launchd)：**

```bash
bash scripts/daemon.sh start
bash scripts/daemon.sh status
bash scripts/daemon.sh logs
```

**Linux (systemd)：**

```bash
sudo cp scripts/codex-bridge-feishu.service /etc/systemd/system/
sudo systemctl enable --now codex-bridge-feishu
sudo journalctl -u codex-bridge-feishu -f
```

**Windows / Linux / macOS (pm2 通用方案)：**

```bash
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save    # 开机自启
```

看到以下输出即表示成功：

```
[info]: client ready
[info]: event-dispatch is ready
[info]: ws client ready
```

---

## 🔧 飞书应用配置

1. 打开 [飞书开放平台](https://open.feishu.cn/app) → **创建企业自建应用**
2. 启用 **机器人** 能力
3. **事件与回调** → 选择 **使用长连接接收事件**
4. 订阅事件：`im.message.receive_v1`
5. 添加权限：
   - `im:message` — 发送消息
   - `im:message.receive_v1` — 接收消息
   - `im:message:readonly` — 读取消息
   - `im:resource` — 上传/下载文件
   - `im:chat:readonly` — 读取群信息
   - `im:message.reactions:write_only` — 输入中状态
   - `cardkit:card` — 流式卡片
6. **发布** 并激活

---

## 📖 使用指南

### 普通对话

桥接器启动后，直接在飞书给机器人发消息。Codex 会读取你的消息，在执行目录里工作，把思考和工具调用实时流回飞书。

### 斜杠命令

| 命令 | 说明 |
|------|------|
| `/new` | 开启新会话 |
| `/resume <id>` | 恢复之前的会话 |
| `/list` | 查看最近会话 |
| `/delete <id>` | 删除会话 |
| `/mode code` | 切换到代码模式 |
| `/mode plan` | 切换到计划模式 |
| `/mode ask` | 切换到问答模式 |
| `/usage` | 当前会话 Token 用量 |
| `/usage_all` | 所有会话 Token 用量 |
| `/memory` | 查看跨会话记忆 |
| `/help` | 显示帮助 |

### 记忆层

桥接器维护一个持久记忆文件 `~/.codex-bridge-memory.md`。每次对话前，文件内容会自动拼到你的消息前面作为上下文。Codex 会记住你的偏好、项目结构、编码规范，跨会话持久保留。

**工作流程：**

```
用户消息 → 读取 ~/.codex-bridge-memory.md → 拼接提示词 → Codex 看到：
  [持久记忆 — 关于用户偏好、项目上下文、常用设置]
  用户的项目在 C:\projects，用 TypeScript + Vue3...
  ---
  [用户消息]
  帮我修复登录 Bug
```

**设置记忆：** 在飞书里直接告诉 Codex 你的偏好：

> 记住：我的项目在 C:\projects，用 TypeScript，缩进 2 空格，提交信息用中文。

Codex 会自动更新记忆文件，之后的会话都会自动带上。

**查看/编辑：** 飞书里用 `/memory`，或直接编辑 `~/.codex-bridge-memory.md`。

### 文件回传

Codex 生成的文件（PPT、图片、视频、文档等）会自动上传到飞书，在对话里直接展示。不需要手动传输。

### 群聊

把机器人拉进群聊。默认只响应 `@机器人` 的消息，设置 `CTI_FEISHU_REQUIRE_MENTION=false` 可以响应所有消息。

---

## 🏛️ 架构

```
src/
├── main.ts              # 入口，进程生命周期，看门狗
├── config.ts            # config.env 解析
├── types.ts             # TypeScript 类型定义
├── codex-provider.ts    # Codex SDK → 统一 SSE 流
├── conversation.ts      # SSE → 流式 CardKit 卡片
├── bridge.ts            # 消息路由，斜杠命令，/help
├── feishu.ts            # 飞书 WebSocket + REST API
├── feishu-markdown.ts   # Markdown → 飞书卡片 JSON
├── store.ts             # JSON 文件会话存储 (.bridge/data/)
├── permissions.ts       # 权限请求队列
├── delivery.ts          # 流式发送（限速/分块/重试）
├── validators.ts        # 输入校验
├── session-scanner.ts   # 已有 Codex 会话发现
└── logger.ts            # 结构化日志（自动脱敏密钥）
```

### 设计原则

- **Provider 抽象** — 只有 `codex-provider.ts` 知道 Codex，换其他 AI 只需写一个新 Provider 文件
- **统一 SSE 格式** — 所有 Provider 输出相同的 `text | tool_use | tool_result | result | error` 事件
- **卡片流式引擎** — `conversation.ts` 不依赖具体 Provider，只消费 SSE 渲染卡片
- **优雅关闭** — SIGTERM/SIGINT 时关闭 Codex 线程、拒绝待处理的权限请求

---

## 🚀 对比

| 能力 | codex-bridge-feishu | 只用 Codex CLI |
|------|---------------------|----------------|
| 手机操控 | ✅ 飞书 App | ❌ 仅终端 |
| 群聊协作 | ✅ 拉机器人进群 | ❌ |
| 多轮会话 | ✅ `/resume` | ✅ `codex resume` |
| 流式响应 | ✅ 实时卡片 | ✅ 终端输出 |
| 图片附件 | ✅ 飞书粘贴 | ✅ `--image` 参数 |
| 会话管理 | ✅ `/list`, `/delete` | ❌ 手动管理 |
| 多项目切换 | ✅ 每次会话独立目录 | ❌ 单目录 |
| 跨会话记忆 | ✅ `MEMORY.md` 持久上下文 | ❌ |
| 文件回传 | ✅ 生成物自动推送飞书 | ❌ |
| 在线更新 | ✅ `git pull` 即更新 | ❌ `npm update -g` |

---

## 🔒 安全

- **无云中转** — Codex 在你本地运行，消息通过飞书加密 WebSocket 传输
- **密钥脱敏** — 日志自动过滤 `token`、`secret`、`password`、`api_key` 等敏感字段
- **访问控制** — 可选 `CTI_FEISHU_ALLOWED_USERS` 白名单
- **自动批准** — 推荐 `CTI_AUTO_APPROVE=true`，Codex 才能自由操作

---

## 📄 开源协议

MIT
