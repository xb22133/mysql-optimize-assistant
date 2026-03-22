const state = {
  models: loadModels(),
  verified: false,
  baiduVerified: false,
  analysisMode: "configured",
  saveConfiguredApiKey: false,
  saveBaiduApiKey: false,
  baiduStatusMessage: "选择“百度搜索增强”模式后，将通过百度官方智能搜索生成接口辅助输出优化建议。",
  baiduStatusTone: "neutral",
  verificationMessage: "尚未验证模型，分析按钮会保持禁用。",
  verificationTone: "neutral",
  schemaMeta: [],
  activeModelId: "",
  activeSecret: "",
  results: null,
  inactivityLocked: false,
};

const INACTIVITY_LOCK_MS = 10 * 60 * 1000;

const elements = {
  schemaInput: document.querySelector("#schemaInput"),
  insertSchemaButton: document.querySelector("#insertSchemaButton"),
  clearSchemaButton: document.querySelector("#clearSchemaButton"),
  sqlInput: document.querySelector("#sqlInput"),
  schemaHighlight: document.querySelector("#schemaHighlight"),
  sqlHighlight: document.querySelector("#sqlHighlight"),
  schemaStatus: document.querySelector("#schemaStatus"),
  sqlStatus: document.querySelector("#sqlStatus"),
  metadataSummary: document.querySelector("#metadataSummary"),
  tableCount: document.querySelector("#tableCount"),
  modelCount: document.querySelector("#modelCount"),
  activationStatus: document.querySelector("#activationStatus"),
  analyzeButton: document.querySelector("#analyzeButton"),
  analysisModeSelect: document.querySelector("#analysisModeSelect"),
  analysisToast: document.querySelector("#analysisToast"),
  configCenterAnchor: document.querySelector("#configCenterAnchor"),
  modeAssistBanner: document.querySelector("#modeAssistBanner"),
  modeAssistText: document.querySelector("#modeAssistText"),
  jumpToConfigButton: document.querySelector("#jumpToConfigButton"),
  configCenterSection: document.querySelector("#configCenterSection"),
  configuredSecurityCard: document.querySelector("#configuredSecurityCard"),
  configuredImportCard: document.querySelector("#configuredImportCard"),
  baiduConfigCard: document.querySelector("#baiduConfigCard"),
  configuredModelManager: document.querySelector("#configuredModelManager"),
  modelList: document.querySelector("#modelList"),
  activeModelSelect: document.querySelector("#activeModelSelect"),
  apiKeyInput: document.querySelector("#apiKeyInput"),
  baiduApiKeyInput: document.querySelector("#baiduApiKeyInput"),
  saveConfiguredApiKeyToggle: document.querySelector("#saveConfiguredApiKeyToggle"),
  saveBaiduApiKeyToggle: document.querySelector("#saveBaiduApiKeyToggle"),
  toggleSecretButton: document.querySelector("#toggleSecretButton"),
  toggleBaiduSecretButton: document.querySelector("#toggleBaiduSecretButton"),
  clearSecretButton: document.querySelector("#clearSecretButton"),
  clearBaiduSecretButton: document.querySelector("#clearBaiduSecretButton"),
  verifyButton: document.querySelector("#verifyButton"),
  verifyBaiduButton: document.querySelector("#verifyBaiduButton"),
  verificationBanner: document.querySelector("#verificationBanner"),
  verifyHintBanner: document.querySelector("#verifyHintBanner"),
  baiduStatusBanner: document.querySelector("#baiduStatusBanner"),
  addModelButton: document.querySelector("#addModelButton"),
  importInput: document.querySelector("#importInput"),
  importFileInput: document.querySelector("#importFileInput"),
  importButton: document.querySelector("#importButton"),
  exportButton: document.querySelector("#exportButton"),
  importStatus: document.querySelector("#importStatus"),
  beforeSummary: document.querySelector("#beforeSummary"),
  beforeExplain: document.querySelector("#beforeExplain"),
  afterSummary: document.querySelector("#afterSummary"),
  indexSql: document.querySelector("#indexSql"),
  rewrittenSql: document.querySelector("#rewrittenSql"),
  afterExplain: document.querySelector("#afterExplain"),
  riskList: document.querySelector("#riskList"),
  resultTrustBanner: document.querySelector("#resultTrustBanner"),
  beforeSummarySource: document.querySelector("#beforeSummarySource"),
  beforeExplainSource: document.querySelector("#beforeExplainSource"),
  afterSummarySource: document.querySelector("#afterSummarySource"),
  indexSqlSource: document.querySelector("#indexSqlSource"),
  rewrittenSqlSource: document.querySelector("#rewrittenSqlSource"),
  afterExplainSource: document.querySelector("#afterExplainSource"),
  indexAdviceMeta: document.querySelector("#indexAdviceMeta"),
  rewriteAdviceMeta: document.querySelector("#rewriteAdviceMeta"),
  schemaModal: document.querySelector("#schemaModal"),
  schemaModalInput: document.querySelector("#schemaModalInput"),
  saveSchemaModalButton: document.querySelector("#saveSchemaModalButton"),
  cancelSchemaModalButton: document.querySelector("#cancelSchemaModalButton"),
  closeSchemaModalButton: document.querySelector("#closeSchemaModalButton"),
  modelRowTemplate: document.querySelector("#modelRowTemplate"),
};

const defaultSchema = `CREATE TABLE users (
  id BIGINT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  status TINYINT NOT NULL,
  created_at DATETIME NOT NULL,
  KEY idx_status (status)
);

CREATE TABLE orders (
  id BIGINT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(32) NOT NULL,
  created_at DATETIME NOT NULL,
  KEY idx_created_at (created_at),
  KEY idx_status_created (status, created_at)
);`;

const defaultSql = `SELECT o.id, o.user_id, o.total_amount
FROM orders o
JOIN users u ON u.id = o.user_id
WHERE u.status = 1
  AND DATE(o.created_at) = '2026-03-21'
ORDER BY o.created_at DESC
LIMIT 100;`;

init();

async function init() {
  state.saveBaiduApiKey = loadPersistedBaiduSavePreference();
  elements.saveBaiduApiKeyToggle.checked = state.saveBaiduApiKey;
  elements.schemaInput.value = defaultSchema;
  elements.sqlInput.value = defaultSql;
  elements.baiduApiKeyInput.value = loadPersistedBaiduApiKey();
  syncHighlight(elements.schemaInput, elements.schemaHighlight);
  syncHighlight(elements.sqlInput, elements.sqlHighlight);
  parseSchemaAndRender();
  renderModels();
  state.saveConfiguredApiKey = loadPersistedConfiguredSavePreference(state.activeModelId);
  elements.saveConfiguredApiKeyToggle.checked = state.saveConfiguredApiKey;
  elements.apiKeyInput.value = loadPersistedApiKey(state.activeModelId);
  restorePersistedVerificationState();
  bindEvents();
  setupInactivityLock();
  await checkLocalProxy();
  renderVerification();
  updateVerifyHint();
}

function bindEvents() {
  elements.schemaInput.addEventListener("input", () => {
    syncHighlight(elements.schemaInput, elements.schemaHighlight);
    parseSchemaAndRender();
  });

  elements.insertSchemaButton.addEventListener("click", openSchemaModal);
  elements.clearSchemaButton.addEventListener("click", clearSchemaInput);
  elements.saveSchemaModalButton.addEventListener("click", appendSchemaFromModal);
  elements.cancelSchemaModalButton.addEventListener("click", closeSchemaModal);
  elements.closeSchemaModalButton.addEventListener("click", closeSchemaModal);
  elements.schemaModal.addEventListener("click", (event) => {
    if (event.target === elements.schemaModal) {
      closeSchemaModal();
    }
  });

  elements.sqlInput.addEventListener("input", () => {
    syncHighlight(elements.sqlInput, elements.sqlHighlight);
    updateSqlStatus();
  });

  elements.apiKeyInput.addEventListener("input", (event) => {
    persistApiKey(state.activeModelId, event.target.value);
    state.inactivityLocked = false;
  });

  elements.baiduApiKeyInput.addEventListener("input", (event) => {
    persistBaiduApiKey(event.target.value);
    state.inactivityLocked = false;
  });

  elements.saveConfiguredApiKeyToggle.addEventListener("change", (event) => {
    state.saveConfiguredApiKey = event.target.checked;
    persistConfiguredSavePreference(state.activeModelId, state.saveConfiguredApiKey);
    persistApiKey(state.activeModelId, elements.apiKeyInput.value);
  });

  elements.saveBaiduApiKeyToggle.addEventListener("change", (event) => {
    state.saveBaiduApiKey = event.target.checked;
    persistBaiduSavePreference(state.saveBaiduApiKey);
    persistBaiduApiKey(elements.baiduApiKeyInput.value);
  });

  [elements.schemaInput, elements.sqlInput].forEach((input) => {
    input.addEventListener("scroll", () => {
      const layer = input === elements.schemaInput ? elements.schemaHighlight : elements.sqlHighlight;
      layer.scrollTop = input.scrollTop;
      layer.scrollLeft = input.scrollLeft;
    });
  });

  document.querySelectorAll("[data-copy-target]").forEach((button) => {
    button.addEventListener("click", async () => {
      const target = document.getElementById(button.dataset.copyTarget);
      await navigator.clipboard.writeText(target.value);
      button.textContent = "已复制";
      window.setTimeout(() => {
        button.textContent = "复制";
      }, 1200);
    });
  });

  document.querySelectorAll("[data-copy-content]").forEach((button) => {
    button.addEventListener("click", async () => {
      const target = document.getElementById(button.dataset.copyContent);
      const originalLabel = button.textContent;
      await navigator.clipboard.writeText(target.textContent);
      button.textContent = "已复制";
      window.setTimeout(() => {
        button.textContent = originalLabel;
      }, 1200);
    });
  });

  elements.addModelButton.addEventListener("click", () => {
    state.models.push(createEmptyModel());
    persistModels();
    renderModels();
  });

  elements.toggleSecretButton.addEventListener("click", () => {
    const isPassword = elements.apiKeyInput.type === "password";
    elements.apiKeyInput.type = isPassword ? "text" : "password";
    elements.toggleSecretButton.textContent = isPassword ? "隐藏" : "显示";
  });

  elements.toggleBaiduSecretButton.addEventListener("click", () => {
    const isPassword = elements.baiduApiKeyInput.type === "password";
    elements.baiduApiKeyInput.type = isPassword ? "text" : "password";
    elements.toggleBaiduSecretButton.textContent = isPassword ? "隐藏" : "显示";
  });

  elements.clearSecretButton.addEventListener("click", clearSecretState);
  elements.clearBaiduSecretButton.addEventListener("click", clearBaiduSecretState);
  elements.verifyButton.addEventListener("click", () => verifyAndEnable(false));
  elements.verifyBaiduButton.addEventListener("click", verifyBaiduSearchConfig);
  elements.analyzeButton.addEventListener("click", runAnalysis);
  elements.jumpToConfigButton.addEventListener("click", scrollToConfigCenter);
  elements.analysisModeSelect.addEventListener("change", (event) => {
    state.analysisMode = event.target.value;
    updateAnalyzeButtonState();
    updateConfigVisibility();
    maybePromptModeConfiguration();
  });
  elements.activeModelSelect.addEventListener("change", (event) => {
    state.activeModelId = event.target.value;
    persistActiveModelId(state.activeModelId);
    state.saveConfiguredApiKey = loadPersistedConfiguredSavePreference(state.activeModelId);
    elements.saveConfiguredApiKeyToggle.checked = state.saveConfiguredApiKey;
    elements.apiKeyInput.value = loadPersistedApiKey(state.activeModelId);
    state.verified = false;
    persistVerifiedModelId("");
    state.verificationMessage = "模型切换后需要重新验证。";
    state.verificationTone = "warning";
    renderVerification();
    updateVerifyHint();
  });

  elements.importButton.addEventListener("click", importJsonConfig);
  elements.exportButton.addEventListener("click", exportCurrentConfig);
  elements.importFileInput.addEventListener("change", readImportFile);
}

function loadModels() {
  const stored = window.localStorage.getItem("mysql-optimize-models");
  if (stored) {
    try {
      return JSON.parse(stored).map((item) => ({
        ...item,
        verifyUrl: item.verifyUrl || normalizeVerifyUrl(item),
        verifyMode: item.verifyMode || inferVerifyMode(item.verifyUrl || normalizeVerifyUrl(item)),
      }));
    } catch (error) {
      console.warn("Failed to parse stored models", error);
    }
  }

  return [
    {
      id: crypto.randomUUID(),
      name: "OpenAI GPT-4.1",
      modelId: "gpt-4.1",
      verifyUrl: "https://api.openai.com/v1/models",
      verifyMode: "models_get",
    },
    {
      id: crypto.randomUUID(),
      name: "MiniMax M2.5",
      modelId: "MiniMax-M2.5",
      verifyUrl: "https://api.minimaxi.com/v1/chat/completions",
      verifyMode: "chat_post",
    },
  ];
}

function loadPersistedApiKey(modelId) {
  if (!loadPersistedConfiguredSavePreference(modelId)) {
    return "";
  }

  const keyMap = loadConfiguredApiKeyMap();
  const activeModelId = modelId || loadPersistedActiveModelId();
  if (activeModelId && keyMap[activeModelId]) {
    return keyMap[activeModelId];
  }

  return window.localStorage.getItem("mysql-optimize-api-key") || "";
}

function persistApiKey(modelId, value) {
  if (!value || !modelId) {
    const keyMap = loadConfiguredApiKeyMap();
    if (modelId && keyMap[modelId]) {
      delete keyMap[modelId];
      persistConfiguredApiKeyMap(keyMap);
    }
    window.localStorage.removeItem("mysql-optimize-api-key");
    return;
  }

  if (!state.saveConfiguredApiKey) {
    const keyMap = loadConfiguredApiKeyMap();
    if (keyMap[modelId]) {
      delete keyMap[modelId];
      persistConfiguredApiKeyMap(keyMap);
    }
    window.localStorage.removeItem("mysql-optimize-api-key");
    return;
  }

  const keyMap = loadConfiguredApiKeyMap();
  keyMap[modelId] = value;
  persistConfiguredApiKeyMap(keyMap);
}

function loadConfiguredApiKeyMap() {
  const stored = window.localStorage.getItem("mysql-optimize-api-key-map");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      return {};
    }
  }

  const legacyKey = window.localStorage.getItem("mysql-optimize-api-key");
  const activeModelId = loadPersistedActiveModelId();
  if (legacyKey && activeModelId) {
    return { [activeModelId]: legacyKey };
  }

  return {};
}

function persistConfiguredApiKeyMap(keyMap) {
  if (!Object.keys(keyMap).length) {
    window.localStorage.removeItem("mysql-optimize-api-key-map");
    return;
  }

  window.localStorage.setItem("mysql-optimize-api-key-map", JSON.stringify(keyMap));
}

function loadPersistedBaiduApiKey() {
  if (!loadPersistedBaiduSavePreference()) {
    return "";
  }

  return window.localStorage.getItem("mysql-optimize-baidu-api-key") || "";
}

function persistBaiduApiKey(value) {
  if (!state.saveBaiduApiKey || !value) {
    window.localStorage.removeItem("mysql-optimize-baidu-api-key");
    return;
  }

  window.localStorage.setItem("mysql-optimize-baidu-api-key", value);
}

function loadPersistedConfiguredSavePreference(modelId) {
  const activeModelId = modelId || loadPersistedActiveModelId();
  const preferenceMap = loadConfiguredSavePreferenceMap();
  if (activeModelId && preferenceMap[activeModelId] !== undefined) {
    return Boolean(preferenceMap[activeModelId]);
  }

  const stored = window.localStorage.getItem("mysql-optimize-save-configured-api-key");
  if (stored !== null) {
    return stored === "true";
  }

  if (activeModelId) {
    const keyMap = loadConfiguredApiKeyMap();
    if (keyMap[activeModelId]) {
      return true;
    }
  }

  return Boolean(window.localStorage.getItem("mysql-optimize-api-key"));
}

function persistConfiguredSavePreference(modelId, value) {
  const activeModelId = modelId || loadPersistedActiveModelId();
  if (!activeModelId) {
    return;
  }

  const preferenceMap = loadConfiguredSavePreferenceMap();
  preferenceMap[activeModelId] = Boolean(value);
  window.localStorage.setItem("mysql-optimize-save-configured-api-key-map", JSON.stringify(preferenceMap));
}

function loadConfiguredSavePreferenceMap() {
  const stored = window.localStorage.getItem("mysql-optimize-save-configured-api-key-map");
  if (!stored) {
    return {};
  }

  try {
    return JSON.parse(stored);
  } catch (error) {
    return {};
  }
}

function loadPersistedBaiduSavePreference() {
  const stored = window.localStorage.getItem("mysql-optimize-save-baidu-api-key");
  if (stored !== null) {
    return stored === "true";
  }

  return Boolean(window.localStorage.getItem("mysql-optimize-baidu-api-key"));
}

function persistBaiduSavePreference(value) {
  window.localStorage.setItem("mysql-optimize-save-baidu-api-key", String(Boolean(value)));
}

function loadPersistedActiveModelId() {
  return window.localStorage.getItem("mysql-optimize-active-model-id") || "";
}

function persistActiveModelId(value) {
  if (!value) {
    window.localStorage.removeItem("mysql-optimize-active-model-id");
    return;
  }

  window.localStorage.setItem("mysql-optimize-active-model-id", value);
}

function loadPersistedVerifiedModelId() {
  return window.localStorage.getItem("mysql-optimize-verified-model-id") || "";
}

function persistVerifiedModelId(value) {
  if (!value) {
    window.localStorage.removeItem("mysql-optimize-verified-model-id");
    return;
  }

  window.localStorage.setItem("mysql-optimize-verified-model-id", value);
}

function loadPersistedBaiduVerified() {
  return window.localStorage.getItem("mysql-optimize-baidu-verified") === "true";
}

function persistBaiduVerified(value) {
  window.localStorage.setItem("mysql-optimize-baidu-verified", String(Boolean(value)));
}

function restorePersistedVerificationState() {
  const persistedActiveModelId = loadPersistedActiveModelId();
  const persistedVerifiedModelId = loadPersistedVerifiedModelId();

  if (persistedActiveModelId && state.models.some((model) => model.id === persistedActiveModelId)) {
    state.activeModelId = persistedActiveModelId;
    elements.activeModelSelect.value = persistedActiveModelId;
    elements.apiKeyInput.value = loadPersistedApiKey(persistedActiveModelId);
  }

  const persistedSecret = elements.apiKeyInput.value.trim();

  if (persistedSecret && state.activeModelId && state.activeModelId === persistedVerifiedModelId) {
    state.activeSecret = persistedSecret;
    state.verified = true;
    state.verificationMessage = "已恢复上次验证成功的当前验证模型与 API Key，可直接开始优化任务。";
    state.verificationTone = "success";
  }

  if (elements.baiduApiKeyInput.value.trim() && loadPersistedBaiduVerified()) {
    state.baiduVerified = true;
    state.baiduStatusMessage = "已恢复上次验证成功的百度 API Key，可直接使用百度搜索增强。";
    state.baiduStatusTone = "success";
  }
}

function createEmptyModel() {
  return {
    id: crypto.randomUUID(),
    name: "新模型",
    modelId: "",
    verifyUrl: "https://api.example.com/v1/models",
    verifyUrlPreset: "",
    verifyMode: "models_get",
    verifyModePreset: "models_get",
  };
}

function persistModels() {
  window.localStorage.setItem("mysql-optimize-models", JSON.stringify(state.models));
}

function renderModels() {
  elements.modelList.innerHTML = "";
  state.models.forEach((model) => {
    const fragment = elements.modelRowTemplate.content.cloneNode(true);
    const row = fragment.querySelector(".model-row");
    row.dataset.id = model.id;

    row.querySelectorAll("[data-key]").forEach((field) => {
      const key = field.dataset.key;
      if (key === "verifyUrlPreset") {
        field.value = model.verifyUrlPreset || "";
      } else if (key === "verifyModePreset") {
        field.value = model.verifyModePreset || (["models_get", "chat_post"].includes(model.verifyMode) ? model.verifyMode : "");
      } else {
        field.value = model[key] || "";
      }

      field.addEventListener("input", (event) => {
        const item = state.models.find((entry) => entry.id === model.id);
        const changedKey = event.target.dataset.key;
        const value = event.target.value;

        if (changedKey === "verifyUrlPreset") {
          item.verifyUrlPreset = value;
          if (value) {
            item.verifyUrl = value;
            const urlInput = row.querySelector('input[data-key="verifyUrl"]');
            if (urlInput) {
              urlInput.value = value;
            }
          }
        } else if (changedKey === "verifyModePreset") {
          item.verifyModePreset = value;
          if (value) {
            item.verifyMode = value;
            const modeInput = row.querySelector('input[data-key="verifyMode"]');
            if (modeInput) {
              modeInput.value = value;
            }
          }
        } else {
          item[changedKey] = value;
          if (changedKey === "modelId") {
            applySuggestedVerificationConfig(item, row);
          }
          if (changedKey === "verifyUrl" || changedKey === "verifyMode" || changedKey === "modelId") {
            renderModelRowHint(item, row);
          }
          if (changedKey === "verifyUrl") {
            item.verifyUrlPreset = "";
            const preset = row.querySelector('select[data-key="verifyUrlPreset"]');
            if (preset) {
              preset.value = "";
            }
          }
          if (changedKey === "verifyMode") {
            item.verifyModePreset = "";
            const preset = row.querySelector('select[data-key="verifyModePreset"]');
            if (preset) {
              preset.value = "";
            }
          }
        }

        persistModels();
        populateModelSelect();
        updateVerifyHint();
      });
    });

    renderModelRowHint(model, row);

    row.querySelector(".remove-model-button").addEventListener("click", () => {
      state.models = state.models.filter((entry) => entry.id !== model.id);
      if (state.activeModelId === model.id) {
        state.activeModelId = "";
        state.verified = false;
      }
      persistModels();
      renderModels();
      renderVerification();
    });

    elements.modelList.appendChild(fragment);
  });

  populateModelSelect();
  elements.modelCount.textContent = String(state.models.length);
}

function applySuggestedVerificationConfig(model, row) {
  const suggestion = suggestVerificationConfig(model.modelId || "");
  if (!suggestion) {
    return;
  }

  if (!model.verifyUrl || model.verifyUrl === "https://api.example.com/v1/models" || model.verifyUrlPreset) {
    model.verifyUrl = suggestion.verifyUrl;
    model.verifyUrlPreset = suggestion.verifyUrl;
    const urlPreset = row.querySelector('select[data-key="verifyUrlPreset"]');
    const urlInput = row.querySelector('input[data-key="verifyUrl"]');
    if (urlPreset) {
      const hasOption = [...urlPreset.options].some((option) => option.value === suggestion.verifyUrl);
      urlPreset.value = hasOption ? suggestion.verifyUrl : "";
    }
    if (urlInput) {
      urlInput.value = suggestion.verifyUrl;
    }
  }

  if (!model.verifyMode || model.verifyModePreset || ["models_get", "chat_post"].includes(model.verifyMode)) {
    model.verifyMode = suggestion.verifyMode;
    model.verifyModePreset = suggestion.verifyMode;
    const modePreset = row.querySelector('select[data-key="verifyModePreset"]');
    const modeInput = row.querySelector('input[data-key="verifyMode"]');
    if (modePreset) {
      const hasOption = [...modePreset.options].some((option) => option.value === suggestion.verifyMode);
      modePreset.value = hasOption ? suggestion.verifyMode : "";
    }
    if (modeInput) {
      modeInput.value = suggestion.verifyMode;
    }
  }
}

function suggestVerificationConfig(modelId) {
  const value = String(modelId || "").trim();
  if (!value) {
    return null;
  }

  if (/^gpt-/i.test(value) || /^o\d/i.test(value)) {
    return {
      provider: "openai",
      verifyUrl: "https://api.openai.com/v1/chat/completions",
      verifyMode: "chat_post",
    };
  }

  if (/^minimax-/i.test(value)) {
    return {
      provider: "minimax",
      verifyUrl: "https://api.minimaxi.com/v1/chat/completions",
      verifyMode: "chat_post",
    };
  }

  if (/^deepseek-/i.test(value)) {
    return {
      provider: "deepseek",
      verifyUrl: "https://api.deepseek.com/chat/completions",
      verifyMode: "chat_post",
    };
  }

  if (/^(moonshot-|kimi-)/i.test(value)) {
    return {
      provider: "kimi",
      verifyUrl: "https://api.moonshot.cn/v1/chat/completions",
      verifyMode: "chat_post",
    };
  }

  if (/^(doubao-|ep-)/i.test(value)) {
    return {
      provider: "doubao",
      verifyUrl: "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
      verifyMode: "chat_post",
    };
  }

  if (/^(qwen-|qwq-|qvq-|qwen3-|qwen2\.5-)/i.test(value)) {
    return {
      provider: "qwen",
      verifyUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
      verifyMode: "chat_post",
    };
  }

  return null;
}

function populateModelSelect() {
  const previous = state.activeModelId || loadPersistedActiveModelId() || state.models[0]?.id || "";
  elements.activeModelSelect.innerHTML = "";

  state.models.forEach((model) => {
    const option = document.createElement("option");
    option.value = model.id;
    option.textContent = `${model.name} (${model.modelId || "未填写"})`;
    elements.activeModelSelect.appendChild(option);
  });

  state.activeModelId = state.models.some((model) => model.id === previous) ? previous : state.models[0]?.id || "";
  elements.activeModelSelect.value = state.activeModelId;
  persistActiveModelId(state.activeModelId);
  updateVerifyHint();
}

function syncHighlight(textarea, layer) {
  const content = textarea.value || textarea.placeholder || "";
  layer.innerHTML = highlightSql(content);
}

function highlightSql(text) {
  return escapeHtml(text)
    .replace(/(--.*)$/gm, '<span class="token-comment">$1</span>')
    .replace(/('(?:''|[^'])*')/g, '<span class="token-string">$1</span>')
    .replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="token-number">$1</span>')
    .replace(
      /\b(SELECT|FROM|WHERE|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AND|OR|ORDER|BY|GROUP|LIMIT|OFFSET|AS|EXISTS|IN|UNION|ALL|CREATE|TABLE|PRIMARY|KEY|INDEX|ALTER|ADD|DESC|ASC|HAVING|BETWEEN|LIKE|NOT|NULL|IS|DISTINCT)\b/gi,
      '<span class="token-keyword">$1</span>',
    )
    .replace(/`?([a-z_][a-z0-9_$]*)`?(?=\s*\()/gi, '<span class="token-ident">$&</span>');
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function parseSchemaAndRender() {
  const schema = elements.schemaInput.value.trim();
  if (!schema) {
    state.schemaMeta = [];
    elements.schemaStatus.textContent = "等待输入";
    renderMetadata();
    return;
  }

  state.schemaMeta = parseCreateTables(schema);
  elements.schemaStatus.textContent = state.schemaMeta.length
    ? `已识别 ${state.schemaMeta.length} 张表`
    : "未识别到有效 CREATE TABLE";
  elements.tableCount.textContent = String(state.schemaMeta.length);
  renderMetadata();
  updateSqlStatus();
}

function openSchemaModal() {
  elements.schemaModal.classList.remove("hidden");
  elements.schemaModal.setAttribute("aria-hidden", "false");
  elements.schemaModalInput.focus();
}

function closeSchemaModal() {
  elements.schemaModal.classList.add("hidden");
  elements.schemaModal.setAttribute("aria-hidden", "true");
  elements.schemaModalInput.value = "";
}

function appendSchemaFromModal() {
  const raw = elements.schemaModalInput.value.trim();
  if (!raw) {
    closeSchemaModal();
    return;
  }

  const normalized = normalizeSchemaAppend(raw);
  const current = elements.schemaInput.value.trim();
  elements.schemaInput.value = current ? `${current}\n\n${normalized}` : normalized;
  syncHighlight(elements.schemaInput, elements.schemaHighlight);
  parseSchemaAndRender();
  closeSchemaModal();
}

function normalizeSchemaAppend(raw) {
  return raw
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => (chunk.endsWith(";") ? chunk : `${chunk};`))
    .join("\n\n");
}

function clearSchemaInput() {
  elements.schemaInput.value = "";
  syncHighlight(elements.schemaInput, elements.schemaHighlight);
  parseSchemaAndRender();
}

function renderMetadata() {
  if (!state.schemaMeta.length) {
    elements.metadataSummary.innerHTML = '<div class="metadata-item">请输入合法的 <code>CREATE TABLE</code> 语句。</div>';
    return;
  }

  elements.metadataSummary.innerHTML = state.schemaMeta
    .map((table) => {
      const indexSummary = table.indexes.length
        ? table.indexes.map((index) => `${index.name}(${index.columns.join(", ")})`).join(" / ")
        : "无";
      return `
        <div class="metadata-item">
          <strong>${table.name}</strong>
          <div>字段数：${table.columns.length}</div>
          <div>主键：${table.primaryKey.join(", ") || "未识别"}</div>
          <div>索引：${indexSummary}</div>
        </div>
      `;
    })
    .join("");
}

function updateSqlStatus() {
  const sql = elements.sqlInput.value.trim();
  if (!sql) {
    elements.sqlStatus.textContent = "等待输入";
    return;
  }

  elements.sqlStatus.textContent = /^\s*select\b/i.test(sql) ? "已检测到 SELECT 查询" : "建议输入 SELECT 语句";
}

function parseCreateTables(input) {
  const tables = [];
  const regex = /CREATE\s+TABLE\s+`?([a-zA-Z0-9_]+)`?\s*\(([\s\S]*?)\)\s*;?/gi;
  let match;

  while ((match = regex.exec(input))) {
    const [, tableName, body] = match;
    const lines = body
      .split(/\n/)
      .map((line) => line.trim().replace(/,$/, ""))
      .filter(Boolean);

    const table = {
      name: tableName,
      columns: [],
      primaryKey: [],
      indexes: [],
    };

    lines.forEach((line) => {
      if (/^PRIMARY\s+KEY/i.test(line)) {
        table.primaryKey = extractColumnList(line);
        return;
      }

      if (/^(UNIQUE\s+)?KEY|^INDEX/i.test(line)) {
        const indexNameMatch = line.match(/(?:UNIQUE\s+)?(?:KEY|INDEX)\s+`?([a-zA-Z0-9_]+)`?/i);
        table.indexes.push({
          name: indexNameMatch?.[1] || `idx_${table.indexes.length + 1}`,
          columns: extractColumnList(line),
          unique: /^UNIQUE/i.test(line),
        });
        return;
      }

      const columnMatch = line.match(/^`?([a-zA-Z0-9_]+)`?\s+([a-zA-Z0-9(),]+)(.*)$/);
      if (!columnMatch) {
        return;
      }

      const [, name, type, rest] = columnMatch;
      table.columns.push({
        name,
        type,
        notNull: /\bNOT\s+NULL\b/i.test(rest),
      });

      if (/\bPRIMARY\s+KEY\b/i.test(rest)) {
        table.primaryKey.push(name);
      }
    });

    tables.push(table);
  }

  return tables;
}

function extractColumnList(line) {
  const match = line.match(/\(([^)]+)\)/);
  if (!match) {
    return [];
  }

  return match[1]
    .split(",")
    .map((item) => item.trim().replace(/`/g, "").replace(/\s+(ASC|DESC)$/i, ""))
    .filter(Boolean);
}

function clearSecretState() {
  state.activeSecret = "";
  state.verified = false;
  state.inactivityLocked = false;
  elements.apiKeyInput.value = "";
  persistApiKey(state.activeModelId, "");
  persistVerifiedModelId("");
  state.verificationMessage = "API Key 已清空，内存凭证已销毁，请重新验证。";
  state.verificationTone = "warning";
  renderVerification();
}

function clearBaiduSecretState() {
  state.baiduVerified = false;
  state.inactivityLocked = false;
  elements.baiduApiKeyInput.value = "";
  persistBaiduApiKey("");
  persistBaiduVerified(false);
  state.baiduStatusMessage = "百度 API Key 已清空，请重新填写后再使用百度搜索增强。";
  state.baiduStatusTone = "warning";
  renderBaiduStatus();
}

async function verifyAndEnable(isRetry) {
  const model = state.models.find((entry) => entry.id === state.activeModelId);
  const secret = elements.apiKeyInput.value.trim();

  if (!model) {
    state.verificationMessage = "请先至少配置一个模型。";
    state.verificationTone = "error";
    renderVerification();
    return;
  }

  if (!secret) {
    state.verificationMessage = "请输入 API Key 后再验证。";
    state.verificationTone = "error";
    renderVerification();
    return;
  }

  state.verificationMessage = `${isRetry ? "正在重试" : "正在验证"} ${model.name}，最长等待 5 秒...`;
  state.verificationTone = "warning";
  renderVerification();

  try {
    const url = model.verifyUrl?.trim();
    if (!url) {
      throw new Error("请填写完整验证地址");
    }

    const verifyUrlIssue = detectVerifyUrlIssue(url, model.verifyMode || inferVerifyMode(model.verifyUrl));
    if (verifyUrlIssue) {
      state.verificationMessage = verifyUrlIssue;
      state.verificationTone = "warning";
      renderVerification();
      return;
    }

    const response = await fetch("/api/verify-model", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        verifyUrl: url,
        apiKey: secret,
        modelId: model.modelId,
        verifyMode: model.verifyMode || inferVerifyMode(model.verifyUrl),
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || `HTTP ${response.status}：验证失败`);
    }

    await response.json().catch(() => ({}));

    state.activeSecret = secret;
    state.verified = true;
    state.inactivityLocked = false;
    persistActiveModelId(model.id);
    persistVerifiedModelId(model.id);
    state.verificationMessage = `验证通过，${model.name} 已启用，可开始优化任务。`;
    state.verificationTone = "success";
  } catch (error) {
    state.verified = false;
    state.verificationMessage = buildVerificationErrorMessage(error);
    state.verificationTone = "error";
  }

  renderVerification();
}

async function checkLocalProxy() {
  try {
    const response = await fetch("/api/health", { method: "GET" });
    if (!response.ok) {
      throw new Error("health check failed");
    }
  } catch (error) {
    state.verificationMessage =
      "本地代理未连接。请使用 `node server.js` 启动项目，并通过 http://localhost:8080 打开页面；不要直接双击 index.html，也不要用其他静态服务器。";
    state.verificationTone = "warning";
  }
}

function buildVerificationErrorMessage(error) {
  const rawMessage = String(error?.message || "请求失败");
  const normalized = rawMessage.toLowerCase();

  if (normalized.includes("failed to fetch") || normalized.includes("load failed")) {
    return "验证失败：本地代理不可达。请确认你是通过 `node server.js` 启动，并从 http://localhost:8080 打开当前页面；如果这是之前打开的旧标签页，请刷新后重试。";
  }

  return `验证失败：${rawMessage}`;
}

function renderVerification() {
  elements.verificationBanner.className = `status-banner ${state.verificationTone}`;
  elements.verificationBanner.textContent = state.verificationMessage;
  elements.activationStatus.textContent = state.verified ? "已启用" : "未验证";
  updateAnalyzeButtonState();
  renderBaiduStatus();
  updateConfigVisibility();
  maybePromptModeConfiguration(false);
  updateVerifyHint();
}

function updateAnalyzeButtonState() {
  elements.analyzeButton.disabled = state.analysisMode === "configured" ? !state.verified : false;
}

function updateConfigVisibility() {
  const isBaiduMode = state.analysisMode === "baidu_search";
  elements.baiduConfigCard.classList.toggle("hidden", !isBaiduMode);
  elements.configuredSecurityCard.classList.toggle("hidden", isBaiduMode);
  elements.configuredImportCard.classList.toggle("hidden", isBaiduMode);
  elements.configuredModelManager.classList.toggle("hidden", isBaiduMode);
}

function maybePromptModeConfiguration(shouldPromptJump = true) {
  const missingConfigured = state.analysisMode === "configured" && !state.verified;
  const missingBaidu = state.analysisMode === "baidu_search" && !state.baiduVerified;
  const shouldShow = missingConfigured || missingBaidu;

  elements.modeAssistBanner.classList.toggle("hidden", !shouldShow);
  if (!shouldShow) {
    return;
  }

  elements.modeAssistText.textContent =
    state.analysisMode === "configured"
      ? "当前还没有已成功连接的配置大模型 API Key，请先前往大模型配置中心完成验证并启用。"
      : "当前还没有已成功连接的百度搜索增强 API Key，请先前往大模型配置中心完成验证并启用。";

  if (shouldPromptJump) {
    const shouldJump = window.confirm("当前模式还没有完成配置，是否立即跳转到大模型配置中心？");
    if (shouldJump) {
      scrollToConfigCenter();
    }
  }
}

function scrollToConfigCenter() {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      const target = elements.configCenterAnchor || elements.configCenterSection;
      const top = target.getBoundingClientRect().top + window.scrollY - 16;
      window.scrollTo({
        top: Math.max(0, top),
        behavior: "smooth",
      });
    });
  });
}

function renderBaiduStatus() {
  elements.baiduStatusBanner.className = `status-banner ${state.baiduStatusTone}`;
  elements.baiduStatusBanner.textContent = state.baiduStatusMessage;
}

async function verifyBaiduSearchConfig() {
  const apiKey = elements.baiduApiKeyInput.value.trim();
  if (!apiKey) {
    state.baiduStatusMessage = "请输入百度 API Key 后再验证。";
    state.baiduStatusTone = "error";
    renderBaiduStatus();
    return;
  }

  state.baiduStatusMessage = "正在验证百度搜索增强配置...";
  state.baiduStatusTone = "warning";
  renderBaiduStatus();

  try {
    const response = await fetch("/api/verify-baidu-search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ apiKey }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || `HTTP ${response.status}：验证失败`);
    }

    state.baiduStatusMessage = "验证通过，百度搜索增强已启用。";
    state.baiduStatusTone = "success";
    state.baiduVerified = true;
    state.inactivityLocked = false;
    persistBaiduVerified(true);
  } catch (error) {
    state.baiduStatusMessage = `百度搜索增强验证失败：${error.message}`;
    state.baiduStatusTone = "error";
    state.baiduVerified = false;
    persistBaiduVerified(false);
  }

  renderBaiduStatus();
  maybePromptModeConfiguration(false);
}

function readImportFile(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    elements.importInput.value = String(reader.result || "");
  };
  reader.readAsText(file, "utf-8");
}

function importJsonConfig() {
  const raw = elements.importInput.value.trim();
  if (!raw) {
    setImportStatus("请先粘贴或选择 JSON 文件。", "error");
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    const importedModels = Array.isArray(parsed) ? parsed : parsed.models;

    if (!Array.isArray(importedModels)) {
      throw new Error("JSON 顶层需要是 models 数组，或直接是数组。");
    }

    let updated = 0;
    let added = 0;

    importedModels.forEach((item) => {
      const normalized = {
        id: crypto.randomUUID(),
        name: item.name || item.label || "未命名模型",
        modelId: item.modelId || item.id || "",
        verifyUrl: normalizeVerifyUrl(item),
        verifyUrlPreset: item.verifyUrlPreset || "",
        verifyMode: item.verifyMode || inferVerifyMode(normalizeVerifyUrl(item)),
        verifyModePreset: item.verifyModePreset || (item.verifyMode && ["models_get", "chat_post"].includes(item.verifyMode) ? item.verifyMode : ""),
      };

      const existing = state.models.find((model) => model.name === normalized.name);
      if (existing) {
        existing.modelId = normalized.modelId;
        existing.verifyUrl = normalized.verifyUrl;
        existing.verifyUrlPreset = normalized.verifyUrlPreset;
        existing.verifyMode = normalized.verifyMode;
        existing.verifyModePreset = normalized.verifyModePreset;
        updated += 1;
      } else {
        state.models.push(normalized);
        added += 1;
      }
    });

    persistModels();
    renderModels();
    setImportStatus(`导入完成：新增 ${added} 个，更新 ${updated} 个。`, "success");
  } catch (error) {
    setImportStatus(`导入失败：${error.message}`, "error");
  }
}

function setImportStatus(message, tone) {
  elements.importStatus.className = `status-banner ${tone}`;
  elements.importStatus.textContent = message;
}

function exportCurrentConfig() {
  const payload = {
    models: state.models.map((model) => ({
      name: model.name,
      modelId: model.modelId,
      verifyUrl: model.verifyUrl,
      verifyMode: model.verifyMode || inferVerifyMode(model.verifyUrl),
    })),
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "model-config.export.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  setImportStatus("已导出当前模型配置。", "success");
}

function normalizeVerifyUrl(item) {
  if (item.verifyUrl) {
    return item.verifyUrl;
  }

  if (item.baseUrl) {
    try {
      return new URL(item.verifyPath || "/v1/models", item.baseUrl).toString();
    } catch (error) {
      return item.baseUrl;
    }
  }

  return "https://api.example.com/v1/models";
}

function inferVerifyMode(verifyUrl = "") {
  return /chat\/completions/i.test(verifyUrl) ? "chat_post" : "models_get";
}

function runAnalysis() {
  if (state.analysisMode === "baidu_search") {
    void runBaiduSearchAnalysis();
    return;
  }

  const sql = elements.sqlInput.value.trim();
  if (!sql) {
    elements.afterSummary.textContent = "请输入待优化 SQL。";
    return;
  }

  const originalLabel = elements.analyzeButton.textContent;
  elements.analyzeButton.textContent = "分析中...";
  elements.analyzeButton.disabled = true;
  const analysis = analyzeSql(sql, state.schemaMeta);
  state.results = analysis;
  renderResults(analysis);
  elements.analyzeButton.textContent = originalLabel;
  updateAnalyzeButtonState();
  showAnalysisToast("分析完成，结果已更新。");
}

async function runBaiduSearchAnalysis() {
  const baiduApiKey = elements.baiduApiKeyInput.value.trim();
  const sql = elements.sqlInput.value.trim();
  const schema = elements.schemaInput.value.trim();

  if (!baiduApiKey) {
    state.baiduStatusMessage = "请先填写百度 API Key，再使用百度搜索增强。";
    state.baiduStatusTone = "error";
    renderBaiduStatus();
    showAnalysisToast("请先填写百度 API Key");
    return;
  }

  if (!sql) {
    showAnalysisToast("请输入待优化 SQL");
    return;
  }

  const originalLabel = elements.analyzeButton.textContent;
  elements.analyzeButton.textContent = "分析中...";
  elements.analyzeButton.disabled = true;

  try {
    const response = await fetch("/api/baidu-search-analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        apiKey: baiduApiKey,
        schema,
        sql,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || `HTTP ${response.status}：百度搜索增强调用失败`);
    }

    const localAnalysis = analyzeSql(sql, state.schemaMeta);
    const merged = mergeBaiduAnalysis(localAnalysis, payload.result || {});
    renderResults(merged);
    state.baiduStatusMessage = "百度搜索增强分析完成，结果已更新。";
    state.baiduStatusTone = "success";
    renderBaiduStatus();
    showAnalysisToast("百度搜索增强分析完成，结果已更新。");
  } catch (error) {
    state.baiduStatusMessage = `百度搜索增强失败：${error.message}`;
    state.baiduStatusTone = "error";
    renderBaiduStatus();
    showAnalysisToast("百度搜索增强调用失败");
  } finally {
    elements.analyzeButton.textContent = originalLabel;
    updateAnalyzeButtonState();
  }
}

function mergeBaiduAnalysis(localAnalysis, remoteResult) {
  const usedRemoteAfterSummary = isUsefulRemoteText(remoteResult.afterSummary);
  const usedRemoteIndexSql = isUsefulRemoteText(remoteResult.indexSql, {
    invalidValues: ["-- 当前未生成新的索引语句"],
  });
  const usedRemoteRewriteSql = isUsefulRemoteText(remoteResult.rewrittenSql, {
    invalidValues: ["-- 当前未生成重写 SQL"],
  });
  const usedRemoteRisks = Array.isArray(remoteResult.risks) && remoteResult.risks.length;
  const usedRemoteExplain = Boolean(remoteResult.explainImprovement);

  return {
    ...localAnalysis,
    afterSummary: pickUsefulRemoteText(remoteResult.afterSummary, localAnalysis.afterSummary),
    indexSql: pickUsefulRemoteText(remoteResult.indexSql, localAnalysis.indexSql, {
      invalidValues: ["-- 当前未生成新的索引语句"],
    }),
    rewrittenSql: pickUsefulRemoteText(remoteResult.rewrittenSql, localAnalysis.rewrittenSql, {
      invalidValues: ["-- 当前未生成重写 SQL"],
    }),
    risks: usedRemoteRisks ? normalizeRisks(remoteResult.risks) : localAnalysis.risks,
    explainImprovement: remoteResult.explainImprovement || "",
    sources: {
      beforeSummary: "规则推断",
      beforeExplain: "规则推断",
      afterSummary: usedRemoteAfterSummary ? "规则推断 + 百度搜索增强" : "规则推断",
      indexSql: usedRemoteIndexSql ? "规则推断 + 百度搜索增强" : "规则推断",
      rewrittenSql: usedRemoteRewriteSql ? "规则推断 + 百度搜索增强" : "规则推断",
      afterExplain: usedRemoteExplain ? "规则推断 + 百度搜索增强" : "规则推断",
      risks: usedRemoteRisks ? "规则推断 + 百度搜索增强" : "规则推断",
    },
    trustSummary: "结果采用双层输出：本地规则推断负责结构化建议，百度搜索增强仅作为补充证据与经验样本。",
  };
}

function pickUsefulRemoteText(remoteValue, fallbackValue, options = {}) {
  const { invalidValues = [] } = options;
  const normalizedRemote = String(remoteValue || "").trim();

  if (!normalizedRemote) {
    return fallbackValue;
  }

  if (invalidValues.includes(normalizedRemote)) {
    return fallbackValue;
  }

  return normalizedRemote;
}

function isUsefulRemoteText(remoteValue, options = {}) {
  const { invalidValues = [] } = options;
  const normalizedRemote = String(remoteValue || "").trim();
  return Boolean(normalizedRemote) && !invalidValues.includes(normalizedRemote);
}

function showAnalysisToast(message) {
  elements.analysisToast.textContent = message;
  elements.analysisToast.classList.remove("hidden");
  window.clearTimeout(showAnalysisToast.timer);
  showAnalysisToast.timer = window.setTimeout(() => {
    elements.analysisToast.classList.add("hidden");
  }, 2200);
}

function analyzeSql(sql, schemaMeta) {
  const normalizedSql = sql.replace(/\s+/g, " ").trim();
  const aliasMap = buildAliasMap(normalizedSql);
  const conditions = collectConditions(normalizedSql);
  const orderBy = extractOrderBy(normalizedSql);
  const groupBy = extractGroupBy(normalizedSql);
  const selectColumns = extractSelectColumns(normalizedSql);

  const recommendations = [];
  const indexStatements = [];
  const risks = [];
  const indexDetails = [];

  schemaMeta.forEach((table) => {
    const relevant = conditions.filter((item) => resolveTableName(item.alias, aliasMap, item.column) === table.name);
    const equalityColumns = relevant.filter((item) => ["=", "IN"].includes(item.operator)).map((item) => item.column);
    const rangeColumns = relevant.filter((item) => [">", "<", ">=", "<=", "BETWEEN"].includes(item.operator)).map((item) => item.column);
    const functionColumns = relevant.filter((item) => item.isWrappedByFunction).map((item) => item.column);

    const orderColumns = orderBy
      .filter((item) => resolveTableName(item.alias, aliasMap, item.column) === table.name)
      .map((item) => item.column);
    const groupColumns = groupBy
      .filter((item) => resolveTableName(item.alias, aliasMap, item.column) === table.name)
      .map((item) => item.column);
    const selectedColumns = selectColumns
      .map((item) => item.match(/([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)/))
      .filter(Boolean)
      .filter((item) => resolveTableName(item[1], aliasMap, item[2]) === table.name)
      .map((item) => item[2]);

    const composite = uniqueOrdered([...equalityColumns, ...rangeColumns, ...orderColumns, ...groupColumns]);
    if (!composite.length) {
      return;
    }

    const alreadyCovered = table.indexes.some((index) => startsWithSequence(index.columns, composite));
    if (!alreadyCovered) {
      const name = `idx_${table.name}_${composite.join("_")}`.slice(0, 60);
      const statement = `ALTER TABLE ${table.name}\n  ADD INDEX ${name} (${composite.join(", ")});`;
      const indexType = composite.length > 1 ? "联合索引" : "单列索引";
      indexStatements.push(statement);
      recommendations.push(
        `${table.name}: 建议建立 ${indexType} (${composite.join(
          ", ",
        )})，优先命中 WHERE / ORDER BY / GROUP BY。`,
      );
      indexDetails.push({
        type: indexType,
        title: `${table.name}.${composite.join(" + ")}`,
        reason: `优先覆盖等值过滤列，再承接范围列、排序列或分组列，遵循最左前缀命中顺序。`,
      });
      risks.push({
        level: composite.length >= 3 ? "high" : "medium",
        title: `${table.name} 写入成本会增加`,
        body: `新增索引 ${composite.join(", ")} 会提升 SELECT 命中率，但 INSERT/UPDATE 时需要同步维护索引，写入放大需评估。`,
      });

      const coveringTail = selectedColumns.filter((column) => !composite.includes(column)).slice(0, 2);
      if (coveringTail.length) {
        recommendations.push(
          `${table.name}: 若该查询是热点读路径，可进一步评估覆盖索引 (${[...composite, ...coveringTail].join(
            ", ",
          )}) 以减少回表。`,
        );
        indexDetails.push({
          type: "覆盖索引",
          title: `${table.name}.${[...composite, ...coveringTail].join(" + ")}`,
          reason: `在现有过滤顺序后补入高频返回列，适合热点读查询，目标是减少回表。`,
        });
      }
    }

    functionColumns.forEach((column) => {
      recommendations.push(`${table.name}.${column}: 当前查询存在函数包裹，可能导致索引失效，建议改写为范围过滤。`);
      risks.push({
        level: "medium",
        title: `${table.name}.${column} 可能触发索引失效`,
        body: "字段被函数包裹后，优化器可能无法使用已有索引前缀，建议改写成可走范围扫描的条件。",
      });
    });
  });

  if (!recommendations.length) {
    recommendations.push("当前 SQL 未发现明显缺失索引，但仍建议结合真实 EXPLAIN 与数据分布复核。");
  }

  const rewrite = rewriteSql(sql, aliasMap, schemaMeta);
  const beforeExplain = simulateExplain({
    sql,
    conditions,
    recommended: false,
    hasRewrite: rewrite.changed,
  });
  const afterExplain = simulateExplain({
    sql: rewrite.sql,
    conditions,
    recommended: true,
    hasRewrite: rewrite.changed,
  });

  const beforeSummary = [
    `检测到 ${Object.keys(aliasMap).length} 个表别名，${conditions.length} 个过滤条件。`,
    conditions.some((item) => item.isWrappedByFunction) ? "存在函数包裹列，索引命中概率下降。" : "过滤条件以普通谓词为主。",
    orderBy.length ? `ORDER BY 使用 ${orderBy.map((item) => item.column).join(", ")}。` : "未检测到 ORDER BY。",
  ].join(" ");

  const afterSummary = [
    `索引建议 ${indexStatements.length} 条，SQL 重写${rewrite.changed ? "已生成" : "未触发强规则改写"}。`,
    rewrite.notes.join(" "),
    recommendations.join(" "),
  ].join("\n");

  return {
    beforeSummary,
    afterSummary,
    indexSql: indexStatements.length ? indexStatements.join("\n\n") : "-- 当前未生成新的索引语句",
    rewrittenSql: rewrite.sql,
    beforeExplain,
    afterExplain,
    risks: normalizeRisks(risks),
    indexDetails,
    rewriteDetails: rewrite.details,
    explainImprovement: "",
    sources: {
      beforeSummary: "规则推断",
      beforeExplain: "规则推断",
      afterSummary: "规则推断",
      indexSql: "规则推断",
      rewrittenSql: "规则推断",
      afterExplain: "规则推断",
      risks: "规则推断",
    },
    trustSummary: "当前结果完全来自本地规则推断，适合先做初筛，再结合真实 EXPLAIN 与数据分布复核。",
  };
}

function buildAliasMap(sql) {
  const aliasMap = {};
  const regex = /\b(?:FROM|JOIN)\s+`?([a-zA-Z0-9_]+)`?(?:\s+(?:AS\s+)?([a-zA-Z0-9_]+))?/gi;
  let match;
  while ((match = regex.exec(sql))) {
    const table = match[1];
    const alias = match[2] || table;
    aliasMap[alias] = table;
  }
  return aliasMap;
}

function collectConditions(sql) {
  const whereMatch = sql.match(/\bWHERE\b([\s\S]*?)(?:\bGROUP\s+BY\b|\bORDER\s+BY\b|\bLIMIT\b|;|$)/i);
  if (!whereMatch) {
    return [];
  }

  const raw = whereMatch[1].split(/\bAND\b/i).map((part) => part.trim()).filter(Boolean);
  return raw.map((fragment) => {
    const functionMatch = fragment.match(/([A-Z_]+)\s*\(\s*([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\s*\)/i);
    const plainMatch = fragment.match(/([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\s*(=|>=|<=|>|<|IN|BETWEEN|LIKE)/i);
    const target = functionMatch || plainMatch;
    return {
      raw: fragment,
      alias: target?.[2] || target?.[1] || "",
      column: target?.[3] || target?.[2] || "",
      operator: (plainMatch?.[3] || fragment.match(/\b(IN|BETWEEN|LIKE)\b/i)?.[1] || "=").toUpperCase(),
      isWrappedByFunction: Boolean(functionMatch),
    };
  });
}

function extractOrderBy(sql) {
  const match = sql.match(/\bORDER\s+BY\b([\s\S]*?)(?:\bLIMIT\b|;|$)/i);
  if (!match) {
    return [];
  }

  return match[1]
    .split(",")
    .map((part) => part.trim())
    .map((part) => {
      const item = part.match(/([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)/);
      return item ? { alias: item[1], column: item[2] } : null;
    })
    .filter(Boolean);
}

function extractGroupBy(sql) {
  const match = sql.match(/\bGROUP\s+BY\b([\s\S]*?)(?:\bORDER\s+BY\b|\bLIMIT\b|;|$)/i);
  if (!match) {
    return [];
  }

  return match[1]
    .split(",")
    .map((part) => part.trim())
    .map((part) => {
      const item = part.match(/([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)/);
      return item ? { alias: item[1], column: item[2] } : null;
    })
    .filter(Boolean);
}

function extractSelectColumns(sql) {
  const match = sql.match(/\bSELECT\b([\s\S]*?)\bFROM\b/i);
  if (!match) {
    return [];
  }

  return match[1]
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function resolveTableName(alias, aliasMap, fallback) {
  return aliasMap[alias] || aliasMap[fallback] || alias || "";
}

function uniqueOrdered(items) {
  return [...new Set(items.filter(Boolean))];
}

function startsWithSequence(existing, target) {
  return target.every((column, index) => existing[index] === column);
}

function rewriteSql(sql) {
  let rewritten = sql;
  const notes = [];
  const details = [];

  rewritten = rewritten.replace(
    /DATE\(\s*([a-zA-Z0-9_]+\.[a-zA-Z0-9_]+)\s*\)\s*=\s*'(\d{4}-\d{2}-\d{2})'/gi,
    (_, field, date) => {
      notes.push(`将 DATE(${field}) 改写为时间范围过滤，避免函数导致索引失效。`);
      details.push({
        type: "函数改写",
        reason: `把 DATE(${field}) 改为闭开区间过滤，更容易命中 ${field} 上的已有索引。`,
      });
      const nextDate = addOneDay(date);
      return `${field} >= '${date} 00:00:00' AND ${field} < '${nextDate} 00:00:00'`;
    },
  );

  if (/\bUNION\b/i.test(rewritten) && !/\bUNION\s+ALL\b/i.test(rewritten)) {
    notes.push("如果业务允许去重省略，优先使用 UNION ALL 减少排序与临时表开销。");
    details.push({
      type: "集合运算优化",
      reason: "如果结果不依赖去重，UNION ALL 往往比 UNION 少一次去重排序和临时表开销。",
    });
  }

  const limitMatch = rewritten.match(/\bLIMIT\s+(\d+)\s*,\s*(\d+)/i);
  if (limitMatch && Number(limitMatch[1]) > 1000) {
    notes.push("检测到大偏移分页，建议改为基于主键或时间游标的 seek 分页。");
    details.push({
      type: "分页优化",
      reason: "大 OFFSET 会导致前段记录被扫描后再丢弃，改成游标分页通常更稳。",
    });
  }

  const inSubquery = rewritten.match(/\bIN\s*\(\s*SELECT\b/i);
  if (inSubquery) {
    notes.push("存在 IN 子查询，可评估改为 EXISTS 或 JOIN，减少子查询物化。");
    details.push({
      type: "子查询改写",
      reason: "IN 子查询在部分场景下会触发物化或大范围扫描，EXISTS / JOIN 更易被优化器改写。",
    });
  }

  const changed = rewritten !== sql || notes.length > 0;
  if (!notes.length) {
    notes.push("未发现必须改写的高风险模式，保留原 SQL。");
    details.push({
      type: "保留原 SQL",
      reason: "当前语句没有命中特别强的改写规则，建议先结合索引优化与真实执行计划复核。",
    });
  }

  return {
    sql: rewritten,
    notes,
    details,
    changed,
  };
}

function addOneDay(date) {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day + 1));
  const nextYear = value.getUTCFullYear();
  const nextMonth = String(value.getUTCMonth() + 1).padStart(2, "0");
  const nextDay = String(value.getUTCDate()).padStart(2, "0");
  return `${nextYear}-${nextMonth}-${nextDay}`;
}

function simulateExplain({ conditions, recommended, hasRewrite }) {
  const type = recommended ? (hasRewrite ? "range" : "ref") : conditions.length ? "ALL" : "index";
  const rows = recommended ? Math.max(12, 1200 - conditions.length * 320) : 18000;
  const extra = recommended ? "Using index condition; Using where" : "Using where; Using filesort";

  return {
    rowsData: [{ id: 1, selectType: "SIMPLE", table: "primary", type, rows, extra }],
    primaryType: type,
    estimatedRows: rows,
    extra,
  };
}

function renderExplainTable(rows) {
  return `
    <table>
      <thead>
        <tr>
          <th>id</th>
          <th>select_type</th>
          <th>table</th>
          <th>type</th>
          <th>rows</th>
          <th>Extra</th>
        </tr>
      </thead>
      <tbody>
        ${rows
          .map(
            (row) => `
              <tr>
                <td>${highlightPlainText(String(row.id))}</td>
                <td>${highlightPlainText(String(row.selectType))}</td>
                <td>${highlightPlainText(String(row.table))}</td>
                <td>${highlightPlainText(String(row.type))}</td>
                <td>${highlightPlainText(String(row.rows))}</td>
                <td>${highlightPlainText(String(row.extra))}</td>
              </tr>
            `,
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function renderExplainComparison(beforeExplain, afterExplain, explainImprovement) {
  const rowsDelta = Math.max(0, beforeExplain.estimatedRows - afterExplain.estimatedRows);
  const reduction = beforeExplain.estimatedRows
    ? `${Math.round((rowsDelta / beforeExplain.estimatedRows) * 100)}%`
    : "0%";

  return `
    <div class="explain-compare-grid">
      <div class="explain-stat">
        <span>type</span>
        <strong>${highlightPlainText(beforeExplain.primaryType)} → ${highlightPlainText(afterExplain.primaryType)}</strong>
      </div>
      <div class="explain-stat">
        <span>rows</span>
        <strong>${highlightPlainText(String(beforeExplain.estimatedRows))} → ${highlightPlainText(String(afterExplain.estimatedRows))}</strong>
      </div>
      <div class="explain-stat">
        <span>rows 下降幅度</span>
        <strong>${highlightPlainText(reduction)}</strong>
      </div>
    </div>
    ${renderExplainTable(afterExplain.rowsData)}
    ${
      explainImprovement
        ? `<div class="explain-note">${highlightPlainText(explainImprovement, { preserveLineBreaks: true })}</div>`
        : ""
    }
  `;
}

function renderResults(result) {
  elements.beforeSummary.innerHTML = highlightPlainText(result.beforeSummary, { preserveLineBreaks: true });
  elements.beforeSummary.classList.remove("empty-state");
  elements.afterSummary.innerHTML = highlightPlainText(result.afterSummary, { preserveLineBreaks: true });
  elements.afterSummary.classList.remove("empty-state");
  elements.indexSql.innerHTML = highlightSql(result.indexSql);
  elements.indexSql.classList.remove("empty-state");
  elements.rewrittenSql.innerHTML = highlightSql(result.rewrittenSql);
  elements.rewrittenSql.classList.remove("empty-state");
  elements.beforeExplain.innerHTML = renderExplainTable(result.beforeExplain.rowsData);
  elements.beforeExplain.classList.remove("empty-state");
  elements.afterExplain.innerHTML = renderExplainComparison(
    result.beforeExplain,
    result.afterExplain,
    result.explainImprovement,
  );
  elements.afterExplain.classList.remove("empty-state");
  renderSourceLabels(result.sources, result.trustSummary);
  renderInsightList(elements.indexAdviceMeta, result.indexDetails, "索引类型与命中理由会展示在这里。");
  renderInsightList(elements.rewriteAdviceMeta, result.rewriteDetails, "重写策略与适用原因会展示在这里。");

  if (!result.risks.length) {
    elements.riskList.innerHTML = '<div class="risk-item"><strong><span class="risk-level risk-low">低风险</span> 低写放大</strong><span>当前未检测到明显写放大风险。</span></div>';
  } else {
    elements.riskList.innerHTML = result.risks
      .map(
        (risk) => `
          <div class="risk-item">
            <strong><span class="risk-level risk-${risk.level}">${riskLevelLabel(risk.level)}</span> ${risk.title}</strong>
            <span>${risk.body}</span>
          </div>
        `,
      )
      .join("");
  }
}

function renderSourceLabels(sources, trustSummary) {
  elements.beforeSummarySource.textContent = `结果来源：${sources.beforeSummary}`;
  elements.beforeExplainSource.textContent = `结果来源：${sources.beforeExplain}`;
  elements.afterSummarySource.textContent = `结果来源：${sources.afterSummary}`;
  elements.indexSqlSource.textContent = `结果来源：${sources.indexSql}`;
  elements.rewrittenSqlSource.textContent = `结果来源：${sources.rewrittenSql}`;
  elements.afterExplainSource.textContent = `结果来源：${sources.afterExplain}`;
  elements.resultTrustBanner.classList.remove("hidden");
  elements.resultTrustBanner.textContent = trustSummary;
}

function renderInsightList(container, items, emptyText) {
  if (!Array.isArray(items) || !items.length) {
    container.className = "insight-list empty-state";
    container.textContent = emptyText;
    return;
  }

  container.className = "insight-list";
  container.innerHTML = items
    .map(
      (item) => `
        <div class="insight-item">
          <strong>${highlightPlainText(item.type)}</strong>
          <span>${highlightPlainText(item.title || item.reason)}</span>
          ${item.title ? `<em>${highlightPlainText(item.reason)}</em>` : ""}
        </div>
      `,
    )
    .join("");
}

function normalizeRisks(risks) {
  return (Array.isArray(risks) ? risks : []).map((risk) => ({
    level: risk.level || "medium",
    title: risk.title || "风险提示",
    body: risk.body || "",
  }));
}

function riskLevelLabel(level) {
  if (level === "high") {
    return "高风险";
  }
  if (level === "low") {
    return "低风险";
  }
  return "中风险";
}

function highlightPlainText(text, options = {}) {
  const { preserveLineBreaks = false } = options;
  let html = escapeHtml(String(text || ""));

  html = html.replace(
    /\b(WHERE|ORDER BY|GROUP BY|JOIN|LEFT JOIN|RIGHT JOIN|LIMIT|EXISTS|UNION ALL|UNION|EXPLAIN|SELECT|FROM|ALTER TABLE|ADD INDEX|CREATE INDEX|Using where|Using filesort|Using index condition|SIMPLE|ALL|ref|range)\b/gi,
    '<span class="token-plain-keyword">$1</span>',
  );

  html = html.replace(
    /\b(优化完成|联合索引|单列索引|覆盖索引|风险|高风险|中风险|低风险|写入成本|回表|全表扫描|索引失效|范围过滤|规则推断|百度搜索增强)\b/gi,
    '<span class="token-plain-emphasis">$1</span>',
  );

  if (preserveLineBreaks) {
    html = html.replace(/\n/g, "<br>");
  }

  return html;
}

function detectVerifyUrlIssue(verifyUrl, verifyMode) {
  const normalized = String(verifyUrl || "").trim();
  if (!normalized) {
    return "";
  }

  if (/\/v1\/?$/i.test(normalized)) {
    return verifyMode === "chat_post"
      ? "当前完整验证地址看起来像基地址，你可能少填了 /chat/completions。"
      : "当前完整验证地址看起来像基地址，你可能少填了 /models。";
  }

  if (verifyMode === "chat_post" && !/chat\/completions/i.test(normalized)) {
    return "当前验证方式是 POST /chat/completions，但完整验证地址里没有 /chat/completions，请检查。";
  }

  if (verifyMode === "models_get" && !/\/models(\?|$)/i.test(normalized)) {
    return "当前验证方式是 GET /models，但完整验证地址里没有 /models，请检查。";
  }

  return "";
}

function updateVerifyHint() {
  const model = state.models.find((entry) => entry.id === state.activeModelId);
  if (!model) {
    elements.verifyHintBanner.classList.add("hidden");
    return;
  }

  const hint = detectVerifyUrlIssue(model.verifyUrl, model.verifyMode || inferVerifyMode(model.verifyUrl));
  if (!hint) {
    elements.verifyHintBanner.classList.add("hidden");
    elements.verifyHintBanner.textContent = "";
    return;
  }

  elements.verifyHintBanner.className = "status-banner warning";
  elements.verifyHintBanner.textContent = hint;
}

function renderModelRowHint(model, row) {
  const hintEl = row.querySelector('[data-role="verifyHint"]');
  if (!hintEl) {
    return;
  }

  const hint = detectVerifyUrlIssue(model.verifyUrl, model.verifyMode || inferVerifyMode(model.verifyUrl));
  hintEl.textContent = hint;
  hintEl.classList.toggle("hidden", !hint);
}

function setupInactivityLock() {
  const reset = () => {
    window.clearTimeout(setupInactivityLock.timer);
    setupInactivityLock.timer = window.setTimeout(lockSensitiveSession, INACTIVITY_LOCK_MS);
  };

  ["pointerdown", "keydown", "mousemove", "touchstart"].forEach((eventName) => {
    window.addEventListener(eventName, reset, { passive: true });
  });

  reset();
}

function lockSensitiveSession() {
  const hadConfiguredSession = state.verified;
  const hadBaiduSession = state.baiduVerified;
  state.inactivityLocked = true;
  state.activeSecret = "";
  state.verified = false;
  state.baiduVerified = false;
  persistVerifiedModelId("");
  persistBaiduVerified(false);

  if (elements.apiKeyInput.type === "text") {
    elements.apiKeyInput.type = "password";
    elements.toggleSecretButton.textContent = "显示";
  }

  if (elements.baiduApiKeyInput.type === "text") {
    elements.baiduApiKeyInput.type = "password";
    elements.toggleBaiduSecretButton.textContent = "显示";
  }

  if (hadConfiguredSession) {
    state.verificationMessage = "已因 10 分钟无操作自动锁定，请重新验证当前模型后再继续分析。";
    state.verificationTone = "warning";
  }

  if (hadBaiduSession) {
    state.baiduStatusMessage = "百度搜索增强已因 10 分钟无操作自动锁定，请重新验证后再使用。";
    state.baiduStatusTone = "warning";
  }

  renderVerification();
  showAnalysisToast("敏感配置已自动锁定");
}
