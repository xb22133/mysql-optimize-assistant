# MySQL Query Optimization Copilot

A lightweight local tool for MySQL query analysis. It parses multiple table definitions, analyzes `SELECT` statements, generates index recommendations, proposes non-invasive SQL rewrites, and provides heuristic `EXPLAIN` comparisons to help teams make faster optimization decisions.

## Use Cases

- Quickly review whether a query is missing useful indexes
- Perform a first-pass analysis when you only have DDL and SQL text
- Explore rewrite options when schema changes are not allowed
- Demonstrate SQL tuning workflows to teammates or stakeholders

## Core Features

- Multi-table schema input
  - Paste multiple `CREATE TABLE` statements at once
  - Parse table names, columns, primary keys, and existing indexes
  - Append schema incrementally with a modal input flow

- Query optimization outputs
  - index architecture recommendations
  - zero-intrusion SQL rewrite suggestions
  - heuristic `EXPLAIN` comparison
  - risk warnings with severity levels
  - result-source layering for better trust and reviewability

- Model configuration
  - manage model definitions manually
  - import, merge, and export JSON configs
  - support both `GET /models` and `POST /chat/completions`
  - auto-suggest verification URL and mode from common `modelId` patterns
  - smart hints when a verification URL looks incomplete

- Baidu search enhancement
  - integrate with Baidu official search-generation API
  - combine search-enhanced output with local heuristic analysis
  - clearly mark search-based content as supplemental

- Security and usability
  - optional API key persistence
  - one-click clear/reset
  - automatic session lock after 10 minutes of inactivity
  - exported model configs exclude API keys by default

## Analysis Modes

### 1. Configured Model

Best when you already have access to an LLM service, an OpenAI-compatible gateway, or an internal model endpoint.

Suggested flow:

1. Maintain models in the configuration center
2. Pick the active model
3. Enter the API key
4. Click `Verify and Enable`
5. Run analysis

### 2. Baidu Search Enhancement

Best when you want search-assisted optimization ideas and external context to complement local heuristics.

Suggested flow:

1. Switch analysis mode to `Baidu Search Enhancement`
2. Enter a Baidu API key
3. Click `Verify and Enable`
4. Run analysis

Notes:

- Search enhancement is not meant to replace rule-based analysis
- The UI explicitly labels whether a result comes from `Rule-based Analysis` or `Rule-based Analysis + Baidu Search Enhancement`

## Startup

### Command line

```bash
npm start
```

### One-click launch

- macOS: double-click `launch.command`
- Windows: double-click `launch.bat`

The launcher will:

- prompt for a port, default `8080`
- start the local server if needed
- open the browser automatically

If the port dialog is canceled, the launcher exits without opening the app.

## Project Structure

- `index.html`: UI structure
- `styles.css`: styles and responsive layout
- `app.js`: parsing, analysis, state management, and rendering
- `server.js`: local static server and proxy endpoints
- `start.js`: one-click launcher
- `launch.command`: macOS launcher
- `launch.bat`: Windows launcher
- `docs/model-config.template.json`: model import template
- `docs/model-config-import.md`: import guide

## Recommended Workflow

1. Paste schema and SQL
2. Choose an analysis mode
3. If you use a configured model, check:
   - `modelId`
   - full verification URL
   - verification mode
4. If you use Baidu search enhancement, verify the Baidu API key first
5. Review the result area with focus on:
   - index types and rationale
   - SQL rewrite reasons
   - `EXPLAIN` comparison
   - risk levels

## Security Notes

- API key persistence is opt-in
- `Clear / Reset` removes the current input and active in-memory session
- Verified sessions are auto-locked after 10 minutes of inactivity
- Verification and Baidu search enhancement both go through the local proxy to reduce browser-side CORS issues

## Known Limits

- SQL parsing and `EXPLAIN` output are heuristic and should not be treated as real database execution plans
- The tool is best for first-pass review, not as a replacement for `EXPLAIN ANALYZE`, slow query logs, or production-level benchmarking
- OpenAI-compatible providers may still differ in endpoint behavior, so provider documentation should be checked when needed

## GitHub Repository Description

MySQL Query Optimization Copilot is a local tool prototype for parsing multi-table DDL, recommending indexes, generating non-invasive SQL rewrites, simulating `EXPLAIN` improvements, verifying configurable LLM endpoints, and enriching analysis with Baidu search enhancement. It supports one-click startup on both Windows and macOS.
