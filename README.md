# MySQL Query Optimization Copilot

[![Release](https://img.shields.io/github/v/release/xb22133/mysql-optimize-assistant?label=release)](https://github.com/xb22133/mysql-optimize-assistant/releases)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-blue)](./README.zh-CN.md)
[![Stack](https://img.shields.io/badge/stack-HTML%20%7C%20CSS%20%7C%20JavaScript%20%7C%20Node.js-111827)](./package.json)
[![Docs](https://img.shields.io/badge/docs-bilingual-0f766e)](./README.zh-CN.md)

[中文文档](./README.zh-CN.md) | [English Guide](./README.en.md) | [Latest Release](https://github.com/xb22133/mysql-optimize-assistant/releases/latest)

A lightweight desktop-friendly tool for analyzing MySQL `SELECT` queries, generating index recommendations, proposing non-invasive SQL rewrites, and simulating `EXPLAIN` improvements.

## Quick Links

- [Quick Start](#quick-start)
- [Highlights](#highlights)
- [Chinese Documentation](./README.zh-CN.md)
- [English Documentation](./README.en.md)
- [Model Config Import Guide](./docs/model-config-import.md)
- [Latest Release](https://github.com/xb22133/mysql-optimize-assistant/releases/latest)

## Highlights

- Paste multiple `CREATE TABLE` statements and build in-memory metadata automatically
- Analyze `SELECT` statements and output:
  - index architecture recommendations
  - zero-intrusion SQL rewrite suggestions
  - heuristic `EXPLAIN` comparison
  - risk warnings with severity levels
- Support two analysis modes:
  - configured LLM verification mode
  - Baidu search enhancement mode
- One-click startup on macOS and Windows
- Optional local API key persistence with clear/reset controls
- Auto-lock verified sessions after 10 minutes of inactivity

## Quick Start

```bash
npm start
```

You can also double-click:

- macOS: `launch.command`
- Windows: `launch.bat`

The launcher will:

- ask for a port, defaulting to `8080`
- start the local server if needed
- open the browser automatically

## Main Files

- `index.html`: UI structure
- `styles.css`: visual design and responsive layout
- `app.js`: state, parsing, analysis, rendering, and client logic
- `server.js`: local static server and proxy APIs
- `start.js`: one-click launcher

## Documentation

- [中文完整说明](./README.zh-CN.md)
- [English full guide](./README.en.md)
- [模型导入模板](./docs/model-config.template.json)
- [模型导入文档](./docs/model-config-import.md)
