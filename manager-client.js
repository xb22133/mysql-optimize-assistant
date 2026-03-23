const portInput = document.getElementById("portInput");
const statusBadge = document.getElementById("statusBadge");
const outputBox = document.getElementById("outputBox");
const startButton = document.getElementById("startButton");
const openButton = document.getElementById("openButton");
const stopButton = document.getElementById("stopButton");
const refreshButton = document.getElementById("refreshButton");

function normalizePort() {
  return String(portInput.value || "").trim() || "8080";
}

function setOutput(message) {
  outputBox.textContent = message || "已完成。";
}

async function refreshStatus() {
  const port = normalizePort();
  const response = await fetch(`/api/status?port=${encodeURIComponent(port)}`);
  const payload = await response.json();
  if (payload.running) {
    statusBadge.textContent = `运行中 · ${port}`;
    statusBadge.className = "status running";
  } else {
    statusBadge.textContent = `未启动 · ${port}`;
    statusBadge.className = "status stopped";
  }
}

async function postAction(path) {
  const port = normalizePort();
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ port }),
  });
  const payload = await response.json();
  setOutput(payload.output || (payload.ok ? "操作完成。" : "操作失败。"));
  await refreshStatus();
}

startButton.addEventListener("click", () => postAction("/api/start"));
stopButton.addEventListener("click", () => postAction("/api/stop"));
refreshButton.addEventListener("click", refreshStatus);
openButton.addEventListener("click", async () => {
  const port = normalizePort();
  const response = await fetch(`/api/status?port=${encodeURIComponent(port)}`);
  const payload = await response.json();
  if (!payload.running) {
    setOutput("当前服务还没有启动，请先点击“启动服务”。");
    await refreshStatus();
    return;
  }

  window.open(payload.url, "_blank");
  setOutput(`已尝试打开 ${payload.url}`);
});

portInput.addEventListener("input", () => {
  refreshStatus().catch((error) => setOutput(String(error.message || error)));
});

refreshStatus().catch((error) => setOutput(String(error.message || error)));
