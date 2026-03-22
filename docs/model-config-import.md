# 模型配置 JSON 导入说明

## 1. 支持的 JSON 结构

可以使用以下两种格式之一：

### 格式 A：对象包裹 `models`

```json
{
  "models": [
    {
      "name": "OpenAI GPT-4.1",
      "modelId": "gpt-4.1",
      "verifyUrl": "https://api.openai.com/v1/models",
      "verifyMode": "models_get"
    }
  ]
}
```

### 格式 B：直接传数组

```json
[
  {
    "name": "OpenAI GPT-4.1",
    "modelId": "gpt-4.1",
    "verifyUrl": "https://api.openai.com/v1/models",
    "verifyMode": "models_get"
  }
]
```

## 2. 字段含义

- `name`：界面展示名称，同时也是导入合并时的唯一匹配键
- `modelId`：真实模型标识，例如 `gpt-4.1`
- `verifyUrl`：完整验证地址，例如 `https://api.openai.com/v1/models`
- `verifyMode`：验证方式，可选 `models_get` 或 `chat_post`

兼容说明：

- 旧格式里的 `baseUrl` 和 `verifyPath` 仍可导入，系统会自动转换成新的 `verifyUrl`
- 未填写 `verifyMode` 时，系统会根据地址自动推断；包含 `chat/completions` 的地址会默认用 `chat_post`

## 3. 合并策略

- 如果导入项的 `name` 与当前已有模型重名，则更新其 `modelId`、`verifyUrl`、`verifyMode`
- 如果 `name` 不存在，则作为新模型追加
- 不会删除你已经手动添加但本次 JSON 中未出现的模型

## 4. 如何使用

1. 在页面右侧“导入配置”区域点击“下载模板”，得到 `model-config.template.json`
2. 按照你自己的模型服务地址修改 `verifyUrl`，并按接口类型设置 `verifyMode`
3. 通过两种方式之一导入：
   - 上传 `.json` 文件
   - 直接把 JSON 粘贴到文本框
4. 点击“导入并合并”
5. 导入成功后，在“当前验证模型”下拉框中选择目标模型
6. 输入 API Key，点击“验证并启用”

## 5. 推荐做法

- 团队统一维护一份共享 JSON，个人再在界面里手动微调
- OpenAI 兼容服务一般可直接填写完整地址，例如 `https://api.example.com/v1/models`
- MiniMax 建议使用 `https://api.minimaxi.com/v1/chat/completions`，并设置 `verifyMode` 为 `chat_post`
- 如果模型网关有跨域限制，建议通过你们自己的后端代理转发验证请求
