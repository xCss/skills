# Skill + CLI Template Reference

本文件提供 `SKILL.md` 模板、CLI 命令面示例、provider/config 解析规则和兼容 wrapper 模板。

## SKILL.md Template

`SKILL.md` 必须从 YAML frontmatter 开始，不能有前置空行。

````md
---
name: example-skill-name
description: Use when the user needs <task class>. Routes requests to the stable CLI instead of ad-hoc scripts.
version: 1.0.0
author: Project Agent
license: MIT
metadata:
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

```bash
example-cli --help
```

Required subcommands:

```bash
example-cli doctor
example-cli probe
example-cli run --input ... --out ...
example-cli cleanup ...
```

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

## Verification Checklist

- [ ] `SKILL.md` has valid frontmatter.
- [ ] CLI file exists under `scripts/` or mature external CLI is documented.
- [ ] CLI has `--help`.
- [ ] CLI has `doctor`.
- [ ] CLI has `probe` or `self-test`.
- [ ] Main command returns JSON.
- [ ] Failure path returns JSON.
- [ ] No secrets are printed.
- [ ] Backward-compatible wrapper exists if replacing an older script.
- [ ] Cleanup behavior is tested.
````

## CLI Command Examples

Generic shape:

```bash
<cli-name> --help
<cli-name> doctor
<cli-name> probe
<cli-name> run ...
<cli-name> cleanup ...
```

Image generation:

```bash
exp-imagegen doctor
exp-imagegen probe
exp-imagegen generate --prompt-file /tmp/prompt.txt --size 1024x1536 --out /tmp/out.png
exp-imagegen cleanup /tmp/out.png
```

Document creation:

```bash
exp-doc doctor
exp-doc probe
exp-doc create --input input.md --title "Title" --out result.json
exp-doc verify --doc-token ...
```

Content fetching:

```bash
exp-fetch doctor
exp-fetch probe --url https://example.com
exp-fetch fetch --url https://example.com --out result.json
```

Media processing:

```bash
exp-media doctor
exp-media probe
exp-media transcribe --input audio.mp3 --out transcript.json
exp-media convert --input video.mov --out video.mp4
```

## Provider / Config Resolution

CLI 必须自己负责配置解析，不要让 agent 临时解析。

推荐优先级：

1. CLI 显式参数，例如 `--provider`。
2. 技能专属配置，例如 `image_gen.provider`。
3. 全局默认配置，例如 `model.provider`。
4. 安全 fallback。
5. 如果仍无法解析，返回 JSON 错误，不要猜。

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

## doctor / probe / self-test

### doctor

检查本地环境，不做昂贵 API 调用。应该检查：

- 配置文件是否存在
- 环境变量是否存在
- 依赖命令是否存在
- 输出目录是否可写
- key 是否存在，但不能打印 key 值

### probe

做轻量真实连通性检查，例如请求 `/models`、检查目标模型是否可见、检查服务是否返回正常状态码。

### self-test

可选，用于更完整的端到端测试，例如创建临时输入、调用主命令、验证输出文件并清理临时文件。

## Backward-Compatible Wrapper

如果新 CLI 替换旧脚本，保留 wrapper：

```python
#!/usr/bin/env python3
import os
import subprocess
import sys

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

wrapper 删除前必须满足：

1. 新 CLI 稳定，`doctor`、`probe` 和主命令已验证。
2. 已知调用方已迁移。
3. 已经过迁移窗口。
4. wrapper 曾向 stderr 输出弃用提示。
5. 删除后搜索确认无活跃引用。
