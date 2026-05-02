# i18n Workflow CLI Usage

`scripts/i18n-workflow-cli.cjs` is the stable command surface for this skill. It runs the native implementation modules under `scripts/i18n_workflow/` and keeps stdout JSON-parseable.

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

## Implementation Modules

The skill no longer exposes `tools/*.cjs` execution entries. New automation must call `scripts/i18n-workflow-cli.cjs`; implementation modules are internal and live under `scripts/i18n_workflow/`.

See [migration-assessment.md](migration-assessment.md) for the migration score and completed removal notes.
