# CLI Output Contract

本文件定义 Skill + CLI 架构中所有自有 CLI 的 stdout/stderr、成功输出、失败输出和安全要求。

## Stdout / Stderr

- stdout 默认只输出 JSON。
- debug、trace、deprecation warning 和人类可读日志写入 stderr。
- stdout 不得混入进度条、调试文本或非 JSON 内容。

## Success Output

成功输出必须包含：

```json
{
  "ok": true,
  "command": "generate",
  "output": "/tmp/result.png",
  "media": "/tmp/result.png",
  "mime": "image/png",
  "provider": "ExampleProvider",
  "model": "example-model",
  "warnings": []
}
```

字段要求：

- `ok`: 必须为 `true`。
- `command`: 当前执行的子命令。
- `output` / `media` / `file` / `url` / `data`: 至少提供一个主要结果字段。
- `warnings`: 必须存在；没有警告时为空数组。
- `provider`、`model`、`mime`: 按领域需要提供。

## Failure Output

失败输出必须包含：

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

字段要求：

- `ok`: 必须为 `false`。
- `command`: 当前执行的子命令。
- `error.code`: 稳定、可匹配的机器码，例如 `MISSING_API_KEY`、`NO_PROVIDER_CONFIGURED`。
- `error.message`: 安全、简短、可展示的人类说明。
- `error.hint`: 可选；给出下一步修复建议。

## Security Rules

严禁输出：

- API key
- token
- cookie
- password
- 完整 Authorization header
- `.env` 内容
- credential
- 完整连接串

必须描述凭据时统一写：

```text
[REDACTED]
```

## Deprecation Wrapper Output

兼容 wrapper 可以向 stderr 输出弃用提示，但 stdout 必须保持新 CLI 的 JSON 输出原样。

示例：

```python
print(
    "DEPRECATED: scripts/old_script.py is kept as a compatibility wrapper. "
    "Use `new-cli run ...` instead.",
    file=sys.stderr,
)
```
