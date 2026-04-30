# i18n Workflow CLI Usage

`scripts/i18n-workflow-cli.cjs` is the stable command surface for this skill. It wraps the legacy implementation tools in `tools/` and keeps stdout JSON-parseable.

## Commands

```bash
node scripts/i18n-workflow-cli.cjs --help
node scripts/i18n-workflow-cli.cjs doctor --config tools/i18n-workflow.config.cjs
node scripts/i18n-workflow-cli.cjs probe --config tools/i18n-workflow.config.cjs
node scripts/i18n-workflow-cli.cjs run --config tools/i18n-workflow.config.cjs --steps extract,audit,jobs,review --dry-run
node scripts/i18n-workflow-cli.cjs cleanup tools/reports/.tmp-i18n-images
node scripts/i18n-workflow-cli.cjs self-test
```

## JSON Contract

Success:

```json
{
  "ok": true,
  "command": "probe",
  "data": {},
  "warnings": []
}
```

Failure:

```json
{
  "ok": false,
  "command": "run",
  "error": {
    "code": "WORKFLOW_FAILED",
    "message": "i18n workflow command failed",
    "detail": {}
  }
}
```

## Legacy Tools

The existing `tools/*.cjs` files remain available for compatibility. New automation should call the CLI facade first; direct tool calls are fallback/debugging paths.

See `migration-assessment.md` for the migration score, caller search findings, and the legacy deprecation/removal policy.
