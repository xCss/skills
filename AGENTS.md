# AGENTS.md — Skill + CLI 架构规范

本项目中的技能优先采用 **Skill + CLI** 架构：Skill 负责认知、路由和工作流；CLI 负责稳定、可重复、可测试的执行。不要把核心执行逻辑堆进 `SKILL.md` 或依赖 agent 临场拼脚本。

## 必须遵守的决策规则

如果用户要求创建、迁移或重构可复用的 skill、plugin、workflow、媒体生成器、文档处理器、API wrapper、scraper 或 automation capability，必须先判断 **Skill + CLI** 是否适用。

1. **新建能力**：先查是否已有类似 Skill 或可复用 CLI；能扩展就不要重复创建窄技能。
2. **迁移旧 Skill**：必须先做 Existing Skill Migration Assessment，分类并打分；不要盲目 CLI 化。
3. **纯知识 / 指南型 Skill**：通常保持 Skill-only，明确说明为什么不需要 CLI。
4. **工作流 / 脚本堆积型 Skill**：如果评分支持迁移，必须创建或扩展稳定 CLI；不能只改文档收尾。
5. **成熟外部 CLI 已覆盖的能力**：直接路由到外部 CLI，不要生成一对一 wrapper；报告 `scaffold_action: skip-wrapper`。
6. **临时脚本只允许做原型**：原型可用后，必须提升为 `scripts/<stable-cli>.py` 才算完成。
7. **CLI 必须领域通用**：其他 Skill 应能通过稳定命令调用，并解析 JSON stdout。

## 快速决策树

```text
用户请求是否涉及可复用执行能力？
├─ 否 → 保持 Skill-only 文档或直接回答。
└─ 是
   ├─ 是成熟外部 CLI 的用法？
   │  └─ 使用外部 CLI；不要 wrapper；补充 auth/setup/常用命令。
   ├─ 已有领域 CLI 可复用？
   │  └─ 扩展现有 CLI 的通用命令面。
   ├─ 是迁移旧 Skill？
   │  └─ 分类 + 0-14 分评分 → 决定 skill-only / partial / phase / complete。
   └─ 是新建能力？
      └─ 设计 Skill + CLI 边界 → 创建目录 → 写 CLI → 写 SKILL.md → 验证。
```

## 核心边界

### Skill 层负责认知

- 说明什么时候使用该技能。
- 负责路由、策略、用户偏好和工作流说明。
- 说明 CLI 命令面和推荐调用方式。
- 记录常见坑、fallback 策略和验证清单。
- 不包含大段一次性 Python/Bash 临时脚本。

### CLI 层负责执行

- 稳定执行任务，避免 agent 临场拼脚本。
- 负责配置读取、provider 解析、API 调用、本地处理、错误处理、重试和清理。
- 默认输出结构化 JSON 到 stdout；debug/log 走 stderr。
- 必须提供 `--help`、`doctor`、`probe` 或 `self-test`、主命令，以及适用时的 `cleanup`。
- 命令面必须可审计、可重复调用、可被其他 Skill 无状态复用。

### Memory / Long-task 负责连续性

- Skill 不保存临时状态。
- CLI 不写入非必要长期状态。
- 跨会话偏好、环境事实和长期经验交给 memory / skill 演进机制。

## 推荐目录结构

```text
<skills-root>/<category>/<skill-name>/
  SKILL.md
  scripts/
    <domain-cli>.py
  references/
    cli-usage.md
    provider-resolution.md
  templates/
    example-config.yaml
  assets/
    optional-example.png
```

命名原则：CLI 使用领域级名称和命令，例如 `imagegen generate`、`doc create`、`fetch fetch`、`media transcribe`。避免 `make-this-one-poster` 这类一次性命令，也避免 `universal-everything do --task ...` 这类万能入口。

## 标准工作流

当创建或迁移 Skill + CLI 时，按顺序执行：

1. 判断是新建 Skill 还是迁移旧 Skill。
2. 如果迁移旧 Skill，执行迁移评估：分类、评分、推荐策略。
3. 搜索已有类似 Skill、旧入口和调用方。
4. 搜索已有可复用 CLI；优先扩展，不重复创建。
5. 设计 Skill + CLI 边界：Skill 场景化，CLI 领域通用化。
6. 创建或更新目录结构。
7. 写或扩展 CLI，确保其他 Skill 可调用。
8. 写或更新 `SKILL.md`。
9. 必要时写 `references/` 文档，并包含跨 Skill 调用示例。
10. 如果替换旧脚本，保留兼容 wrapper，并写明弃用和删除条件。
11. 执行验证。
12. 汇报变更、命令面、复用方式、验证结果和后续建议。

## CLI 命令面要求

每个自有领域 CLI 至少提供：

```bash
<cli-name> --help
<cli-name> doctor
<cli-name> probe        # 或 self-test，按领域选择
<cli-name> run ...      # 主命令可替换为 generate/create/fetch/convert/transcribe/verify 等领域原语
<cli-name> cleanup ...  # 如会产生临时文件或外部资源
```

更多命令设计、provider 解析和输出格式见：

- [references/skill-cli-template.md](references/skill-cli-template.md)
- [references/cli-output-contract.md](references/cli-output-contract.md)

## JSON 输出契约

所有自有 CLI 默认只向 stdout 输出 JSON。

成功输出必须包含：

- `ok: true`
- `command`
- 至少一个主要结果字段，例如 `output`、`media`、`file`、`url` 或 `data`
- `warnings: []`，如有警告则写入安全、可展示的信息

失败输出必须包含：

- `ok: false`
- `command`
- `error.code`
- `error.message`
- 可选 `error.hint`

严禁在 stdout、stderr、日志、文档或 JSON 中输出 API key、token、cookie、password、完整 Authorization header、`.env` 内容或完整连接串。必须描述凭据时统一写 `[REDACTED]`。

详细示例见 [references/cli-output-contract.md](references/cli-output-contract.md)。

## Provider / cc-switch 解析规范

凡是自有 Skill + CLI 需要调用 OpenAI 或 Responses-compatible provider，必须由 CLI 或共享 helper 负责 provider 解析，不能让 agent 临场拼环境读取逻辑。

推荐解析顺序：

1. CLI 显式参数，例如 `--base-url`、`--api-key`、`--model`。
2. 技能/领域专属环境变量，例如 `IMAGEGEN_BASE_URL`、`IMAGEGEN_API_KEY`、`I18N_CLASSIFY_BASE_URL`、`I18N_CLASSIFY_API_KEY`。
3. 共享环境变量：`BASE_URL`、`API_KEY`。
4. Codex provider 配置文件：如果设置了 `CODEX_HOME`，读取 `$CODEX_HOME/config.toml` 和 `$CODEX_HOME/auth.json`；否则读取 `~/.codex/config.toml` 和 `~/.codex/auth.json`。
5. 安全 fallback：只允许模型名等非凭据默认值；缺少必要 provider 时返回 JSON 错误。

Codex 配置读取规则：

- 从 `config.toml` 读取顶层 `model_provider`，再读取 `[model_providers.<name>].base_url`。
- 从 `auth.json` 读取 `OPENAI_API_KEY`。
- 该机制用于跟随 cc-switch 当前写入的 Codex provider/base_url 配置；它不会自动发现或改写为本地 `127.0.0.1:<port>` 代理。不要调用 `cc-switch` 命令作为必需依赖，也不要生成一对一 wrapper。
- `CODEX_HOME` 一旦设置，只读取该目录，不再隐式混读用户目录，便于测试和隔离。
- `doctor` / `probe` 可报告 `hasBaseUrl`、`hasApiKey`、`model`、`source` 等非敏感字段；`source` 可使用 `args`、`specific-environment`、`environment`、`codex-config`、`mixed`、`none`。

严禁输出 API key、完整 Authorization header、`auth.json` 原文、`.env` 内容或完整连接串。测试必须覆盖至少一个 Codex/cc-switch fallback 场景，并断言 stdout 不包含测试 key。

## 模型识图 / 生图调用默认策略

如果用户请求本身需要模型识图、图片理解、图片分类、图片生成、图片编辑或相关真实模型验证，视为用户已经允许必要的真实 provider/API 调用；不要再因为费用、额度或消耗而停下来二次确认。

必须继续遵守：

- 真实调用前优先使用稳定 CLI / workflow，不要临场拼一次性执行逻辑。
- `doctor` / `probe` 可用于排查配置，但 `/models` 不可用不代表 `/responses` 不可用。
- 明确区分 `dry-run`、mock 验证和真实 provider 调用，不能把 mock 结果汇报成真实模型验证。
- 不输出 API key、Authorization header、`auth.json` 原文或 `.env` 内容。
- 如果真实调用失败，返回或汇报 provider HTTP 状态、错误码、非敏感响应摘要和下一步诊断。

## Existing Skill Migration Assessment

迁移旧 Skill 前必须先分类并打分。

### 分类

1. **纯知识 / 指南型 Skill**：主要是解释、判断标准、写作规范、研究方法或排查思路；通常保持 Skill-only。
2. **工作流 / 编排型 Skill**：包含多步骤流程、外部工具调用、文件生成、消息发送、媒体处理或 API 访问；重复执行部分应评估抽成 CLI。
3. **脚本堆积 / 临时实现型 Skill**：`SKILL.md` 有大段脚本，或 `scripts/` 中有多个一次性脚本；优先迁移到 Skill + CLI。

### 评分

每项 0-2 分，总分 0-14：

| 维度 | 0 分 | 1 分 | 2 分 |
|---|---|---|---|
| 重复使用频率 | 很少用 | 偶尔用 | 经常用 |
| 执行复杂度 | 主要是说明 | 少量命令 | 多步骤/多 API/多文件 |
| 失败成本 | 失败影响小 | 可重试 | 失败会浪费时间/钱/破坏状态 |
| 跨 Skill 复用 | 只服务单场景 | 可能复用 | 多个 Skill 明确可复用 |
| 可测试性收益 | 不明显 | 有帮助 | `doctor/probe/self-test` 明显有价值 |
| 安全/凭据处理 | 无凭据 | 少量配置 | 涉及 key/token/env/provider |
| 当前混乱度 | 很清晰 | 有少量临时脚本 | 脚本/逻辑散落严重 |

评分建议：

- **0-4 分**：`keep-skill-only`。
- **5-8 分**：`partial-cli-extraction`，只抽重复执行部分。
- **9-12 分**：`phase-skill-cli-migration`，分阶段迁移。
- **13-14 分**：`complete-skill-cli-target`，CLI 接管核心执行能力。

评估输出必须区分：

```json
{
  "classification": "knowledge/guidance | workflow/orchestration | script-heavy/prototype",
  "score": 0,
  "recommendation": "keep-skill-only | partial-cli-extraction | phase-skill-cli-migration | complete-skill-cli-target",
  "migration_strategy": "skill-only | scaffold-new-cli | extend-existing-domain-cli | use-existing-external-cli",
  "scaffold_action": "none | create-scaffold | extend-existing | skip-wrapper",
  "external_cli": "cmd or none"
}
```

更完整的迁移信号、重复技能名处理和批量迁移要求见 [references/migration-assessment.md](references/migration-assessment.md)。

## 成熟外部 CLI 优先原则

如果某个 Skill 本质上是成熟外部 CLI 的使用指南、路由层或命令参考，直接使用外部 CLI，不要再生成一层一对一 wrapper。

典型例子：

```text
gh-cli -> 使用官方 gh
docker skill -> 使用 docker
kubectl skill -> 使用 kubectl
ffmpeg/media skill -> 优先使用 ffmpeg，必要时再封装领域 workflow
```

只有多个 Skill 需要复用一组多步骤工作流时，才创建领域 helper CLI。

## Skill + CLI vs Skill + MCP

默认优先做 Skill + CLI。

CLI 适合本地可执行能力、文件处理、媒体/图片/文档处理、API 调用封装、JSON stdout 交互、`doctor/probe/cleanup` 工作流和多 Skill 复用。

只有满足以下情况时，才考虑 MCP：

- 多个不同 MCP client 都要调用该能力。
- 需要长期运行的 server 状态。
- 需要 MCP schema/tool discovery。
- 需要与已有 MCP 生态集成。
- CLI 已经稳定，MCP 只是协议适配层。

推荐架构：

```text
Skill -> CLI
MCP Server -> CLI
```

不要把业务逻辑只写在 MCP server 中。核心能力应在 CLI，MCP 只做薄适配。

## Python CLI 与 uv

Python CLI 推荐使用 `uv` 管理依赖和入口。如果 CLI 有第三方依赖，应提供 `pyproject.toml` 和 `uv.lock`。

验证时避免在技能目录留下临时 `.venv`：

```bash
UV_PROJECT_ENVIRONMENT=/tmp/<skill-name>-venv uv run python scripts/<cli>.py doctor
```

如果系统 Python 缺少可选依赖，CLI 不应直接崩溃。优先降级到有限能力、输出 JSON warning、在 `doctor` 中报告依赖缺失，并给出安装或 `uv sync` 提示。

## 验证清单

创建或迁移完成后至少验证：

```bash
python3 -m py_compile scripts/*.py
<cli-name> --help
<cli-name> doctor
<cli-name> probe
```

如果有 cleanup：

```bash
tmp=/tmp/<skill-name>-cleanup-test.txt
printf x > "$tmp"
<cli-name> cleanup "$tmp"
test ! -e "$tmp"
```

如果有 wrapper：

```bash
python3 scripts/old_wrapper.py --help
```

## 最终交付格式

完成后向用户汇报：

```md
已完成 `<skill-name>` 的 Skill + CLI 评估/迁移。

评估：
- classification: <knowledge/guidance | workflow/orchestration | script-heavy/prototype>
- score: <0-14>
- recommendation: <keep-skill-only | partial-cli-extraction | phase-skill-cli-migration | complete-skill-cli-target>
- migration_strategy: <skill-only | scaffold-new-cli | extend-existing-domain-cli | use-existing-external-cli>
- scaffold_action: <none | create-scaffold | extend-existing | skip-wrapper>
- external_cli: <cmd or none>

新增/修改：
1. `SKILL.md` — 路由、规则、工作流、偏好说明。
2. `scripts/<cli>.py` 或 `external CLI: <cmd>` — 稳定 CLI 或成熟外部 CLI。
3. `references/...` — CLI 使用方式、维护说明和跨 Skill 调用示例。

验证结果：
- `py_compile`：通过 / 不适用
- `<cli> --help`：通过
- `<cli> doctor`：通过 / 不适用
- `<cli> probe`：通过 / 不适用
- external CLI availability：通过 / 未安装但已说明
- cleanup：通过 / 不适用

注意：
- scaffold 是否只是占位。
- wrapper 是否保留。
- 何时可以删除旧入口。
- 如果使用成熟外部 CLI，不要生成一对一 wrapper。
```

后续使用时，agent 应调用稳定 CLI 或成熟外部 CLI，而不是临时写脚本。
