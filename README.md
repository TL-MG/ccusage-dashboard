# ccusage UI

一个仅在本机运行的 Token 用量看板，数据由 `ccusage` 提供，支持：

- 按 Claude Code、Codex、OpenCode 等编码 CLI 查看 Token 用量
- 自定义时间范围，按日、周、月统计
- 按 Agent 堆叠趋势和按时间汇总趋势
- Total / Input / Output / Cache Read / Cache Write 指标切换
- 从图表或明细表下钻到对应时间窗口的会话排行
- 会话搜索、排序和 Session ID 复制

## 环境要求

- Node.js 22.13 或更高版本
- pnpm 11
- 本机可执行的 `ccusage`（已在 20.0.45 上验证）

## 启动

```bash
pnpm install
pnpm dev
```

打开 <http://127.0.0.1:5173>。

如果当前 shell 仍是 Node 18，本机可先执行 `fnm use system` 切换到已安装的 Node 22.13.1，再运行上述命令。

- Web：Vite，默认 `127.0.0.1:5173`
- API：Fastify，默认 `127.0.0.1:8787`
- API 仅监听回环地址，不上传用量、项目路径或会话数据

## 生产运行

```bash
pnpm build
pnpm start
```

打开 <http://127.0.0.1:8787>。

## 检查

```bash
pnpm typecheck
pnpm test
pnpm build
```

## 数据口径

- 时区固定为 `Asia/Shanghai`，起止日期均包含。
- Token 字段完全沿用 ccusage；Total Tokens 包含输入、输出和缓存 Token。
- 趋势接口使用统一报告的 `--by-agent` 和 `--sections daily,weekly,monthly`。
- 会话接口使用 `ccusage <agent> session`，避免当前统一 session 报告日期过滤异常。
- 周/月下钻使用实际周期起止日期，并裁剪到页面筛选范围。
- 查询结果缓存 30 秒；点击刷新可绕过缓存。

如需指定其他 ccusage 可执行文件，可设置 `CCUSAGE_BIN`；API 端口可通过 `PORT` 修改。
