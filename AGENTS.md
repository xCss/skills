# AGENTS.md — Skill + CLI 架构规范

本项目中的技能必须采用 **Skill + CLI** 架构，而不是把大量执行逻辑直接堆进 `SKILL.md` 或临时脚本里。

## 核心原则

1. **Skill 负责认知层**
   - 说明什么时候使用这个技能。
   - 负责路由、策略、用户偏好、工作流说明。
   - 说明 CLI 的命令面和推荐调用方式。
   - 记录常见坑、fallback 策略、验证清单。
   - 不应该包含大段一次性 Python/Bash 临时脚本。

2. **CLI 负责执行层**
   - 真正稳定执行任务。
   - 负责读取配置、解析 provider、调用 API、本地处理、错误处理、重试、清理。
   - 必须提供结构化 JSON 输出。
   - 必须提供 `doctor` 和 `probe` / `self-test` 类命令。
   - 必须有可审计、可重复调用的命令面。
   - 不要依赖 agent 临场拼脚本完成核心功能。

3. **Memory / Long-task 负责连续性**
   - Skill 不保存临时状态。
   - CLI 不写入非必要长期状态。
   - 需要跨会话的偏好、环境事实、长期经验，交给 memory / skill 演进机制。

4. **CLI 必须领域通用、可复用**
   - Skill 可以是场景化的，但 CLI 应该是领域能力模块。
   - CLI 不应只服务某一个 prompt、某一个海报、某一个网站或某一个临时任务。
   - 其他 Skill 应该可以稳定调用该 CLI。
   - CLI 命令面应暴露领域级原语，例如 `generate`、`create`、`fetch`、`transcribe`、`convert`、`verify`、`cleanup`。
   - 不要创建 `generate-pretty-girl-image`、`make-this-one-poster`、`fetch-only-this-site` 这种一次性命令。

---

## 目标目录结构

创建一个技能时，优先使用如下结构：

```text
<skills-root>/<category>/<skill-name>/
  SKILL.md
  scripts/
    <skill-cli>.py
  references/
    cli-usage.md
    provider-resolution.md
  templates/
    example-config.yaml
  assets/
    optional-example.png
```

示例：

```text
/opt/example-agent/skills/creative/image-generation-workflows/
  SKILL.md
  scripts/
    exp_imagegen_cli.py
    generate_image_with_fallback.py
  references/
    direct-image-generation.md
```

---

## SKILL.md 编写规范

`SKILL.md` 必须从 YAML frontmatter 开始，不能有前置空行。

模板：

```md
---
name: example-skill-name
description: Use when the user needs <task class>. Routes requests to the stable CLI instead of ad-hoc scripts.
version: 1.0.0
author: Hermes Agent
license: MIT
metadata:
  hermes:
    tags: [example, cli, workflow]
    related_skills: []
---

# Example Skill Name

## Overview

This skill handles <task class> using a Skill + CLI architecture.

The Skill layer decides:
- when to use this workflow
- which CLI subcommand to call
- what defaults and user preferences apply
- when to fallback
- what verification is required

The CLI layer performs:
- config loading
- provider/API resolution
- actual execution
- retries and error handling
- cleanup
- JSON output

## When to Use

Use this skill when:
- The user asks to <trigger 1>
- The user provides <trigger 2>
- The task requires repeatable execution rather than one-off scripts

Do not use this skill when:
- The user only asks for explanation
- The task is unrelated to <domain>
- Another more specific skill already covers the request

## CLI

Primary command:

\`\`\`bash
example-cli --help
\`\`\`

Required subcommands:

\`\`\`bash
example-cli doctor
example-cli probe
example-cli run --input ... --out ...
example-cli cleanup ...
\`\`\`

The agent should call the CLI instead of writing temporary scripts.

## Recommended Workflow

1. Interpret the user request.
2. Choose the correct CLI subcommand.
3. Run `doctor` if configuration or credentials may be missing.
4. Run `probe` if API/provider availability is uncertain.
5. Run the actual command.
6. Parse JSON output.
7. Return only the user-relevant result.
8. Perform cleanup silently when appropriate.

## Output Contract

CLI commands must print JSON to stdout.

Successful output should look like:

\`\`\`json
{
  "ok": true,
  "result": "...",
  "media": "/tmp/output.png",
  "warnings": []
}
\`\`\`

Failure output should look like:

\`\`\`json
{
  "ok": false,
  "error": {
    "code": "PROVIDER_UNAVAILABLE",
    "message": "Provider request failed",
    "detail": "safe diagnostic detail without secrets"
  }
}
\`\`\`

Never print secrets, API keys, tokens, passwords, cookies, or full connection strings.

## Common Pitfalls

1. Do not paste large one-off scripts into `SKILL.md`.
2. Do not make the agent reconstruct CLI behavior manually.
3. Do not output credentials in logs or JSON.
4. Do not silently choose an unconfigured provider.
5. Do not leave temporary files without cleanup.
6. Do not reply to background cleanup completion notices unless the user explicitly asked.

## Verification Checklist

- [ ] `SKILL.md` has valid frontmatter.
- [ ] CLI file exists under `scripts/`.
- [ ] CLI has `--help`.
- [ ] CLI has `doctor`.
- [ ] CLI has `probe` or `self-test`.
- [ ] Main command returns JSON.
- [ ] Failure path returns JSON.
- [ ] No secrets are printed.
- [ ] Backward-compatible wrapper exists if replacing an older script.
- [ ] Cleanup behavior is tested.
```

---

## CLI 设计要求

每个 Skill + CLI 技能至少应该有这些命令：

```bash
<cli-name> --help
<cli-name> doctor
<cli-name> probe
<cli-name> run ...
<cli-name> cleanup ...
```

如果是图片生成类，可以是：

```bash
exp-imagegen doctor
exp-imagegen probe
exp-imagegen generate --prompt '...' --out /tmp/x.png
exp-imagegen cleanup /tmp/x.png
```

如果是文档类，可以是：

```bash
exp-doc doctor
exp-doc probe
exp-doc create --input input.md --title '...'
exp-doc verify --doc-token ...
```

如果是抓取类，可以是：

```bash
exp-fetch doctor
exp-fetch probe --url ...
exp-fetch fetch --url ... --out result.json
```

---

## CLI 通用性与复用规则

CLI created for a skill should be designed as a reusable capability module, not a one-off script for a single prompt.

**正确边界：**

- Skill 可以很场景化，负责理解用户意图和编排流程。
- CLI 要领域通用化，负责提供可复用能力。
- 多个 Skill 应该能共享同一个 CLI。

推荐粒度，使用示例项目前缀 + 领域化命名，避免绑定某个真实 agent / 框架品牌。本文档示例统一使用 `exp-` 作为 example project 前缀：

```bash
exp-imagegen      # 图像生成、编辑、变体、图片 cleanup
exp-media         # 音视频转码、转录、抽帧、压缩
exp-doc           # 文档创建、转换、校验、导出
exp-fetch         # 网页/内容抓取、解析、保存
exp-chat          # 消息平台发送、撤回、查询等能力封装
exp-poster        # 海报排版、渲染、导出
```

在真实项目中，应把 `exp-` 替换为项目自己的短前缀，例如 `acme-imagegen`、`nova-fetch`；如果项目没有命名前缀，也可以使用 `imagegen` 这类中性领域名。示例文档不要默认使用任何真实 agent / 框架的品牌前缀。

避免过细的一次性 CLI：

```bash
generate-pretty-girl-image
make-bilibili-poster-only
fetch-this-one-website
create-april-group-score-poster
```

也避免过度抽象的万能 CLI：

```bash
universal-everything do --task ...
```

好的 CLI 应该提供**领域级原语**：

```bash
exp-imagegen generate --prompt-file /tmp/prompt.txt --size 1024x1536 --out /tmp/out.png
exp-doc create --input article.md --title 'Title' --out result.json
exp-fetch fetch --url 'https://example.com' --out result.json
exp-media transcribe --input audio.mp3 --out transcript.json
```

### 跨 Skill 调用要求

CLI 必须让其他 Skill 可以无状态调用：

1. 输入通过参数或文件传入。
2. 输出通过 JSON stdout 返回。
3. 主要产物路径放在稳定字段中，如 `output`、`media`、`file`、`url`、`data`。
4. 错误使用稳定 `error.code`。
5. 允许显式 provider/model/config override。
6. 不依赖调用它的 Skill 名称。
7. 不要求 agent 临时拼内部 Python 逻辑。

推荐成功输出：

```json
{
  "ok": true,
  "command": "generate",
  "output": "/tmp/result.png",
  "media": "/tmp/result.png",
  "mime": "image/png",
  "provider": "SUB",
  "model": "gpt-image-2-high",
  "warnings": []
}
```

推荐错误输出：

```json
{
  "ok": false,
  "command": "generate",
  "error": {
    "code": "MODEL_NOT_AVAILABLE",
    "message": "Requested model is not available from the selected provider",
    "hint": "Run `exp-imagegen probe` or pass --model"
  }
}
```

### Skill 调用示例

多个不同 Skill 可以共享同一个图片生成 CLI：

```bash
# 视频海报 Skill
exp-imagegen generate --prompt-file /tmp/video_poster_prompt.txt --size 1024x1536 --out /tmp/video_poster.png

# 信息图 Skill
exp-imagegen generate --prompt-file /tmp/infographic_prompt.txt --size 1536x1024 --out /tmp/infographic.png

# 公告图 Skill
exp-imagegen generate --prompt-file /tmp/notice_prompt.txt --size 1024x1536 --out /tmp/notice.png
```

因此，创建新 Skill 时应优先判断：

1. 是否已有可复用 CLI。
2. 能否扩展现有 CLI 的通用命令。
3. 是否真的需要新增一个领域 CLI。
4. 不要为了单个 Skill 创建单用途小脚本。

### 成熟外部 CLI 优先原则

如果某个 Skill 本质上是成熟外部 CLI 的使用指南、路由层或命令参考，不要再生成一层一对一 wrapper。

正确做法：

- Skill 保留使用场景判断、命令参考、auth/setup 说明、常见 workflow 示例、fallback 与验证清单。
- CLI 层直接使用成熟外部 CLI。
- 只有当多个 Skill 需要复用一组多步骤工作流时，才创建领域 helper CLI。

典型例子：

```text
gh-cli -> 使用官方 gh
docker skill -> 使用 docker
kubectl skill -> 使用 kubectl
ffmpeg/media skill -> 优先使用 ffmpeg，必要时再封装领域 workflow
```

错误做法：

```text
gh-cli/scripts/skill-gh-cli-cli.py
docker-cli/scripts/skill-docker-cli.py
kubectl-cli/scripts/skill-kubectl-cli.py
```

这类 wrapper 只是把成熟 CLI 包一层，通常不会增加稳定性，反而增加维护成本和命名混乱。

迁移评估时应输出：

```json
{
  "external_cli": "gh",
  "migration_strategy": "use-existing-external-cli",
  "scaffold_action": "skip-wrapper"
}
```

---

## CLI 输出规范

所有 CLI 都必须：

1. 默认输出 JSON。
2. 成功时包含：
   - `ok: true`
   - 主要结果字段，如 `output`、`media`、`url`、`file`、`data`
3. 失败时包含：
   - `ok: false`
   - `error.code`
   - `error.message`
4. 不输出密钥。
5. 不把 debug 噪音混进 stdout。
6. debug/log 可以走 stderr。

推荐结构：

```json
{
  "ok": true,
  "command": "generate",
  "output": "/tmp/result.png",
  "media": "/tmp/result.png",
  "provider": "SUB",
  "model": "gpt-image-2-high",
  "warnings": []
}
```

错误结构：

```json
{
  "ok": false,
  "command": "generate",
  "error": {
    "code": "MISSING_API_KEY",
    "message": "Required API key is not configured",
    "hint": "Run `example-cli doctor` for diagnostics"
  }
}
```

---

## Provider / Config 解析规则

CLI 必须自己负责配置解析，不要让 agent 临时解析。

推荐优先级：

1. CLI 显式参数，例如 `--provider`
2. 技能专属配置，例如 `image_gen.provider`
3. 全局默认配置，例如 `model.provider`
4. 安全 fallback
5. 如果仍无法解析，返回 JSON 错误，不要猜

错误示例：

```python
provider = config["image_gen"]["provider"]
```

更好的做法：

```python
if args.provider:
    provider = args.provider
elif image_provider_exists_and_has_base_url:
    provider = image_provider
elif model_provider_exists:
    provider = model_provider
else:
    return error("NO_PROVIDER_CONFIGURED")
```

---

## doctor / probe / self-test 的区别

### `doctor`

检查本地环境，不做昂贵 API 调用。

应该检查：

- 配置文件是否存在
- 环境变量是否存在
- 依赖命令是否存在
- 输出目录是否可写
- key 是否存在，但不能打印 key 值

示例：

```json
{
  "ok": true,
  "checks": {
    "config_exists": true,
    "env_exists": true,
    "provider": "ExampleProvider",
    "base_url": "https://example.com/v1",
    "key_env": "API_KEY",
    "key_present": true
  }
}
```

### `probe`

做轻量真实连通性检查。

例如：

- 请求 `/models`
- 检查目标模型是否可见
- 检查目标服务是否返回正常状态码

### `self-test`

可选。用于更完整的端到端测试。

例如：

- 创建临时输入
- 调用主命令
- 验证输出文件
- 清理临时文件

---

## Backward Compatibility

如果这个 CLI 是从旧脚本演进而来，不能直接删除旧入口。

应该保留 wrapper：

```text
scripts/old_script.py
```

内部转发到新 CLI，并向 stderr 输出 deprecation warning，例如：

```python
#!/usr/bin/env python3
import os
import sys
import subprocess

CLI = os.path.join(os.path.dirname(__file__), "new_cli.py")

if __name__ == "__main__":
    print(
        "DEPRECATED: scripts/old_script.py is kept as a compatibility wrapper. "
        "Use `new-cli run ...` instead.",
        file=sys.stderr,
    )
    raise SystemExit(
        subprocess.call([sys.executable, CLI, "run", *sys.argv[1:]])
    )
```

注意：warning 必须输出到 stderr，不能污染 stdout；如果新 CLI 正常输出 JSON，stdout 必须保持机器可解析。

这样旧 skill、旧自动化、旧调用方式不会立刻坏掉，同时调用方能看到迁移提示。

### Deprecation and Removal Policy

Backward compatibility wrappers are temporary migration aids, not permanent architecture. 旧入口不是永久保留项，而是迁移缓冲层。

A legacy wrapper may be removed only after all of the following are true:

1. **The new CLI is stable**
   - `doctor` passes.
   - `probe` passes.
   - The main command has been tested.
   - JSON output is stable.
   - Failure output uses stable `error.code` and does not leak secrets.

2. **Known callers have migrated**
   - `SKILL.md` uses the new CLI.
   - `references/` docs use the new CLI.
   - cron jobs, scripts, wrappers, and automation no longer call the old entry.
   - repository/local search finds no active references to the old script except historical notes.

3. **A migration window has passed**
   - local personal skills: keep the wrapper for at least 1-2 real task cycles.
   - shared repos: keep it for at least one release/version cycle.
   - public/versioned packages: remove only in a major or explicitly breaking release.

4. **The wrapper emitted a deprecation warning before removal**
   - warning must go to stderr.
   - stdout must remain machine-readable JSON if the command normally emits JSON.
   - warning must tell users the replacement command.

5. **Removal is verified**
   - search confirms no active references remain.
   - new CLI verification still passes.
   - docs no longer recommend the old entry.
   - changelog / final report mentions the removal if this is a shared repo.

Recommended removal workflow:

```bash
# 1. Search for active references
rg 'old_script\.py|old-command-name' .

# 2. Verify new CLI
python3 -m py_compile scripts/*.py
new-cli --help
new-cli doctor
new-cli probe

# 3. Remove wrapper only after the checks above are clean
rm scripts/old_script.py

# 4. Search again
rg 'old_script\.py|old-command-name' . || true
```

If any active caller remains, do not delete the wrapper. Patch the caller first or keep the wrapper for another migration cycle.

---

## 安全要求

严禁：

- 打印 API key
- 打印 token
- 打印 cookie
- 打印 password
- 打印完整 Authorization header
- 把 `.env` 内容写入回复
- 把 credential 写进 `SKILL.md`
- 把 credential 写进 `references/`
- 把 credential 写进日志

如果必须描述 credential，统一写：

```text
[REDACTED]
```

---

## Existing Skill Migration Assessment

当处理原有 Skill 时，不要默认全部迁移到 Skill + CLI。必须先评估：这个 Skill 是否真的包含可复用、可执行、可测试的能力。

### 先分类

把原有 Skill 分成三类：

1. **纯知识 / 指南型 Skill**
   - 内容主要是解释、判断标准、写作规范、研究方法、排查思路。
   - 没有稳定可执行动作。
   - 通常不需要迁移到 CLI。
   - 可以保留为纯 Skill，或补充 references。

2. **工作流 / 编排型 Skill**
   - 内容主要是多步骤流程、调用多个外部工具、生成文件、发送消息、处理媒体、访问 API。
   - 如果其中有重复执行的动作，就应该评估是否抽成 CLI。
   - Skill 保留路由、策略、偏好；CLI 承接重复执行部分。

3. **脚本堆积 / 临时实现型 Skill**
   - `SKILL.md` 中包含大段 Python/Bash。
   - `scripts/` 里有多个一次性脚本。
   - 经常需要 agent 临时拼参数、改代码、读 `.env`、猜 provider。
   - 这种优先迁移到 Skill + CLI。

### 迁移价值评分

评估原有 Skill 是否值得迁移时，按下面维度打分，每项 0-2 分：

| 维度 | 0 分 | 1 分 | 2 分 |
|---|---|---|---|
| 重复使用频率 | 很少用 | 偶尔用 | 经常用 |
| 执行复杂度 | 主要是说明 | 少量命令 | 多步骤/多 API/多文件 |
| 失败成本 | 失败影响小 | 可重试 | 失败会浪费时间/钱/破坏状态 |
| 跨 Skill 复用 | 只服务单场景 | 可能复用 | 多个 Skill 明确可复用 |
| 可测试性收益 | 不明显 | 有帮助 | `doctor/probe/self-test` 明显有价值 |
| 安全/凭据处理 | 无凭据 | 少量配置 | 涉及 key/token/env/provider |
| 当前混乱度 | 很清晰 | 有少量临时脚本 | 脚本/逻辑散落严重 |

建议：

- **0-4 分**：不迁移，保持 Skill 文档化。
- **5-8 分**：局部迁移，只把重复执行部分抽成 CLI。
- **9-12 分**：迁移为 Skill + CLI，但允许分阶段推进。
- **13-14 分**：完整迁移目标明确，CLI 应接管核心执行能力；旧入口只作为临时兼容 wrapper 保留，并进入 deprecation/removal 流程。

### Recommendation 不等于 Migration Action

评分结果只说明这个 Skill 是否值得把执行能力外置，不等于一定要创建新的 CLI 文件。

评估输出应区分三个字段：

```json
{
  "recommendation": "phase-skill-cli-migration",
  "migration_strategy": "use-existing-external-cli",
  "scaffold_action": "skip-wrapper"
}
```

字段含义：

- `recommendation`：是否值得 CLI 化。
- `migration_strategy`：怎么 CLI 化。
- `scaffold_action`：是否应该生成 scaffold 文件。

推荐策略值：

```text
skill-only
scaffold-new-cli
extend-existing-domain-cli
use-existing-external-cli
```

推荐 scaffold 动作：

```text
none
create-scaffold
extend-existing
skip-wrapper
```

示例：

| 场景 | recommendation | migration_strategy | scaffold_action |
|---|---|---|---|
| 纯写作规范 Skill | keep-skill-only | skill-only | none |
| 图片生成 workflow | phase-skill-cli-migration | extend-existing-domain-cli | extend-existing |
| `gh-cli` 参考 Skill | partial-cli-extraction 或 phase-skill-cli-migration | use-existing-external-cli | skip-wrapper |
| 临时脚本堆积 Skill | complete-skill-cli-target | scaffold-new-cli | create-scaffold |

### 应该迁移的信号

看到这些信号时，优先迁移：

- Skill 里反复出现长代码块。
- 每次执行都要临时写脚本。
- 需要解析配置、provider、API key、模型名。
- 需要稳定 JSON 输出给 agent 解析。
- 需要 `doctor` / `probe` 才能快速判断环境是否可用。
- 多个 Skill 在做相似事情，例如图片生成、文档转换、媒体处理、内容抓取。
- 出错时很难判断是配置问题、网络问题、provider 问题还是输入问题。
- 需要 cleanup，且用户不应该看到 cleanup 噪音。

### 不应该迁移的信号

这些情况通常不值得迁移：

- Skill 只是提示词规范、写作风格、代码审查原则。
- Skill 主要用于判断、思考、规划，而不是执行。
- 任务没有稳定输入输出。
- 只被用过一次，且未来复用可能性低。
- 抽成 CLI 后反而会增加维护成本。

### 迁移前必须先搜索调用方

迁移已有 Skill 前，必须先搜索：

```bash
rg '<skill-name>|old_script\.py|old-command-name' <skills-root> .
```

确认：

- 哪些 Skill 引用了它。
- 哪些 scripts / cron / docs 调用了旧入口。
- 是否已经存在相似 CLI。
- 是否可以扩展现有 CLI，而不是新建。

### 多 Skills Root 与重复技能名

如果同时扫描多个 skills root，例如：

```text
~/.hermes/skills
~/.hermes/hermes-agent/skills
./skills
```

必须处理重复技能名。批量工具必须报告：

```json
{
  "duplicate_skill_names": {
    "hermes-agent": 2,
    "github-pr-workflow": 2
  }
}
```

迁移时不能只靠 `--skill <name>` 盲选目标。遇到重复名称时，必须使用更精确的路径、root 或 rel_path。

推荐输出字段：

```json
{
  "name": "github-pr-workflow",
  "path": "/abs/path/to/SKILL.md",
  "root": "/abs/path/to/skills",
  "rel_path": "github/github-pr-workflow"
}
```

批量迁移报告必须同时给出：

- 原始记录数
- 去重后技能数
- 重复技能名列表
- 每个 root 的扫描数量

### 迁移输出要求

如果决定迁移，最终汇报必须包含：

- 迁移评分和理由。
- 保留在 Skill 层的内容。
- 下沉到 CLI 层的能力。
- 新 CLI 命令面。
- 哪些其他 Skill 可以复用。
- 旧入口是否保留 wrapper。
- 旧入口预计何时可删除。
- 验证结果。

---

## 批量迁移工具要求

如果用户要求评估或迁移多个现有 Skill，必须优先使用或创建 class-level auditor/orchestrator，而不是逐个手工迁移。

批量 CLI 至少应提供只读命令：

```bash
<auditor-cli> doctor
<auditor-cli> inventory --out inventory.json
<auditor-cli> assess --out assessment.json
<auditor-cli> plan --min-score 5 --out plan.json
```

可选写入命令：

```bash
<auditor-cli> migrate --skill <name>
<auditor-cli> migrate --skill <name> --apply
```

要求：

- `doctor` 本地检查，不做昂贵 API 调用。
- `inventory` 只扫描目录，不修改文件。
- `assess` 输出评分和原因。
- `plan` 输出批次建议，不创建文件。
- `migrate` 默认 dry-run。
- `--apply` 才允许写 scaffold。
- 不能批量重写 `SKILL.md`。
- scaffold 不是完成迁移，必须在报告中明确标注。

推荐 `plan` 汇总字段：

```json
{
  "summary": {
    "keep_skill_only": 41,
    "partial_cli_extraction": 51,
    "phase_skill_cli_migration": 93,
    "complete_skill_cli_target": 14,
    "migration_strategies": {
      "scaffold-new-cli": 157,
      "skill-only": 41,
      "use-existing-external-cli": 1
    },
    "scaffold_actions": {
      "create-scaffold": 157,
      "none": 41,
      "skip-wrapper": 1
    },
    "duplicate_skill_names": {}
  }
}
```

---

## Skill + CLI vs Skill + MCP

默认优先做 Skill + CLI。

CLI 适合：

- 本地可执行能力
- 文件处理
- 媒体、图片、文档处理
- API 调用封装
- 可通过 JSON stdout 交互的能力
- 需要 `doctor` / `probe` / `cleanup` 的工作流
- 多个 Skill 复用的领域能力

只有满足以下情况时，才考虑 MCP：

- 多个不同 MCP client 都要调用该能力
- 需要长期运行的 server 状态
- 需要 MCP schema/tool discovery
- 需要与已有 MCP 生态集成
- CLI 已经稳定，MCP 只是协议适配层

推荐架构：

```text
Skill -> CLI
MCP Server -> CLI
```

不要把业务逻辑只写在 MCP server 里。核心能力应在 CLI 中，MCP 只做薄适配。

---

## Python CLI 依赖与 uv

Python CLI 推荐使用 `uv` 管理依赖和入口。

如果 CLI 有第三方依赖，应提供：

```text
pyproject.toml
uv.lock
```

推荐命令：

```bash
uv run python scripts/<cli>.py doctor
uv run python scripts/<cli>.py probe
```

验证时避免在技能目录留下临时 `.venv`，可使用：

```bash
UV_PROJECT_ENVIRONMENT=/tmp/<skill-name>-venv uv run python scripts/<cli>.py doctor
```

如果系统 Python 缺少可选依赖，CLI 不应直接崩溃。优先：

- 降级到有限能力
- 输出 JSON warning
- 在 `doctor` 中报告依赖缺失
- 给出安装或 `uv sync` 提示

例如 YAML frontmatter 解析：

- 有 PyYAML：完整解析
- 无 PyYAML：有限 fallback parser + warning

---

## Agent 工作流程

当用户要求创建或迁移一个 Skill + CLI 技能时，agent 必须按以下流程执行：

1. 先判断是创建新 Skill，还是迁移原有 Skill。
2. 如果是迁移原有 Skill，必须先做 Existing Skill Migration Assessment，给出迁移评分。
3. 先检查是否已有类似 skill。
4. 先检查是否已有可复用 CLI；如果已有，优先调用或扩展它。
5. 如果已有类似 Skill，优先扩展，不要重复创建窄技能。
6. 设计 Skill + CLI 边界：Skill 场景化，CLI 领域通用化。
7. 创建或更新目录结构。
8. 写 CLI，命令面必须能被其他 Skill 调用。
9. 写或更新 `SKILL.md`。
10. 如果需要，写 `references/` 文档，并包含跨 Skill 调用示例。
11. 如果替换旧脚本，保留 wrapper，并写明 deprecation/removal policy。
12. 执行验证。
13. 汇报：
    - 创建了哪些文件
    - CLI 命令是什么
    - 哪些其他 Skill 可以复用
    - 如何调用
    - 验证结果
    - 是否有后续建议

---

## 验证命令

创建完成后至少运行：

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

---

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

1. `SKILL.md`
   - 负责路由、规则、工作流、偏好说明。

2. `scripts/<cli>.py` 或 `external CLI: <cmd>`
   - 稳定 CLI 或成熟外部 CLI。
   - 支持 `doctor`、`probe`、主命令、`cleanup`，或说明外部 CLI 的等价验证命令。

3. `references/...`
   - 记录 CLI 使用方式和维护说明。

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

后续使用时，agent 应调用稳定 CLI 或成熟外部 CLI，而不是临时写脚本。
```

---

## Mandatory Rule

If a user asks to create, migrate, or refactor a reusable skill, plugin, workflow, media generator, document processor, API wrapper, scraper, or automation capability, the agent MUST evaluate whether Skill + CLI is appropriate.

For existing skills, the agent MUST NOT blindly migrate everything. It must first classify the skill and score migration value. Pure knowledge/guidance skills should usually remain as Skill-only documentation. Workflow or script-heavy skills should be migrated when the score justifies it.

For existing skills that are selected for migration, the agent MUST NOT finish by only writing documentation unless the correct migration strategy is `use-existing-external-cli`.

If the migration strategy is `use-existing-external-cli`, the agent must verify or document the canonical external CLI, update the Skill to route to that CLI, avoid generating a one-to-one wrapper, document auth/setup and common commands, and report `scaffold_action: skip-wrapper`.

Otherwise, it must create or update an executable domain CLI, validate it, and document the command surface in `SKILL.md`. For skills that are not selected for migration, the agent should explicitly say why Skill-only is the better shape.

Temporary scripts are only allowed as prototypes. If the prototype works, it must be promoted into `scripts/<stable-cli>.py` before the task is considered complete.

The CLI must be designed as a reusable domain capability module. Other skills should be able to call it through stable commands and parse its JSON output. Do not create single-prompt or single-skill CLIs unless there is a strong reason and the limitation is documented.
