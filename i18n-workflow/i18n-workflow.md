# i18n Workflow

当用户提到多语言、i18n、国际化、新增语言、文字图片生成、资源审计、图片对比复核、重生成任务等相关话题时，按以下流程执行。

## 权威文档

所有流程规则、契约、checklist 见本目录下的 `README.md`、`contracts.md`、`checklists.md`。不要凭记忆执行，每次先读取最新文档。

## 项目配置

安装后项目应有一份 adapter/config（默认在 `tools/i18n-workflow.config.cjs`），它声明了：
- 支持的语言、基准语言、fallback chain
- locale / spriteFrame 数据如何读取
- 资源目录、报告目录

首次使用时先读取该 config 确认项目绑定是否完成。如果不存在，按 `templates/config.example.cjs` 创建。

## 可用工具

工具脚本在本目录 `tools/` 中，项目可能有 wrapper 在 `tools/i18n/` 中（仅一行 require 委托到这里）。

### 资源审计
```bash
node tools/audit-i18n-assets.cjs --config=tools/i18n-workflow.config.cjs
```

### 端到端编排
```bash
node skills/i18n-workflow/tools/run-i18n-workflow.cjs --config=tools/i18n-workflow.config.cjs --steps=audit,generate,jobs,review --dry-run
```

### 图片生成（需要 API key）
```bash
node tools/generate-i18n-images.cjs --config=tools/i18n-workflow.config.cjs --generate --execute
```

### 重生成任务提取
```bash
node skills/i18n-workflow/tools/extract-i18n-regeneration-jobs.cjs --config=tools/i18n-workflow.config.cjs --only=failed
```

### 复核材料生成
```bash
node skills/i18n-workflow/tools/build-i18n-review-sheets.cjs --config=tools/i18n-workflow.config.cjs
```

### 图片检查（需要 uv + Pillow）
```bash
uv run --with pillow python skills/i18n-workflow/tools/image-ops.py inspect --path <图片路径>
uv run --with pillow python skills/i18n-workflow/tools/image-ops.py compare --source <源图> --target <目标图>
```

## 执行原则

1. 先读本目录下 `README.md` 确认流程，再动手。
2. 先读项目 config 确认当前语言配置。
3. 运行时语言由浏览器环境自动检测，不固定为 zh；缺失时按 fallback chain 回退。
4. 不要硬编码语言列表，从 config 读取。
5. 审计报告在 config 声明的 `reportDirectory` 中，每次运行自动覆盖。
6. 新增语言时按 `checklists.md` 中的 checklist 逐项检查。

## 自动化模式

本 skill 的所有操作可以无需人工确认直接执行。

当用户说"跑 i18n 审计"、"新增越南语"、"检查图片质量"等指令时：
- 不要询问"是否要执行"，直接跑对应命令。
- 不要等待确认再继续下一步，按编排顺序连续执行。
- 如果某一步失败，输出错误信息后继续后续步骤，最后汇总报告。
- 只有涉及 `--execute`（真正调用 API 生成图片、会消耗费用）时，先告知用户将要消耗 API 调用，等用户确认后再执行。
