# Existing Skill Migration Assessment Reference

本文件补充旧 Skill 迁移评估、批量迁移工具要求、多 skills root 去重和最终报告要求。

## Migration Strategy Values

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

## 应该迁移的信号

- Skill 里反复出现长代码块。
- 每次执行都要临时写脚本。
- 需要解析配置、provider、API key、模型名。
- 需要稳定 JSON 输出给 agent 解析。
- 需要 `doctor` / `probe` 才能快速判断环境是否可用。
- 多个 Skill 在做相似事情，例如图片生成、文档转换、媒体处理、内容抓取。
- 出错时很难判断是配置问题、网络问题、provider 问题还是输入问题。
- 需要 cleanup，且用户不应该看到 cleanup 噪音。

## 不应该迁移的信号

- Skill 只是提示词规范、写作风格、代码审查原则。
- Skill 主要用于判断、思考、规划，而不是执行。
- 任务没有稳定输入输出。
- 只被用过一次，且未来复用可能性低。
- 抽成 CLI 后反而会增加维护成本。

## 迁移前必须搜索调用方

迁移已有 Skill 前，必须搜索：

```bash
rg '<skill-name>|old_script\.py|old-command-name' <skills-root> .
```

确认：

- 哪些 Skill 引用了它。
- 哪些 scripts / cron / docs 调用了旧入口。
- 是否已经存在相似 CLI。
- 是否可以扩展现有 CLI，而不是新建。

## 多 Skills Root 与重复技能名

如果同时扫描多个 skills root，必须处理重复技能名。批量工具必须报告：

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

## 迁移输出要求

如果决定迁移，最终汇报必须包含：

- 迁移评分和理由。
- 保留在 Skill 层的内容。
- 下沉到 CLI 层的能力。
- 新 CLI 命令面。
- 哪些其他 Skill 可以复用。
- 旧入口是否保留 wrapper。
- 旧入口预计何时可删除。
- 验证结果。
