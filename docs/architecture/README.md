# Architecture Artifacts

## ERD files

- `erd.dbml`: source of truth for dbdiagram/dbdocs.
- `erd.mmd`: Mermaid version for quick rendering in markdown-centric workflows.
- `erd.png`: exported image used in thesis report.

## Export erd.png (recommended)

From workspace root:

```bash
npx -y @mermaid-js/mermaid-cli -i docs/architecture/erd.mmd -o docs/architecture/erd.png -t default -b transparent
```

If your environment blocks headless browser download, open `erd.dbml` in dbdiagram.io and export PNG manually.

## Notes

- This ERD is an orientation model for Step 0.3.
- Physical schema in TypeORM will be iterated in later phases based on UI mocks and implementation feedback.
