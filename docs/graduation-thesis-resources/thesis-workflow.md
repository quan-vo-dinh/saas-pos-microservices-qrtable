# QRTable Thesis Workflow

## Current Report Status

The current report source is [undergraduate-theses-report.tex](thesis-report/undergraduate-theses-report.tex). The checked-in PDF baseline contains seven chapters and 200 pages (PDF metadata recorded on 2026-06-30). Product scope is complete for the accepted thesis scope; remaining work is evidence maintenance, submission preparation, and explicitly deferred hardening.

## Build and Inspect

Run from `docs/graduation-thesis-resources/thesis-report`:

```bash
latexmk -xelatex -interaction=nonstopmode -halt-on-error undergraduate-theses-report.tex
pdfinfo undergraduate-theses-report.pdf
```

Do not use a successful build as proof of runtime behavior. Validate implementation claims against source code, tests, entities/migrations, and the canonical technical documents before changing a chapter, figure, caption, or conclusion.

## Evidence Update Rule

When an implementation fact changes, update the relevant canonical technical document first, then refresh the report source, artifact register, and evidence map only where the report cites that fact. Preserve the exact command, environment, and result artifact for benchmark or integration-test claims. Never create performance, production, live-provider, or deployment evidence from a build alone.

## Deployment Wording

The report may describe Docker packaging, local verification, and Vercel frontend evidence that exists in the repository. Public backend deployment remains deferred Phase 7 work and must not be described as completed production deployment, production readiness, or a verified public end-to-end environment.

## Institutional Template Policy

`thesis-report/frontmatter/council.tex` remains excluded until the university supplies complete council decision and date information. Do not submit a rendered placeholder council page as institutional fact.

## Defense Blocker and Next Action

No canonical defense deck source, exported PPTX/PDF, or deck directory is present in the worktree. Keep defense notes as working material until those inputs are recovered. The next action is to keep the artifact register synchronized while reconciling the report source and database-schema figures with code.

## Superseded Page Target

The former target to condense the report below 170 pages is cancelled. The accepted 200-page built report is the current baseline; no replacement page target is implied without an institutional requirement.
