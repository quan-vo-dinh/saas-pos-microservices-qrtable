# QRTable Thesis Resources

This directory contains the submission-facing thesis sources and the evidence used to maintain them. The LaTeX report, its cited artifacts, and the current workflow below are canonical; plans, prompts, converted source files, and audits are temporary working material.

## Report Source

- [LaTeX entry point](thesis-report/undergraduate-theses-report.tex) is the canonical report source.
- `thesis-report/undergraduate-theses-report.pdf` is the latest rendered baseline. It contains seven chapters and the current appendices.
- [References](thesis-report/references.bib), chapter sources, and the report asset registry are authoritative for material cited in the PDF.
- `thesis-report/frontmatter/council.tex` is an institutional template and remains excluded until the university provides complete council decision and date information.

## Current Workflow

- [Thesis workflow](thesis-workflow.md) records the current report status, build command, evidence-update rule, deployment wording, and the next action.
- [Artifact register](thesis-artifact-register.md) records maintained report inputs, outputs, and verification commands.
- [Official outline](thesis-official-outline.md) and [evidence map](thesis-evidence-map.md) support report maintenance; they do not override code, tests, or canonical technical documentation.

## Evidence and Benchmarks

- [Testing evidence](../testing/README.md) and [traceability matrix](../testing/traceability-matrix.md) are the authoritative testing map.
- `benchmark-results/` preserves local k6 runs and their provenance. A run is cited only when its exact scenario, environment, and caption have been verified against the report.
- Source code, entities, migrations, tests, and canonical technical documents remain the authority for implementation facts.

## Official Sources and Citations

- `thesis-report/references.bib` is the citation registry used by the report.
- `sources/institutional/` is reserved for the proposal and institutional presentation requirements after their source move is complete.
- Official DOCX/PDF sources establish institutional requirements or proposal provenance; they do not override the implementation record.

## Defense Material

- `defense/` is reserved for the defense source/export registry.
- Existing `thesis-defense-*.md` files are working material only. They are not report authority and must not be treated as a final deck until a canonical deck source or export exists in the worktree.
