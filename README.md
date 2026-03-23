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

## At a Glance

| Module | What It Does | Output |
| --- | --- | --- |
| Schema Parsing | Parses multiple `CREATE TABLE` statements and extracts table metadata | tables, columns, primary keys, existing indexes |
| SQL Optimization | Analyzes `SELECT` statements with local heuristic rules | index suggestions, SQL rewrites, risk warnings |
| Explain Simulation | Simulates before/after execution characteristics | `type`, `rows`, and `Extra` comparison |
| Model Validation | Verifies configurable model endpoints with API keys | validated model session for analysis |
| Baidu Search Enhancement | Adds search-enhanced optimization context | supplemental optimization evidence and refinement |

## 3-Step Quick Start

### 1. Start the App

```bash
npm run manage
```

Or double-click `launch.command` on macOS / `launch.bat` on Windows to open the same management console.

### 2. Paste Schema and SQL

- Paste one or more `CREATE TABLE` statements
- Paste the `SELECT` statement you want to optimize
- Choose either `Configured Model` or `Baidu Search Enhancement`

### 3. Run Analysis and Review Results

- Review index recommendations
- Review non-invasive SQL rewrite suggestions
- Compare simulated `EXPLAIN`
- Check risk levels before applying changes

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
npm run manage
```

You can also double-click:

- macOS: `launch.command`
- Windows: `launch.bat`

The management console will:

- let you change the port
- start the local service
- show current running status
- reopen the app page while the service is running
- stop the service in the same console

## Main Files

- `index.html`: UI structure
- `styles.css`: visual design and responsive layout
- `app.js`: state, parsing, analysis, rendering, and client logic
- `manager.js`: cross-platform launcher for the management console
- `manager-host.js`: local control server for the management console
- `manager.html`: unified management page
- `manager-client.js`: management page interaction logic
- `manager.css`: management page styles
- `server.js`: local static server and proxy APIs
- `start.js`: service starter
- `stop.js`: service stopper

## Documentation

- [中文完整说明](./README.zh-CN.md)
- [English full guide](./README.en.md)
- [模型导入模板](./docs/model-config.template.json)
- [模型导入文档](./docs/model-config-import.md)
