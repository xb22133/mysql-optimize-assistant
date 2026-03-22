const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");

const PORT = Number(process.env.PORT || 8080);
const ROOT = __dirname;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/api/health") {
      sendJson(res, 200, { ok: true, service: "mysql-optimize-local-proxy" });
      return;
    }

    if (req.method === "POST" && req.url === "/api/verify-model") {
      await handleVerify(req, res);
      return;
    }

    if (req.method === "POST" && req.url === "/api/baidu-search-analyze") {
      await handleBaiduSearchAnalyze(req, res);
      return;
    }

    if (req.method === "POST" && req.url === "/api/verify-baidu-search") {
      await handleVerifyBaiduSearch(req, res);
      return;
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      sendJson(res, 405, { error: "Method not allowed" });
      return;
    }

    serveStatic(req, res);
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Internal server error" });
  }
});

server.listen(PORT, () => {
  console.log(`MySQL optimizer app running at http://localhost:${PORT}`);
});

async function handleVerify(req, res) {
  const body = await readJsonBody(req);
  const verifyUrl = String(body.verifyUrl || "").trim();
  const apiKey = String(body.apiKey || "").trim();
  const modelId = String(body.modelId || "").trim();
  const verifyMode = String(body.verifyMode || "").trim() || "models_get";

  if (!verifyUrl) {
    sendJson(res, 400, { error: "缺少完整验证地址 verifyUrl" });
    return;
  }

  if (!apiKey) {
    sendJson(res, 400, { error: "缺少 API Key" });
    return;
  }

  let target;
  try {
    target = new URL(verifyUrl);
  } catch (error) {
    sendJson(res, 400, { error: "验证地址不是合法的 URL" });
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const requestOptions =
      verifyMode === "chat_post"
        ? {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: modelId,
              messages: [{ role: "user", content: "ping" }],
              max_tokens: 1,
            }),
            signal: controller.signal,
          }
        : {
            method: "GET",
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
            signal: controller.signal,
          };

    const response = await fetch(target, requestOptions);

    clearTimeout(timeout);

    const rawText = await response.text();
    let payload = {};
    try {
      payload = rawText ? JSON.parse(rawText) : {};
    } catch (error) {
      payload = { raw: rawText };
    }

    if (!response.ok) {
      sendJson(res, response.status, {
        error: `HTTP ${response.status}: ${trimText(rawText) || "验证失败"}`,
      });
      return;
    }

    if (verifyMode === "models_get") {
      const hasModel =
        !modelId ||
        !payload.data ||
        payload.data.some?.((item) => item.id === modelId) ||
        payload.object === "list";

      if (!hasModel) {
        sendJson(res, 400, { error: `模型 ${modelId} 不存在于返回列表中` });
        return;
      }
    }

    sendJson(res, 200, {
      ok: true,
      message: "验证通过",
      verifyMode,
      modelCount: Array.isArray(payload.data) ? payload.data.length : null,
    });
  } catch (error) {
    clearTimeout(timeout);
    const message =
      error.name === "AbortError" ? "请求超时（5 秒），请检查网络后重试。" : error.message || "请求失败";
    sendJson(res, 502, { error: message });
  }
}

async function handleBaiduSearchAnalyze(req, res) {
  const body = await readJsonBody(req);
  const apiKey = String(body.apiKey || "").trim();
  const schema = String(body.schema || "").trim();
  const sql = String(body.sql || "").trim();

  if (!apiKey) {
    sendJson(res, 400, { error: "缺少百度 API Key" });
    return;
  }

  if (!sql) {
    sendJson(res, 400, { error: "缺少待优化 SQL" });
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch("https://qianfan.baidubce.com/v2/ai_search/chat/completions", {
      method: "POST",
      headers: {
        "X-Appbuilder-Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        stream: false,
        instruction:
          "你是一名资深 MySQL 查询优化专家。请结合搜索结果与输入的表结构、SQL，输出严格 JSON。不要输出 Markdown，不要输出额外解释。",
        messages: [
          {
            role: "user",
            content: buildBaiduSearchPrompt({ schema, sql }),
          },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const rawText = await response.text();

    if (!response.ok) {
      sendJson(res, response.status, {
        error: `HTTP ${response.status}: ${trimText(rawText) || "百度搜索增强调用失败"}`,
      });
      return;
    }

    const payload = tryParseJson(rawText);
    const content = payload?.choices?.[0]?.message?.content || payload?.result || "";
    const parsedResult = extractStructuredResult(content);

    sendJson(res, 200, {
      ok: true,
      result: parsedResult,
      raw: typeof content === "string" ? trimText(content) : "",
    });
  } catch (error) {
    clearTimeout(timeout);
    const message =
      error.name === "AbortError" ? "百度搜索增强请求超时（15 秒），请稍后重试。" : error.message || "百度搜索增强请求失败";
    sendJson(res, 502, { error: message });
  }
}

async function handleVerifyBaiduSearch(req, res) {
  const body = await readJsonBody(req);
  const apiKey = String(body.apiKey || "").trim();

  if (!apiKey) {
    sendJson(res, 400, { error: "缺少百度 API Key" });
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch("https://qianfan.baidubce.com/v2/ai_search/chat/completions", {
      method: "POST",
      headers: {
        "X-Appbuilder-Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        stream: false,
        messages: [
          {
            role: "user",
            content: "请简单返回“验证成功”。",
          },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const rawText = await response.text();

    if (!response.ok) {
      sendJson(res, response.status, {
        error: `HTTP ${response.status}: ${trimText(rawText) || "百度搜索增强验证失败"}`,
      });
      return;
    }

    sendJson(res, 200, { ok: true, message: "验证通过" });
  } catch (error) {
    clearTimeout(timeout);
    const message =
      error.name === "AbortError" ? "百度搜索增强验证超时（10 秒），请稍后重试。" : error.message || "百度搜索增强验证失败";
    sendJson(res, 502, { error: message });
  }
}

function serveStatic(req, res) {
  const reqUrl = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = reqUrl.pathname === "/" ? "/index.html" : reqUrl.pathname;
  const resolvedPath = path.join(ROOT, pathname);
  const normalizedRoot = `${ROOT}${path.sep}`;
  const normalizedResolved = path.normalize(resolvedPath);

  if (!normalizedResolved.startsWith(normalizedRoot) && normalizedResolved !== ROOT) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  fs.stat(normalizedResolved, (statError, stats) => {
    if (statError || !stats.isFile()) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }

    const ext = path.extname(normalizedResolved);
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType });

    if (req.method === "HEAD") {
      res.end();
      return;
    }

    fs.createReadStream(normalizedResolved).pipe(res);
  });
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";

    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });

    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(new Error("请求体不是合法 JSON"));
      }
    });

    req.on("error", reject);
  });
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function trimText(text) {
  return String(text || "").replace(/\s+/g, " ").trim().slice(0, 180);
}

function buildBaiduSearchPrompt({ schema, sql }) {
  return `
请根据以下输入给出 MySQL 优化建议，并严格输出 JSON 对象，字段必须包含：
{
  "afterSummary": "字符串，概括优化方向与依据",
  "indexSql": "字符串，可执行索引 SQL；若无则写 -- 当前未生成新的索引语句",
  "rewrittenSql": "字符串，优化后的完整 SQL；若无需改写可返回原 SQL",
  "explainImprovement": "字符串，概括 Explain 的改善点，例如 type 和 rows 的变化",
  "risks": [{"title":"字符串","body":"字符串"}]
}

约束：
1. 仅输出 JSON，不要输出 Markdown 代码块。
2. 风险必须聚焦索引写入成本、维护成本、误用风险。
3. 如果搜索结果不充分，也要基于 MySQL 常规最佳实践给出谨慎建议。

表结构：
${schema || "未提供表结构"}

待优化 SQL：
${sql}
  `.trim();
}

function tryParseJson(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
}

function extractStructuredResult(content) {
  const fallback = {
    afterSummary: typeof content === "string" ? content : "百度搜索增强未返回结构化结果。",
    indexSql: "-- 当前未生成新的索引语句",
    rewrittenSql: "-- 当前未生成重写 SQL",
    explainImprovement: "",
    risks: [],
  };

  if (typeof content !== "string") {
    return fallback;
  }

  const cleaned = content.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  const direct = tryParseJson(cleaned);
  if (direct && typeof direct === "object") {
    return normalizeStructuredResult(direct, fallback);
  }

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const sliced = cleaned.slice(firstBrace, lastBrace + 1);
    const parsed = tryParseJson(sliced);
    if (parsed && typeof parsed === "object") {
      return normalizeStructuredResult(parsed, fallback);
    }
  }

  return fallback;
}

function normalizeStructuredResult(result, fallback) {
  return {
    afterSummary: String(result.afterSummary || fallback.afterSummary),
    indexSql: String(result.indexSql || fallback.indexSql),
    rewrittenSql: String(result.rewrittenSql || fallback.rewrittenSql),
    explainImprovement: String(result.explainImprovement || ""),
    risks: Array.isArray(result.risks)
      ? result.risks
          .map((item) => ({
            title: String(item?.title || "").trim(),
            body: String(item?.body || "").trim(),
          }))
          .filter((item) => item.title || item.body)
      : fallback.risks,
  };
}
