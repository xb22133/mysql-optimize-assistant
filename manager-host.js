const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { spawn } = require("node:child_process");

const HOST = "127.0.0.1";
const PORT = 32109;
const ROOT = __dirname;
const LOG_DIR = path.join(ROOT, "logs");
const HOST_LOG_FILE = path.join(LOG_DIR, "manager-host.log");

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "GET" && url.pathname === "/api/manager-health") {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/status") {
      const port = String(url.searchParams.get("port") || "8080");
      const running = await isAppHealthy(port);
      sendJson(res, 200, { ok: true, port, running, url: `http://localhost:${port}` });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/start") {
      const body = await readJson(req);
      const port = String(body.port || "8080");
      const result = await runNodeScript("start.js", ["--port", port, "--no-open"]);
      sendJson(res, result.exitCode === 0 ? 200 : 500, {
        ok: result.exitCode === 0,
        output: result.output,
        port,
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/stop") {
      const body = await readJson(req);
      const port = String(body.port || "8080");
      const result = await runNodeScript("stop.js", ["--port", port]);
      sendJson(res, result.exitCode === 0 ? 200 : 500, {
        ok: result.exitCode === 0,
        output: result.output,
        port,
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/") {
      serveFile(res, path.join(ROOT, "manager.html"), "text/html; charset=utf-8");
      return;
    }

    if (req.method === "GET" && url.pathname === "/manager.css") {
      serveFile(res, path.join(ROOT, "manager.css"), "text/css; charset=utf-8");
      return;
    }

    if (req.method === "GET" && url.pathname === "/manager-client.js") {
      serveFile(res, path.join(ROOT, "manager-client.js"), "application/javascript; charset=utf-8");
      return;
    }

    sendJson(res, 404, { error: "Not found" });
  } catch (error) {
    writeHostLog(`Manager host error: ${error.stack || error.message || error}`);
    sendJson(res, 500, { error: error.message || "Internal error" });
  }
});

fs.mkdirSync(LOG_DIR, { recursive: true });

server.listen(PORT, HOST, () => {
  writeHostLog(`Manager host listening at http://${HOST}:${PORT}`);
});

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function serveFile(res, filePath, contentType) {
  const content = fs.readFileSync(filePath);
  res.writeHead(200, { "Content-Type": contentType });
  res.end(content);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function runNodeScript(script, args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [script, ...args], {
      cwd: ROOT,
      env: process.env,
    });

    let output = "";
    child.stdout.on("data", (chunk) => {
      output += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      output += String(chunk);
    });
    child.on("close", (code) => {
      writeHostLog(`Executed ${script} ${args.join(" ")} exit=${code}`);
      resolve({
        exitCode: code || 0,
        output: output.trim(),
      });
    });
  });
}

function isAppHealthy(port) {
  return new Promise((resolve) => {
    const request = http.request(
      `http://127.0.0.1:${port}/api/health`,
      { method: "GET", timeout: 1500 },
      (response) => {
        resolve(response.statusCode === 200);
      },
    );

    request.on("error", () => resolve(false));
    request.on("timeout", () => {
      request.destroy();
      resolve(false);
    });
    request.end();
  });
}

function writeHostLog(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFileSync(HOST_LOG_FILE, line, "utf8");
}
