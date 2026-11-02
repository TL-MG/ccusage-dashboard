# ccusage-dashboard

一个仅在本机运行的编码 Agent Token 用量看板，由 [ccusage](https://github.com/ccusage/ccusage) 提供数据。支持 Claude Code、Codex、OpenCode 等编码 CLI，无需单独安装 ccusage。

本项目是独立社区项目，不是 ccusage 官方产品，也未获得其作者背书。ccusage 及其他产品名称仅用于描述数据来源和兼容性，相关权利归各自所有者。

## 一键启动

要求 Node.js **22.13 或更高版本**：

```bash
npx -y -p ccusage-dashboard@latest ccusage-dashboard
```

启动后会自动打开默认浏览器，地址默认为：

```text
http://127.0.0.1:8787
```

也可以全局安装：

```bash
npm install -g ccusage-dashboard
ccusage-dashboard
```

> npm 包已经包含构建后的 Web 页面、服务端和 ccusage 运行时依赖，不需要克隆本仓库。

## CLI 参数

```text
ccusage-dashboard [options]

-p, --port <port>      监听端口，默认 8787；0 表示自动选择空闲端口
    --host <host>     回环地址：127.0.0.1、localhost 或 ::1
    --ccusage <path>  指定自定义 ccusage 可执行文件
    --no-open         不自动打开浏览器
-v, --version         输出版本
-h, --help            输出帮助
```

示例：

```bash
# 使用 9000 端口，不自动打开浏览器
npx -y -p ccusage-dashboard@latest ccusage-dashboard --port 9000 --no-open

# 自动选择空闲端口
npx -y -p ccusage-dashboard@latest ccusage-dashboard --port 0

# 使用已有的 ccusage
npx -y -p ccusage-dashboard@latest ccusage-dashboard --ccusage /path/to/ccusage
```

也可通过 `CCUSAGE_BIN` 环境变量指定 ccusage。

## 功能

- 按 Agent、日、周、月统计 Token 用量
- 自定义时间范围和快捷时间筛选
- 按 Agent 堆叠趋势和按时间汇总趋势
- 柱状图 / 折线图切换
- Total / Input / Output / Cache Read / Cache Write 指标切换
- 从图表或明细表下钻到对应时间窗口的会话排行
- 会话搜索、排序和 Session ID 复制
- 桌面端和移动端布局

## 数据与隐私

- 服务仅监听本机回环地址，不上传 Token、项目路径或会话数据。
- 时区固定为 `Asia/Shanghai`，起止日期均包含。
- Token 字段完全沿用 ccusage；Total Tokens 包含输入、输出和缓存 Token。
- 所有查询使用 `--offline` 读取本地定价缓存，避免等待在线定价请求；页面不依赖费用数据。
- 趋势使用统一报告的 `--by-agent` 和 `--sections daily,weekly,monthly`。
- 会话使用 `ccusage <agent> session`，按所选时间窗口重新统计。
- 查询结果缓存 30 秒，点击刷新可绕过缓存。

## 本地开发

要求 Node.js 22.13+ 和 pnpm 11：

```bash
pnpm install
pnpm dev
```

- Web：<http://127.0.0.1:5173>
- API：<http://127.0.0.1:8787>

### 检查与构建

```bash
pnpm typecheck
pnpm test
pnpm build
```

构建产物：

```text
dist/cli.js   npm CLI 和服务端
dist/web/     前端静态资源
```

运行构建版本：

```bash
pnpm start
```

打开 <http://127.0.0.1:8787>。

## 发布 npm（维护者）

```bash
npm login
pnpm test
pnpm build
npm pack --dry-run
npm publish --access public
```

`prepack` 会自动重新构建，`prepublishOnly` 会执行测试。`files` 白名单确保压缩包只包含运行所需产物、README、LICENSE 和第三方声明。

发布后在与源码不同的目录验证：

```bash
npx -y -p ccusage-dashboard@latest ccusage-dashboard
```

## License

本项目使用 [MIT](LICENSE)。上游归属和非官方声明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)；实际前端打包依赖的完整许可与 NOTICE 文本由构建过程生成到 `dist/web/THIRD_PARTY_LICENSES.txt`。
