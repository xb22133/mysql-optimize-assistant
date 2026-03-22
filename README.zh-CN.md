# MySQL 智能查询优化与索引推荐助手

[![Release](https://img.shields.io/github/v/release/xb22133/mysql-optimize-assistant?label=release)](https://github.com/xb22133/mysql-optimize-assistant/releases)
[![平台](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-blue)](./README.md)
[![技术栈](https://img.shields.io/badge/stack-HTML%20%7C%20CSS%20%7C%20JavaScript%20%7C%20Node.js-111827)](./package.json)
[![English](https://img.shields.io/badge/docs-English-0f766e)](./README.en.md)

一个面向 MySQL 查询分析场景的轻量级本地工具。它可以解析多表结构、分析 `SELECT` 语句、生成索引架构优化建议、提供 SQL 零侵入重写方案，并通过启发式 `EXPLAIN` 模拟帮助你更快判断优化方向。

## 快速入口

- [仓库首页说明](./README.md)
- [英文文档](./README.en.md)
- [模型配置导入说明](./docs/model-config-import.md)
- [最新版本发布](https://github.com/xb22133/mysql-optimize-assistant/releases/latest)

## 适用场景

- 开发阶段快速检查 SQL 是否缺索引
- 只拿得到 DDL 和 SQL，先做首轮优化评估
- 生产环境不方便直接改表时，先寻找零侵入重写方案
- 团队内部演示 SQL 调优流程、Explain 思路和风险提示

## 核心能力

- 多表结构输入
  - 支持一次粘贴多个 `CREATE TABLE`
  - 自动识别表名、字段、主键和已有索引
  - 支持弹窗式增量插入与一键清空

- SQL 分析输出
  - 索引架构优化建议
  - SQL 零侵入重写建议
  - Explain 模拟对比
  - 风险提示分级
  - 建议来源分层展示

- 模型接入与验证
  - 支持自定义模型列表维护
  - 支持 JSON 导入、合并、导出
  - 支持 `GET /models` 与 `POST /chat/completions`
  - 支持根据常见 `modelId` 自动推荐验证地址和验证方式
  - 支持 `verifyUrl` 智能纠错提示

- 百度搜索增强
  - 支持调用百度官方智能搜索生成接口
  - 与本地规则分析结果融合展示
  - 将搜索增强标记为补充来源，避免与规则分析混淆

- 安全与易用性
  - API Key 是否持久化保存由用户自行决定
  - 支持一键重置/清除
  - 已验证会话 10 分钟无操作后自动锁定
  - 导出模型配置时默认不包含 API Key

## 分析模式

### 1. 配置大模型

适合已经有自定义模型服务、OpenAI 兼容服务或团队内网网关的场景。

使用方式：

1. 在“大模型配置中心”维护模型列表
2. 选择当前验证模型
3. 填写 API Key
4. 点击“验证并启用”
5. 返回“开始优化分析”

### 2. 百度搜索增强

适合希望借助外部搜索增强结果、补充经验型优化建议的场景。

使用方式：

1. 切换分析模式为“百度搜索增强”
2. 填写百度 API Key
3. 点击“验证并启用”
4. 运行分析

说明：

- 百度搜索增强不是替代规则分析，而是补充外部经验与案例线索
- 结果区会明确标注哪些内容来自“规则推断”，哪些来自“规则推断 + 百度搜索增强”

## 启动方式

### 命令行启动

```bash
npm start
```

### 双击启动

- macOS：双击 `launch.command`
- Windows：双击 `launch.bat`

启动器会自动：

- 弹出端口输入框，默认 `8080`
- 检查服务是否已启动
- 如未启动则自动拉起 `server.js`
- 自动打开浏览器

如果关闭端口输入框，启动器会直接退出。

## 文件结构

- `index.html`：页面结构
- `styles.css`：UI 样式与响应式布局
- `app.js`：表结构解析、SQL 分析、结果渲染、前端状态管理
- `server.js`：本地静态服务和代理接口
- `start.js`：一键启动入口
- `launch.command`：macOS 双击启动脚本
- `launch.bat`：Windows 双击启动脚本
- `docs/model-config.template.json`：模型配置导入模板
- `docs/model-config-import.md`：模型配置导入说明

## 使用流程建议

1. 先粘贴表结构和待优化 SQL
2. 再确认分析模式
3. 如果走“配置大模型”，优先检查：
   - `modelId`
   - 完整验证地址
   - 验证方式
4. 如果走“百度搜索增强”，先验证百度 API Key
5. 查看结果区时优先关注：
   - 索引类型与命中理由
   - SQL 重写原因
   - Explain 对比
   - 风险等级

## 安全说明

- API Key 默认不强制持久化，是否保存由用户手动开关控制
- 点击“重置/清除”会同时清空当前输入和内存会话
- 10 分钟无操作后，已验证状态会自动失效并重新上锁
- 为了降低浏览器直连第三方接口导致的 CORS 问题，验证与百度搜索增强都通过本地代理完成

## 已知边界

- SQL 解析和 Explain 对比属于启发式模拟，不等价于真实数据库执行计划
- 结果适合做首轮判断，不建议替代真实环境中的 `EXPLAIN ANALYZE`、慢查询日志和数据分布分析
- 不同厂商的 OpenAI 兼容接口细节可能存在差异，建议结合官方文档确认
