const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const DEFAULT_PORT = "8080";
const LOG_DIR = path.join(__dirname, "logs");
const STOP_LOG_FILE = path.join(LOG_DIR, "stop.log");
const PID_REGISTRY_FILE = path.join(LOG_DIR, "server-registry.json");
const cliOptions = parseArgs(process.argv.slice(2));

void main();

function main() {
  ensureLogDir();

  try {
    const port = cliOptions.port || promptForPort();
    if (!port) {
      writeStopLog("Stop cancelled by user.");
      console.log("Stop cancelled.");
      return;
    }

    const pid = findPidByPort(port);
    if (!pid) {
      const message = `No running app process was found on port ${port}.`;
      writeStopLog(message);
      console.log(message);
      return;
    }

    terminateProcess(pid);
    removeRegistryEntry(pid, port);
    writeStopLog(`Stopped process pid=${pid} on port ${port}.`);
    console.log(`Stopped app process pid=${pid} on port ${port}.`);
  } catch (error) {
    writeStopLog(`Stop failed: ${error.message || error}`);
    console.error("Failed to stop app:", error.message || error);
    process.exitCode = 1;
  }
}

function ensureLogDir() {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function writeStopLog(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFileSync(STOP_LOG_FILE, line, "utf8");
}

function promptForPort() {
  if (process.platform === "darwin") {
    return promptForPortMac();
  }

  if (process.platform === "win32") {
    return promptForPortWindows();
  }

  return DEFAULT_PORT;
}

function promptForPortMac() {
  const script = `
    try
      display dialog "请输入要关闭的端口号（默认 8080）" default answer "${DEFAULT_PORT}" buttons {"取消", "关闭"} default button "关闭"
      return text returned of result
    on error number -128
      return "__CANCEL__"
    end try
  `;

  const result = spawnSync("osascript", ["-e", script], {
    cwd: __dirname,
    encoding: "utf8",
  });

  return normalizePortInput(String(result.stdout || "").trim());
}

function promptForPortWindows() {
  const script = `
Add-Type -AssemblyName Microsoft.VisualBasic
$value = [Microsoft.VisualBasic.Interaction]::InputBox('请输入要关闭的端口号（默认 8080）', '关闭项目', '${DEFAULT_PORT}')
if ([string]::IsNullOrWhiteSpace($value)) { Write-Output '__CANCEL__' } else { Write-Output $value }
  `.trim();

  const result = spawnSync("powershell", ["-NoProfile", "-Command", script], {
    cwd: __dirname,
    encoding: "utf8",
  });

  return normalizePortInput(String(result.stdout || "").trim());
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

function readRegistry() {
  try {
    if (!fs.existsSync(PID_REGISTRY_FILE)) {
      return [];
    }

    return JSON.parse(fs.readFileSync(PID_REGISTRY_FILE, "utf8"));
  } catch (error) {
    return [];
  }
}

function findPidByPort(port) {
  const entry = readRegistry().find((item) => item.port === String(port));
  if (entry && isProcessAlive(entry.pid)) {
    return Number(entry.pid);
  }

  if (process.platform === "win32") {
    return findPidByPortWindows(port);
  }

  return findPidByPortUnix(port);
}

function isProcessAlive(pid) {
  try {
    process.kill(Number(pid), 0);
    return true;
  } catch (error) {
    return false;
  }
}

function findPidByPortWindows(port) {
  const result = spawnSync("cmd", ["/c", `netstat -ano | findstr :${port}`], {
    cwd: __dirname,
    encoding: "utf8",
  });

  const lines = String(result.stdout || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => line.includes(`:${port}`));

  for (const line of lines) {
    const parts = line.split(/\s+/);
    const pid = Number(parts[parts.length - 1]);
    if (pid) {
      return pid;
    }
  }

  return null;
}

function findPidByPortUnix(port) {
  const result = spawnSync("lsof", ["-ti", `tcp:${port}`], {
    cwd: __dirname,
    encoding: "utf8",
  });

  const pid = Number(String(result.stdout || "").trim().split(/\r?\n/)[0]);
  return pid || null;
}

function terminateProcess(pid) {
  if (process.platform === "win32") {
    const result = spawnSync("taskkill", ["/PID", String(pid), "/F"], {
      cwd: __dirname,
      encoding: "utf8",
    });

    if (result.status !== 0) {
      throw new Error(String(result.stderr || result.stdout || "taskkill failed").trim());
    }
    return;
  }

  process.kill(Number(pid), "SIGTERM");
}

function removeRegistryEntry(pid, port) {
  const nextRegistry = readRegistry().filter(
    (entry) => Number(entry.pid) !== Number(pid) && entry.port !== String(port),
  );
  fs.writeFileSync(PID_REGISTRY_FILE, JSON.stringify(nextRegistry, null, 2), "utf8");
}

function parseArgs(argv) {
  const options = {
    port: "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--port" && argv[index + 1]) {
      options.port = normalizePortInput(argv[index + 1]);
      index += 1;
    }
  }

  return options;
}
