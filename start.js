const { spawn } = require("node:child_process");
const { spawnSync } = require("node:child_process");

const DEFAULT_PORT = "8080";

void main();

async function main() {
  try {
    const port = promptForPort();
    if (!port) {
      console.log("Launch cancelled.");
      return;
    }

    const appUrl = `http://localhost:${port}`;
    const healthUrl = `http://127.0.0.1:${port}/api/health`;

    const alreadyRunning = await isAppHealthy(healthUrl);
    if (!alreadyRunning) {
      spawnServer(port);
      await waitForHealth(healthUrl);
    }

    openBrowser(appUrl);
    console.log(`MySQL optimizer opened at ${appUrl}`);
  } catch (error) {
    console.error("Failed to launch app:", error.message || error);
    process.exitCode = 1;
  }
}

function spawnServer(port) {
  const child = spawn(process.execPath, ["server.js"], {
    cwd: __dirname,
    detached: true,
    stdio: "ignore",
    env: {
      ...process.env,
      PORT: String(port),
    },
  });

  child.unref();
}

async function isAppHealthy(healthUrl) {
  try {
    const response = await fetch(healthUrl, { method: "GET" });
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function waitForHealth(healthUrl) {
  const deadline = Date.now() + 15000;

  while (Date.now() < deadline) {
    if (await isAppHealthy(healthUrl)) {
      return;
    }

    await sleep(400);
  }

  throw new Error("Server did not become ready within 15 seconds.");
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
