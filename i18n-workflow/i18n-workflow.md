# i18n Workflow

> Compatibility note: the canonical skill entry is now `SKILL.md`. This file is kept for older agents and installations that still load `i18n-workflow.md` directly.

## 稳定 CLI 入口

调用统一 CLI，不要临时拼脚本或直接调用内部模块：

```bash
node skills/i18n-workflow/scripts/i18n-workflow-cli.cjs --help
node skills/i18n-workflow/scripts/i18n-workflow-cli.cjs doctor --config tools/i18n-workflow.config.cjs
node skills/i18n-workflow/scripts/i18n-workflow-cli.cjs probe --config tools/i18n-workflow.config.cjs
node skills/i18n-workflow/scripts/i18n-workflow-cli.cjs run --config tools/i18n-workflow.config.cjs --steps extract,audit,jobs,review --dry-run
```

`scripts/i18n-workflow-cli.cjs` 是唯一执行入口；内部实现位于 `scripts/i18n_workflow/`，stdout 保持结构化 JSON。

迁移评分和删除旧入口说明见 `references/migration-assessment.md`。

当用户提到多语言、i18n、国际化、新增语言、文字图片生成、资源审计、图片对比复核、重生成任务等相关话题时，按以下流程执行。

## 权威文档

所有流程规则、契约、checklist 见本目录下的 `README.md`、`contracts.md`、`checklists.md`。不要凭记忆执行，每次先读取最新文档。

## 项目配置

安装后项目应有一份 adapter/config（默认在 `tools/i18n-workflow.config.cjs`），它声明了：
- 支持的语言、基准语言、fallback chain
- locale / spriteFrame 数据如何读取
- 资源目录、报告目录
首次使用时先读取该 config 确认项目绑定是否完成。如果不存在，按 `templates/config.example.cjs` 创建。

### 当前工作区边界

审计默认只描述**当前工作区真实存在的文件**：

- `supportedLanguages` 只能包含当前工作区实际有 runtime/locale/资源支持、并准备随包发布的语言。
- 不要因为 `git ls-files`、`git status` 中的删除项、`git show HEAD:<path>`、旧分支、旧提交或历史 i18n 实验而把语言加入当前审计。
- 如果当前工作区没有 `en/ar/vi` runtime、locale 或资源，配置应保持 `supportedLanguages: ['zh']` 和 `fallbackChain: ['zh']`。
- 只有用户明确要求“对比历史 i18n”“检查被删除的多语言资源”“恢复旧 i18n”时，才可以读取 Git 历史；这种结果必须标注为历史/回归审计，不得混入当前工作区审计结论。

### 首次绑定流程

安装后 config 中的 `getLocales()` 和 `getSpriteFrameMap()` 默认返回空对象，必须补全才能正常工作。

先判断项目当前处于哪个阶段，再按对应路径执行：

#### 阶段 A：项目已有 i18n 基础设施

如果当前工作区中已存在 locale/i18n 文件（如 `locales/*.json`、`i18n/*.json`、`src/locales/`、或代码中有 i18n 管理模块），则：

1. 定位这些文件，在 config 的 `getLocales()` 中实现读取逻辑。
2. 如果有图片本地化映射，在 `getSpriteFrameMap()` 中实现读取逻辑。
3. 跑一次审计校验绑定是否成功。

#### 阶段 B：项目尚无 i18n（常见初始状态）

大多数项目初始没有任何 i18n 文件，文本直接硬编码在代码中（中文或英文）。此时需要从零建立 i18n 基础设施：

1. **识别源语言**：扫描代码中的硬编码字符串，判断项目主语言（通常是中文或英文）。
2. **提取文本**：从 UI 代码（模板/组件/场景文件）中提取所有面向用户的硬编码文本字符串，忽略日志、变量名、技术常量。
3. **创建 locale 文件**：
   - 创建 `locales/` 目录（或项目约定的位置）。
   - 将提取的文本写入源语言文件（如 `locales/zh.json`），key 按功能模块分组命名。
   - 为目标语言创建对应文件（如 `locales/en.json`），value 留空或翻译。
4. **创建 i18n runtime**：根据项目框架，创建或引入 i18n 运行时模块，实现：
   - 浏览器语言检测。
   - 文本 key 查找与 fallback chain。
   - 语言切换接口。
5. **替换硬编码**：将代码中的硬编码字符串替换为 i18n key 调用（如 `t('common.accept')`）。
6. **补全 config**：在 `getLocales()` 中读取刚创建的 locale 文件。
7. **校验**：跑一次审计确认 locale 覆盖率。

#### 通用注意事项

- config 中不要 `require()` 业务代码，用 `fs.readFileSync` 读源文件再解析。
- config 只读取当前工作区文件系统中存在的文件；不要用 Git 历史或已删除文件补全 `getLocales()` / `getSpriteFrameMap()`。
- 如果项目没有图片本地化需求，`getSpriteFrameMap()` 保持返回 `{}` 即可。
- 确认 `assetsRoot`、`resourcesRoot`、`reportDirectory` 等路径与当前项目结构匹配。

## CLI 步骤映射

所有阶段通过统一 `run` 命令选择：

```bash
node skills/i18n-workflow/scripts/i18n-workflow-cli.cjs run --config tools/i18n-workflow.config.cjs --steps extract,audit,generate,quality,compare,jobs,review --dry-run
```

- `extract`：硬编码文本提取。
- `audit`：资源 / sprite-frame / 本地化映射审计。
- `generate`：manifest、分类和图片生成；真正调用 API 时需要 `--execute` 及可解析的 provider 配置。
- `quality` / `compare`：生成图片规格与对比质量报告。
- `jobs`：失败重生成任务。
- `review`：人工复核材料。

模型访问按顺序使用领域专属环境变量、共享 `BASE_URL` / `API_KEY`，或 cc-switch 写入的 Codex provider/base_url 与 auth 文件；不会自动发现本地 `127.0.0.1:<port>` 代理。分类和生成请求默认并发为 10，可用 `--concurrency=<1-10>` 调整。

## 执行原则

1. 先读本目录下 `README.md` 确认流程，再动手。
2. 先读项目 config 确认当前语言配置。
3. 当前工作区没有多语言基础设施时，保持 zh-only 审计；不要从历史文件推断 en/ar/vi。
4. 运行时语言由项目当前 runtime 决定；缺失时按当前 config 的 fallback chain 回退。
5. 不要硬编码语言列表，从 config 读取。
6. 审计报告在 config 声明的 `reportDirectory` 中，每次运行自动覆盖。
7. 新增语言时按 `checklists.md` 中的 checklist 逐项检查。

## 自动化模式

本 skill 的所有操作可以无需人工确认直接执行。

当用户说"跑 i18n 审计"、"新增越南语"、"检查图片质量"等指令时：
- 不要询问"是否要执行"，直接跑对应命令。
- 不要等待确认再继续下一步，按编排顺序连续执行。
- 如果某一步失败，输出错误信息后继续后续步骤，最后汇总报告。
- 只有涉及 `--execute`（真正调用 API 生成图片、会消耗费用）时，先告知用户将要消耗 API 调用，等用户确认后再执行。
