---
name: github-actions-debug
description: Guide for debugging failing GitHub Actions CI/CD workflows in the QRTable repository. Use when CI is failing, workflow runs are broken, or you need to investigate why tests/lint/build fail in GitHub Actions.
allowed-tools: shell
---

# GitHub Actions Debugging — QRTable

To debug failing GitHub Actions workflows:

## Step 1: Find the Failing Run

Use the `list_workflow_runs` tool from the GitHub MCP Server to find recent workflow runs and their status for the current repository.

## Step 2: Identify the Failing Job

Use `list_workflow_jobs` to see which jobs failed in the run.

## Step 3: Get Failure Summary

Use `summarize_job_log_failures` or `get_job_logs` to understand what failed without reading thousands of lines.

## Step 4: Reproduce Locally

Run the exact commands from `.github/workflows/ci.yml`:

```bash
# Typical CI commands for QRTable
npx nx run-many -t lint --affected
npx nx run-many -t test --affected
npx nx run-many -t build --affected
```

## Step 5: Fix and Verify

Fix the issue locally, verify the commands pass, then commit.

## Common QRTable CI Failures

### Lint failure

```bash
npx nx lint <failing-project> --fix
# Check for unfixable lint errors manually
```

### Test failure

```bash
npx nx test <failing-project> --verbose
# Look for: missing mocks, async issues, tenant_id not being filtered
```

### Build failure

```bash
npx nx build <failing-project>
# Check for: TypeScript errors, missing @common/* imports, circular deps
# If "module not found": check tsconfig.base.json path aliases
```

### TypeScript compilation error

```bash
npx tsc -p apps/<project>/tsconfig.app.json --noEmit
# Look for: type mismatches, missing interface implementations, any type issues
```

## Workflow File Location

`.github/workflows/ci.yml` — check what triggers the workflow and what commands run.
