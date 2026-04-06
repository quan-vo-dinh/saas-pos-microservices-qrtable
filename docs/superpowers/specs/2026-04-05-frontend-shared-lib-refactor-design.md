# Step 1.45 — Frontend Shared Library Refactor

> **Goal:** Consolidate duplicated code, establish `@einvoice/frontend-ui` as the single source of truth for shared UI primitives, and activate underutilized shared hooks/utils — before building more features.

## Problem Statement

Both frontend apps (`customer-pwa` and `management-app`) have grown independently, creating:

- **Duplicated code:** `cn()` exists in 3 places (both apps + shared lib), `button.tsx` identical in both apps, `use-mobile.ts` duplicated
- **Underutilized shared libs:** `@einvoice/frontend-ui` only exports `FeaturePlaceholder`; `@einvoice/frontend-hooks` has hooks that no app imports
- **No shared UI components:** 28 shadcn components live only in management-app; customer-pwa will need many of them for Step 1.3+
- **Inconsistent import patterns:** Some code imports from shared libs, some from local copies

## Approach

**Bottom-Up Incremental Migration** — 5 phases, each independently verifiable, each its own commit for safe rollback.

## Scope

### In Scope

- Restructure `@einvoice/frontend-ui` with proper component organization
- Move ~20 shadcn primitive components from management-app to shared lib
- Consolidate all duplicate code (cn, use-mobile, button)
- Activate `@einvoice/frontend-hooks` usage in apps
- Update import paths across both apps
- Configure shadcn CLI for shared lib workflow
- Move `confirm-dialog` from management-app to shared composites

### Out of Scope

- Code quality fixes (hardcoded values, console.logs, error handling) — separate effort
- Backend shared libraries (`@common/*`) — unchanged
- New component development (StatusBadge, MenuItemCard) — future steps
- Custom shadcn registry setup — future optimization
- Unit test writing — shadcn components are visual primitives tested upstream

## Architecture

### Target Library Structure

```
libs/frontend/ui/
├── src/
│   ├── components/
│   │   ├── ui/                    ← shadcn primitives (shared between apps)
│   │   │   ├── alert-dialog.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── input.tsx
│   │   │   ├── input-group.tsx
│   │   │   ├── label.tsx
│   │   │   ├── popover.tsx
│   │   │   ├── scroll-area.tsx
│   │   │   ├── select.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── sonner.tsx
│   │   │   ├── switch.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── textarea.tsx
│   │   │   └── tooltip.tsx
│   │   └── composites/            ← business/reusable components
│   │       ├── feature-placeholder.tsx  (existing)
│   │       └── confirm-dialog.tsx       (from management-app)
│   ├── styles/
│   │   └── shared-tokens.css      ← shared oklch design tokens
│   └── index.ts                   ← barrel exports
├── components.json                ← shadcn config for shared lib
├── package.json
├── tsconfig.json
└── tsconfig.lib.json
```

### Components NOT Moved (app-specific)

**management-app keeps:**

- `sidebar.tsx` — dashboard navigation layout
- `resizable.tsx` — split-panel layout (tables feature)
- `sheet.tsx` — mobile slide-over (dashboard-specific)
- `command.tsx` — command palette
- `breadcrumb.tsx` — dashboard breadcrumb navigation
- `collapsible.tsx` — sidebar collapsible groups
- `table.tsx` — data-table primitive (tied to @tanstack/react-table)

**customer-pwa keeps:**

- `mobile-shell.tsx` — mobile layout wrapper
- `mobile-header.tsx` — sticky navigation header

### Rationale for Split

- **Shared primitives:** Form elements (input, select, checkbox), display elements (badge, card, avatar), overlays (dialog, popover, tooltip) — these are device-agnostic, styling adapts via Tailwind responsive utilities
- **App-specific:** Layout components tightly coupled to each app's navigation pattern and UX paradigm (sidebar for desktop dashboard vs mobile shell for PWA)

## Import Conventions

After refactor, imports follow this pattern:

```typescript
// Shared UI primitives — from @einvoice/frontend-ui
import { Button } from '@einvoice/frontend-ui';
import { Card, CardHeader, CardContent } from '@einvoice/frontend-ui';
import { Dialog, DialogTrigger, DialogContent } from '@einvoice/frontend-ui';
import { ConfirmDialog } from '@einvoice/frontend-ui';

// App-specific components — from local @/components/ui/
import { Sidebar, SidebarContent } from '@/components/ui/sidebar';
import { Resizable } from '@/components/ui/resizable';

// Shared hooks — from @einvoice/frontend-hooks
import { useIsMobile, useDialogState } from '@einvoice/frontend-hooks';

// Shared utils — from @einvoice/frontend-utils
import { cn, apiClient, formatCurrency } from '@einvoice/frontend-utils';

// Shared types — from @einvoice/types
import type { Category, MenuItem } from '@einvoice/types';
```

## Duplicate Consolidation Plan

### `cn()` Utility

| Location                               | Action                                                        |
| -------------------------------------- | ------------------------------------------------------------- |
| `libs/frontend/utils/src/lib/cn.ts`    | ✅ KEEP — single source of truth                              |
| `apps/customer-pwa/src/lib/utils.ts`   | → Re-export: `export { cn } from '@einvoice/frontend-utils';` |
| `apps/management-app/src/lib/utils.ts` | → Re-export: `export { cn } from '@einvoice/frontend-utils';` |

**Why re-export instead of delete:** shadcn CLI `components.json` references `"utils": "@/lib/utils"`. Keeping a thin re-export file ensures `npx shadcn add` continues to work for app-specific components. The file contains ONLY the re-export — no other logic.

### `use-mobile.ts` Hook

| Location                                      | Action                                                   |
| --------------------------------------------- | -------------------------------------------------------- |
| `libs/frontend/hooks/src/lib/use-mobile.ts`   | ✅ KEEP — single source                                  |
| `apps/management-app/src/hooks/use-mobile.ts` | ❌ DELETE — update imports to `@einvoice/frontend-hooks` |

### `button.tsx` Component

| Location                                           | Action                                          |
| -------------------------------------------------- | ----------------------------------------------- |
| `libs/frontend/ui/src/components/ui/button.tsx`    | ✅ NEW — move here                              |
| `apps/customer-pwa/src/components/ui/button.tsx`   | ❌ DELETE — import from `@einvoice/frontend-ui` |
| `apps/management-app/src/components/ui/button.tsx` | ❌ DELETE — import from `@einvoice/frontend-ui` |

### `feature-placeholder.tsx`

| Location                                                                  | Action                                          |
| ------------------------------------------------------------------------- | ----------------------------------------------- |
| `libs/frontend/ui/src/components/composites/feature-placeholder.tsx`      | ✅ KEEP (move from current location)            |
| `apps/customer-pwa/src/components/placeholders/feature-placeholder.tsx`   | ❌ DELETE — import from `@einvoice/frontend-ui` |
| `apps/management-app/src/components/placeholders/feature-placeholder.tsx` | ❌ DELETE — import from `@einvoice/frontend-ui` |

### `confirm-dialog.tsx`

| Location                                                        | Action                                          |
| --------------------------------------------------------------- | ----------------------------------------------- |
| `libs/frontend/ui/src/components/composites/confirm-dialog.tsx` | ✅ NEW — move here                              |
| `apps/management-app/src/components/confirm-dialog.tsx`         | ❌ DELETE — import from `@einvoice/frontend-ui` |

## Migration Phases

### Phase 1: Setup @einvoice/frontend-ui Structure

1. Create directory structure: `components/ui/`, `components/composites/`, `styles/`
2. Create `components.json` for shared lib
3. Move `feature-placeholder.tsx` to new location within lib
4. Update barrel exports in `index.ts`
5. Verify: `npx nx lint frontend-ui`

### Phase 2: Move shadcn Primitives from management-app

1. Copy 20 primitive component files to `libs/frontend/ui/src/components/ui/`
2. Update barrel exports to include all new components
3. Update all import paths in management-app from `@/components/ui/*` to `@einvoice/frontend-ui`
4. Delete original files from `management-app/src/components/ui/` (only the moved ones)
5. Move `confirm-dialog.tsx` to shared composites, update its internal imports (dialog, button) to `@einvoice/frontend-ui`
6. Verify: `npx nx lint management-app && npx nx build management-app`

### Phase 3: Consolidate Duplicates

1. Replace `apps/customer-pwa/src/lib/utils.ts` content with re-export
2. Replace `apps/management-app/src/lib/utils.ts` content with re-export
3. Delete `apps/customer-pwa/src/components/ui/button.tsx`
4. Update customer-pwa button imports to `@einvoice/frontend-ui`
5. Delete `apps/customer-pwa/src/components/placeholders/feature-placeholder.tsx`
6. Update customer-pwa placeholder imports to `@einvoice/frontend-ui`
7. Delete `apps/management-app/src/components/placeholders/feature-placeholder.tsx`
8. Update management-app placeholder imports to `@einvoice/frontend-ui`
9. Verify: `npx nx lint customer-pwa && npx nx build customer-pwa`

### Phase 4: Activate Shared Hooks

1. Delete `apps/management-app/src/hooks/use-mobile.ts`
2. Update management-app imports from `@/hooks/use-mobile` to `@einvoice/frontend-hooks`
3. Evaluate `useDialogState` applicability in management-app feature providers
4. If applicable, refactor providers to use shared hook
5. Verify: `npx nx run-many -t lint -p management-app,customer-pwa`

### Phase 5: Update shadcn CLI Configuration

1. Update management-app `components.json` — verify `ui` alias still points to local `@/components/ui/` for app-specific components
2. Verify `npx shadcn add` still works for app-specific components
3. Document convention: when to add to shared lib vs app-specific

## Verification Strategy

| Phase | Command                                                     | Pass Criteria                   |
| ----- | ----------------------------------------------------------- | ------------------------------- |
| 1     | `npx nx lint frontend-ui`                                   | Lib compiles, no lint errors    |
| 2     | `npx nx lint management-app && npx nx build management-app` | All imports resolve, app builds |
| 3     | `npx nx lint customer-pwa && npx nx build customer-pwa`     | All imports resolve, app builds |
| 4     | `npx nx run-many -t lint -p management-app,customer-pwa`    | Both apps lint clean            |
| 5     | `npx shadcn add <test>` in management-app                   | CLI adds to app-specific path   |

## Commit Strategy

Each phase = 1 atomic commit with conventional commit message:

```
Phase 1: feat(frontend-ui): setup shared UI lib structure with components organization
Phase 2: refactor(frontend-ui): move shadcn primitives from management-app to shared lib
Phase 3: refactor(frontend): consolidate duplicate utils and components across apps
Phase 4: refactor(frontend): activate shared hooks library usage
Phase 5: chore(frontend): update shadcn CLI configuration for shared lib workflow
```

## Risks & Mitigations

| Risk                                               | Impact                                                      | Mitigation                                                                                                              |
| -------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Next.js RSC vs client component conflicts          | Shared components may not work in server components         | Shared lib `components.json` sets `rsc: false`; management-app adds `"use client"` directive where needed               |
| Tailwind CSS variables not resolving in shared lib | Components render without styles                            | CSS design tokens imported via each app's `globals.css`; shared lib provides token definitions but apps apply them      |
| Vite vs Next.js bundler incompatibility            | Import resolution failures                                  | Shared lib exports ESM; both Vite and Next.js support ESM natively; `tsconfig.base.json` path aliases handle resolution |
| shadcn CLI overwrites shared components            | Running `npx shadcn add` in app could recreate local copies | App `components.json` `ui` alias points to app-specific directory only; shared components have different path           |
| Barrel export performance                          | Large re-export file could slow builds                      | Both Vite and Next.js support tree-shaking; barrel exports are resolved at build time                                   |

## Future Considerations (Out of Scope)

- **Custom shadcn registry** — could replace manual component syncing (Approach C from brainstorming)
- **Shared form components** — react-hook-form + Zod patterns could be shared
- **Shared API service patterns** — standardized BFF communication layer
- **Component Storybook** — visual documentation for shared components
- **Design token lib** — separate `@einvoice/design-tokens` for colors, spacing, typography
