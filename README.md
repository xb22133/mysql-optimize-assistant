# MySQL Query Optimization Copilot

[中文文档](./README.zh-CN.md) | [English Guide](./README.en.md)

A lightweight desktop-friendly tool for analyzing MySQL `SELECT` queries, generating index recommendations, proposing non-invasive SQL rewrites, and simulating `EXPLAIN` improvements.

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
