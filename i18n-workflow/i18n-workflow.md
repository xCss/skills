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

## 可用工具

以下工具全部在本 skill 包的 `tools/` 目录中，路径相对于项目根目录为 `skills/i18n-workflow/tools/`。

### 端到端编排
```bash
node skills/i18n-workflow/tools/run-i18n-workflow.cjs --config=tools/i18n-workflow.config.cjs --steps=extract,audit,generate,jobs,review --dry-run
```

### 硬编码文本提取
```bash
node skills/i18n-workflow/tools/extract-hardcoded-text.cjs --config=tools/i18n-workflow.config.cjs
```

### 资源审计
```bash
node skills/i18n-workflow/tools/audit-i18n-assets.cjs --config=tools/i18n-workflow.config.cjs
```

### 图片生成（需要 API key）
```bash
node skills/i18n-workflow/tools/generate-i18n-images.cjs --config=tools/i18n-workflow.config.cjs --generate --execute
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
