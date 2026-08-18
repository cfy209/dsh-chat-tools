# dsh-chat-tools

A pluggable client plugin for **DeepSeek Harness** that makes long conversations easier to navigate and save:

- **折叠回复（Zhihu 风格）**：每一轮 AI 回复完成后，可以折叠成一行，快速往上翻找之前的对话。
- **多选 / 全选**：进入选择模式后，按“轮”勾选对话；支持一键全选当前可见的已完成轮次。
- **导出 Markdown / TXT**：把选中的对话批量保存为本地 `.md` 或 `.txt` 文件。

所有功能都运行在 Harness 的 Web UI 客户端，不需要改后端，也不需要改 Harness 本体。

---

## 功能演示

| 状态 | 说明 |
|---|---|
| 默认 | 每轮 AI 回复底部有一个「折叠回复」按钮 |
| 折叠后 | 该轮 AI 内容收起，只保留你的问题 + 一行「AI 回复已折叠」和「展开回复」 |
| 选择模式 | 点击会话头部「选择」，每轮会出现复选框，头部出现「全选 / 清空 / 导出」 |
| 导出 | 导出当前选中轮次的用户消息和 AI 文本，按对话顺序输出 |

---

## 安装

### 方式一：作为本地插件注入（开发/试用）

```bash
# 在 DSH 注入器环境内
dev_build_plugin {"dir": "D:/path/to/dsh-chat-tools"}
dev_inject_plugin {"dir": "D:/path/to/dsh-chat-tools"}
```

### 方式二：作为 npm/GitHub 包安装

```bash
dsh plugin --profile <name> add @dsh-external/dsh-chat-tools
```

或者手动在 profile 的 `package.json` 中增加依赖，并在 `dsh.profile.bundles` 中加入包名；包内自带 `cordis.patch.yml`，启动时会自动挂载。

---

## 使用

1. 打开任意会话，AI 回复完成后，在回复底部点击 **「折叠回复」**。
2. 需要保存时，点击会话头部 **「选择」**。
3. 勾选要导出的轮次，或点 **「全选」**。
4. 点击 **「导出 Markdown」** 或 **「导出 TXT」**，浏览器会下载文件。

---

## 开发

```bash
# 安装依赖
pnpm install

# 构建 host + client
pnpm build

# 只构建 client（tsdown）
pnpm build:client

# 类型检查（仅 host；client 由 tsdown 打包）
pnpm typecheck
```

### 目录结构

```
dsh-chat-tools/
├── src/
│   ├── index.ts              # host half（无操作，仅占位）
│   └── client/
│       ├── index.ts          # client 插件入口：slot 注册 + 样式 + 多语言
│       ├── store.ts          # 选择/折叠状态
│       ├── export.ts         # Markdown/TXT 导出逻辑
│       └── components.tsx    # 头部工具栏 + 每轮折叠/复选框
├── cordis.patch.yml          # bundle 挂载补丁
├── package.json
└── README.md
```

---

## 实现原理

- 使用 DSH 标准 client slot：
  - `conversation.session.header.utilities` → 头部「选择/导出」工具栏
  - `conversation.chat.assistant-actions` → 每条已完成 AI 回复旁的折叠按钮和复选框（list 槽，可与其它插件共存）
- 折叠通过 DOM 操作隐藏当前轮内 AI/工具/命令节点，保留用户消息。
- 导出通过 `useSession` 读取当前已加载的对话快照，按 `chat.locations.getTurn(turn)` 还原每一轮的消息顺序。

---

## 限制

- 只能选择**当前已加载**的对话轮次（即页面上已经渲染出来的内容）；未加载的历史需要先滚动加载。
- 导出内容只包含用户消息和 AI 文本，不包含工具调用详情、命令输出等内部卡片。
- 折叠/选择状态不持久化，刷新页面后恢复默认。

---

## License

MIT
