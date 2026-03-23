const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { spawn } = require("node:child_process");

const MANAGER_PORT = 32109;
const LOG_DIR = path.join(__dirname, "logs");
const MANAGER_LOG_FILE = path.join(LOG_DIR, "manager-launcher.log");

void main();

async function main() {
  fs.mkdirSync(LOG_DIR, { recursive: true });

  try {
    const managerUrl = `http://127.0.0.1:${MANAGER_PORT}`;
    if (!(await isHealthy(managerUrl))) {
      spawnManagerHost();
      await waitForHealth(managerUrl);
    }

    openBrowser(managerUrl);
    writeLog(`Opened manager UI at ${managerUrl}`);
  } catch (error) {
    writeLog(`Failed to open manager UI: ${error.message || error}`);
    console.error("Failed to open manager UI:", error.message || error);
    process.exitCode = 1;
  }
}

function spawnManagerHost() {
  const stdoutFd = fs.openSync(path.join(LOG_DIR, "manager-host.stdout.log"), "a");
  const stderrFd = fs.openSync(path.join(LOG_DIR, "manager-host.stderr.log"), "a");

  const child = spawn(process.execPath, ["manager-host.js"], {
    cwd: __dirname,
    detached: true,
    stdio: ["ignore", stdoutFd, stderrFd],
  });

  writeLog(`Spawned manager host pid=${child.pid}.`);
  child.unref();
}

function isHealthy(baseUrl) {
  return new Promise((resolve) => {
    const request = http.request(`${baseUrl}/api/manager-health`, { method: "GET", timeout: 1500 }, (response) => {
      resolve(response.statusCode === 200);
    });

    request.on("error", () => resolve(false));
    request.on("timeout", () => {
      request.destroy();
      resolve(false);
    });
    request.end();
  });
}

async function waitForHealth(baseUrl) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (await isHealthy(baseUrl)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error("Manager host did not become ready within 10 seconds.");
}

function openBrowser(url) {
  if (process.platform === "darwin") {
    spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
    return;
  }

  if (process.platform === "win32") {
    spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
    return;
  }

  spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
}

function writeLog(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFileSync(MANAGER_LOG_FILE, line, "utf8");
}
