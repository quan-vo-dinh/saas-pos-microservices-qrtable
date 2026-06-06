---
name: nx-monorepo
description: Nx monorepo management for QRTable. Use when running tasks, generating code, managing project dependencies, configuring targets, or working with the Nx task graph.
---

# Nx Monorepo — QRTable Task Reference

## Core Commands

```bash
# Serve
npx nx serve <project>                     # Single service dev server
pnpm dev:bff-auth                          # BFF + Authorizer
pnpm dev:some --projects=bff,catalog       # Custom combo

# Test
npx nx test <project>                      # Unit tests
npx nx test <project> --watch             # Watch mode
npx nx run-many -t test --affected        # Only changed projects
npx nx run-many -t test                   # All projects

# Lint
npx nx lint <project>                      # Check
npx nx lint <project> --fix               # Auto-fix

# Build
npx nx build <project>                     # Production build
npx nx run-many -t build --affected       # Build affected

# Cache
pnpm nx:reset                              # Clear cache (use when builds act weird)
```

## Nx Generators (Scaffolding)

```bash
# New NestJS app
npx nx g @nx/nest:app <service-name>

# New Node.js lib
npx nx g @nx/node:lib <lib-name>

# New NestJS resource (module + controller + service)
npx nx g @nx/nest:resource <name> --project=<app>

# New React component
npx nx g @nx/react:component <name> --project=<app>
```

## Project Graph

```bash
npx nx graph                               # Open interactive graph in browser
npx nx graph --file=output.json           # Export as JSON
```

## Understanding project.json

Each project has `project.json` defining targets:

```json
{
  "name": "catalog",
  "targets": {
    "serve": { "executor": "@nx/node:execute", "options": { "main": "apps/catalog/src/main.ts" } },
    "test": { "executor": "@nx/jest:jest" },
    "lint": { "executor": "@nx/eslint:lint" },
    "build": { "executor": "@nx/webpack:webpack" }
  }
}
```

## Path Aliases (tsconfig.base.json)

Backend: `@common/<lib>/*` → `libs/<lib>/src/lib/*`
Frontend: `@einvoice/<lib>/*` → `libs/<lib>/src/*`

When adding a new lib, add its alias to `tsconfig.base.json`.

## Affected Commands (Efficient CI)

Nx tracks which projects changed based on git diff:

```bash
npx nx affected -t test --base=main --head=HEAD
npx nx affected -t lint --base=main --head=HEAD
npx nx affected -t build --base=main --head=HEAD
```

## Common Issues

**Build not finding a lib change?**
→ Run `pnpm nx:reset` to clear Nx cache

**TypeScript path not resolving?**
→ Check `tsconfig.base.json` has the `@common/lib` alias
→ Check `libs/lib/src/index.ts` exports the symbol

**Service not starting on expected port?**
→ Check `libs/configuration/src/lib/tcp.config.ts`
→ Check `main.ts` uses the config, not a hardcoded port
