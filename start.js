const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const net = require("node:net");
const { spawn, spawnSync } = require("node:child_process");

const DEFAULT_PORT = "8080";
const LOG_DIR = path.join(__dirname, "logs");
const LAUNCH_LOG_FILE = path.join(LOG_DIR, "launcher.log");
const SERVER_STDOUT_LOG_FILE = path.join(LOG_DIR, "server.stdout.log");
const SERVER_STDERR_LOG_FILE = path.join(LOG_DIR, "server.stderr.log");

void main();

async function main() {
  ensureLogDir();

  try {
    const port = promptForPort();
    if (!port) {
      writeLaunchLog("Launch cancelled by user.");
      console.log("Launch cancelled.");
      return;
    }

    const appUrl = `http://localhost:${port}`;
    const healthUrl = `http://127.0.0.1:${port}/api/health`;

    writeLaunchLog(`Launch requested on port ${port}. Node ${process.version}.`);

    const alreadyRunning = await isAppHealthy(healthUrl);
    if (!alreadyRunning) {
      const portOpen = await isPortOpen("127.0.0.1", Number(port));
      if (portOpen) {
        const message = `Port ${port} is already in use by another process. Please choose another port.`;
        writeLaunchLog(message);
        throw new Error(`${message} Logs: ${LAUNCH_LOG_FILE}`);
      }

      spawnServer(port);
      await waitForHealth(healthUrl, port);
    }

    openBrowser(appUrl);
    writeLaunchLog(`App opened successfully at ${appUrl}.`);
    console.log(`MySQL optimizer opened at ${appUrl}`);
  } catch (error) {
    writeLaunchLog(`Launch failed: ${error.message || error}`);
    console.error("Failed to launch app:", error.message || error);
    process.exitCode = 1;
  }
}

function ensureLogDir() {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function writeLaunchLog(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFileSync(LAUNCH_LOG_FILE, line, "utf8");
}

function spawnServer(port) {
  const stdoutFd = fs.openSync(SERVER_STDOUT_LOG_FILE, "a");
  const stderrFd = fs.openSync(SERVER_STDERR_LOG_FILE, "a");

  const child = spawn(process.execPath, ["server.js"], {
    cwd: __dirname,
    detached: true,
    stdio: ["ignore", stdoutFd, stderrFd],
    env: {
      ...process.env,
      PORT: String(port),
    },
  });

  writeLaunchLog(`Spawned server process pid=${child.pid} on port ${port}.`);
  child.unref();
}

async function isAppHealthy(healthUrl) {
  try {
    const response = await httpRequest(healthUrl, { method: "GET", timeoutMs: 2000 });
    return response.statusCode === 200;
  } catch (error) {
    return false;
  }
}

async function waitForHealth(healthUrl, port) {
  const deadline = Date.now() + 15000;

  while (Date.now() < deadline) {
    if (await isAppHealthy(healthUrl)) {
      writeLaunchLog(`Health check passed on port ${port}.`);
      return;
    }

    await sleep(400);
  }

  const stdoutTail = readTail(SERVER_STDOUT_LOG_FILE);
  const stderrTail = readTail(SERVER_STDERR_LOG_FILE);
  const portOpen = await isPortOpen("127.0.0.1", Number(port));
  const reason = portOpen
    ? `Port ${port} responded but /api/health did not become ready.`
    : `Server process did not open port ${port}.`;

  throw new Error(
    `${reason} Please check logs:\n- ${LAUNCH_LOG_FILE}\n- ${SERVER_STDOUT_LOG_FILE}\n- ${SERVER_STDERR_LOG_FILE}\n` +
      `${stdoutTail ? `Recent stdout:\n${stdoutTail}\n` : ""}` +
      `${stderrTail ? `Recent stderr:\n${stderrTail}` : ""}`.trim(),
  );
}

function readTail(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return "";
    }

    const text = fs.readFileSync(filePath, "utf8");
    const lines = text.trim().split(/\r?\n/);
    return lines.slice(-8).join("\n");
  } catch (error) {
    return "";
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function promptForPort() {
  const platform = process.platform;

  if (platform === "darwin") {
    return promptForPortMac();
  }

  if (platform === "win32") {
    return promptForPortWindows();
  }

  return DEFAULT_PORT;
}

function promptForPortMac() {
  const script = `
    try
      display dialog "请输入启动端口号（默认 8080）" default answer "${DEFAULT_PORT}" buttons {"取消", "确认"} default button "确认"
      return text returned of result
    on error number -128
      return "__CANCEL__"
    end try
  `;

  const result = spawnSync("osascript", ["-e", script], {
    cwd: __dirname,
    encoding: "utf8",
  });

  const value = String(result.stdout || "").trim();
  return normalizePortInput(value);
}

function promptForPortWindows() {
  const script = `
Add-Type -AssemblyName Microsoft.VisualBasic
$value = [Microsoft.VisualBasic.Interaction]::InputBox('请输入启动端口号（默认 8080）', '启动项目', '${DEFAULT_PORT}')
if ([string]::IsNullOrWhiteSpace($value)) { Write-Output '__CANCEL__' } else { Write-Output $value }
  `.trim();

  const result = spawnSync("powershell", ["-NoProfile", "-Command", script], {
    cwd: __dirname,
    encoding: "utf8",
  });

  const value = String(result.stdout || "").trim();
  return normalizePortInput(value);
}

function normalizePortInput(value) {
  if (!value || value === "__CANCEL__") {
    return null;
  }

  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    throw new Error("Port must be a number.");
  }

  const port = Number(trimmed);
  if (port < 1 || port > 65535) {
    throw new Error("Port must be between 1 and 65535.");
  }

  return String(port);
}

function openBrowser(url) {
  const platform = process.platform;

  if (platform === "darwin") {
    spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
    return;
  }

  if (platform === "win32") {
    spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
    return;
  }

  spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
}

function httpRequest(urlString, options = {}) {
  const { method = "GET", timeoutMs = 5000 } = options;

  return new Promise((resolve, reject) => {
    const request = http.request(urlString, { method, timeout: timeoutMs }, (response) => {
      response.setEncoding("utf8");
      let body = "";
      response.on("data", (chunk) => {
        body += chunk;
      });
      response.on("end", () => {
        resolve({
          statusCode: response.statusCode || 0,
          body,
        });
      });
    });

    request.on("timeout", () => {
      request.destroy(new Error("Request timeout"));
    });

    request.on("error", (error) => {
      reject(error);
    });

    request.end();
  });
}

function isPortOpen(host, port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });

    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });

    socket.once("error", () => {
      resolve(false);
    });

    socket.setTimeout(1500, () => {
      socket.destroy();
      resolve(false);
    });
  });
}
