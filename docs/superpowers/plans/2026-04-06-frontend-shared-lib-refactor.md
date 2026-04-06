# Step 1.45 — Frontend Shared Library Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate duplicated frontend code and establish `@einvoice/frontend-ui` as the single source of truth for shared UI primitives across both frontend apps.

**Architecture:** Bottom-up incremental migration in 7 tasks. Move 21 shadcn primitive components from management-app to shared lib, consolidate duplicate utilities (cn, use-mobile, button, feature-placeholder), and update all import paths. Each task is independently verifiable and committable.

**Tech Stack:** Nx monorepo, React 19, Next.js 16, Vite, TypeScript, shadcn/ui (radix-nova), Tailwind CSS v4, TanStack Query

**Design Spec:** `docs/superpowers/specs/2026-04-05-frontend-shared-lib-refactor-design.md`

---

## File Structure

### New files to create

```
libs/frontend/ui/src/lib/utils.ts                    — cn() re-export for shadcn component imports
libs/frontend/ui/src/components/ui/                   — directory for shadcn primitives
libs/frontend/ui/src/components/composites/           — directory for business components
```

### Files to move (management-app → shared lib)

```
# shadcn primitives: apps/management-app/src/components/ui/ → libs/frontend/ui/src/components/ui/
alert-dialog.tsx, avatar.tsx, badge.tsx, button.tsx, card.tsx, checkbox.tsx,
dialog.tsx, dropdown-menu.tsx, input.tsx, input-group.tsx, label.tsx, popover.tsx,
scroll-area.tsx, select.tsx, separator.tsx, skeleton.tsx, sonner.tsx, switch.tsx,
tabs.tsx, textarea.tsx, tooltip.tsx

# composite: apps/management-app/src/components/confirm-dialog.tsx → libs/frontend/ui/src/components/composites/
```

### Files to modify (import path updates)

```
# Shared lib
libs/frontend/utils/src/index.ts                      — add cn export
libs/frontend/ui/src/index.ts                         — rewrite barrel exports

# management-app (~40 files)
apps/management-app/src/lib/utils.ts                  — replace with re-export
apps/management-app/src/app/layout.tsx
apps/management-app/src/app/(auth)/login/page.tsx
apps/management-app/src/app/(dashboard)/dashboard/*/page.tsx (5 files)
apps/management-app/src/app/(pos)/pos/*/page.tsx (3 files)
apps/management-app/src/app/(kds)/kds/*/page.tsx (2 files)
apps/management-app/src/app/(admin)/admin/*/page.tsx (4 files)
apps/management-app/src/features/tables/index.tsx
apps/management-app/src/features/tables/components/*.tsx (8 files)
apps/management-app/src/features/menu/index.tsx
apps/management-app/src/features/menu/components/*.tsx (7 files)
apps/management-app/src/components/layout/*.tsx (6 files)
apps/management-app/src/components/data-table/*.tsx (5 files)
apps/management-app/src/components/search.tsx
apps/management-app/src/components/theme-switch.tsx
apps/management-app/src/components/profile-dropdown.tsx
apps/management-app/src/components/ui/sidebar.tsx     — update shared imports
apps/management-app/src/components/ui/sheet.tsx        — update shared imports
apps/management-app/src/components/ui/command.tsx      — update shared imports

# customer-pwa (5 files)
apps/customer-pwa/src/lib/utils.ts                    — replace with re-export
apps/customer-pwa/src/pages/landing-page.tsx
apps/customer-pwa/src/pages/menu-page.tsx
apps/customer-pwa/src/pages/order-tracking-page.tsx
apps/customer-pwa/src/pages/request-payment-page.tsx
```

### Files to delete

```
# customer-pwa
apps/customer-pwa/src/components/ui/button.tsx
apps/customer-pwa/src/components/placeholders/feature-placeholder.tsx

# management-app (21 moved shadcn components)
apps/management-app/src/components/ui/alert-dialog.tsx
apps/management-app/src/components/ui/avatar.tsx
apps/management-app/src/components/ui/badge.tsx
apps/management-app/src/components/ui/button.tsx
apps/management-app/src/components/ui/card.tsx
apps/management-app/src/components/ui/checkbox.tsx
apps/management-app/src/components/ui/dialog.tsx
apps/management-app/src/components/ui/dropdown-menu.tsx
apps/management-app/src/components/ui/input.tsx
apps/management-app/src/components/ui/input-group.tsx
apps/management-app/src/components/ui/label.tsx
apps/management-app/src/components/ui/popover.tsx
apps/management-app/src/components/ui/scroll-area.tsx
apps/management-app/src/components/ui/select.tsx
apps/management-app/src/components/ui/separator.tsx
apps/management-app/src/components/ui/skeleton.tsx
apps/management-app/src/components/ui/sonner.tsx
apps/management-app/src/components/ui/switch.tsx
apps/management-app/src/components/ui/tabs.tsx
apps/management-app/src/components/ui/textarea.tsx
apps/management-app/src/components/ui/tooltip.tsx
apps/management-app/src/components/confirm-dialog.tsx
apps/management-app/src/components/placeholders/feature-placeholder.tsx
apps/management-app/src/hooks/use-mobile.ts
```

### Files that stay unchanged (app-specific)

```
# management-app app-specific UI (keep at @/components/ui/)
apps/management-app/src/components/ui/sidebar.tsx     — stays (modified imports only)
apps/management-app/src/components/ui/sheet.tsx        — stays (modified imports only)
apps/management-app/src/components/ui/command.tsx      — stays (modified imports only)
apps/management-app/src/components/ui/breadcrumb.tsx   — stays unchanged
apps/management-app/src/components/ui/collapsible.tsx  — stays unchanged
apps/management-app/src/components/ui/resizable.tsx    — stays unchanged
apps/management-app/src/components/ui/table.tsx        — stays unchanged
```

---

## Task 1: Prerequisites — Export cn and Setup Shared Lib Structure

**Files:**

- Modify: `libs/frontend/utils/src/index.ts`
- Create: `libs/frontend/ui/src/lib/utils.ts`
- Create: `libs/frontend/ui/src/components/ui/` (directory)
- Create: `libs/frontend/ui/src/components/composites/` (directory)
- Move: `libs/frontend/ui/src/lib/feature-placeholder.tsx` → `libs/frontend/ui/src/components/composites/feature-placeholder.tsx`
- Delete: `libs/frontend/ui/src/lib/frontend-ui.tsx` (empty placeholder)
- Delete: `libs/frontend/ui/src/lib/frontend-ui.spec.tsx` (tests empty component)
- Modify: `libs/frontend/ui/src/index.ts`

- [ ] **Step 1: Add cn export to @einvoice/frontend-utils**

Modify `libs/frontend/utils/src/index.ts`:

```typescript
export { cn } from './lib/cn';
export { formatCurrency, formatDate, formatTime } from './lib/format';
export { apiClient, ApiError } from './lib/api-client';
```

- [ ] **Step 2: Create directory structure and utils re-export**

```bash
mkdir -p libs/frontend/ui/src/components/ui
mkdir -p libs/frontend/ui/src/components/composites
```

Create `libs/frontend/ui/src/lib/utils.ts`:

```typescript
export { cn } from '@einvoice/frontend-utils';
```

- [ ] **Step 3: Reorganize feature-placeholder**

```bash
mv libs/frontend/ui/src/lib/feature-placeholder.tsx libs/frontend/ui/src/components/composites/feature-placeholder.tsx
rm libs/frontend/ui/src/lib/frontend-ui.tsx
rm libs/frontend/ui/src/lib/frontend-ui.spec.tsx
```

- [ ] **Step 4: Update barrel exports**

Rewrite `libs/frontend/ui/src/index.ts`:

```typescript
// Composites
export { FeaturePlaceholder, type FeaturePlaceholderProps } from './components/composites/feature-placeholder';
```

- [ ] **Step 5: Verify**

Run: `npx nx lint frontend-ui`

Expected: PASS — no lint errors.

- [ ] **Step 6: Commit**

```bash
git add libs/frontend/ui/ libs/frontend/utils/src/index.ts
git commit -m "feat(frontend-ui): setup shared UI lib structure with components organization

- Add cn export to @einvoice/frontend-utils
- Create components/ui/ and components/composites/ directories
- Move feature-placeholder to composites
- Remove empty placeholder files

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 2: Move shadcn Primitive Components to Shared Lib

**Files:**

- Copy from: `apps/management-app/src/components/ui/*.tsx` (21 files)
- Create in: `libs/frontend/ui/src/components/ui/*.tsx` (21 files)
- Modify: `libs/frontend/ui/src/index.ts` (add all exports)

All moved components need two import rewrites:

1. `import { cn } from "@/lib/utils"` → `import { cn } from "../../lib/utils"`
2. Cross-component imports like `import { Button } from "@/components/ui/button"` → `import { Button } from "./button"`

- [ ] **Step 1: Copy all 21 component files to shared lib**

```bash
cd /Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order

COMPONENTS="alert-dialog avatar badge button card checkbox dialog dropdown-menu input input-group label popover scroll-area select separator skeleton sonner switch tabs textarea tooltip"

for comp in $COMPONENTS; do
  cp "apps/management-app/src/components/ui/${comp}.tsx" "libs/frontend/ui/src/components/ui/${comp}.tsx"
done
```

- [ ] **Step 2: Fix cn import in all moved components**

Every moved component imports `cn` from `"@/lib/utils"`. Change to relative path:

```bash
cd libs/frontend/ui/src/components/ui

sed -i '' 's|from "@/lib/utils"|from "../../lib/utils"|g' *.tsx
sed -i '' "s|from '@/lib/utils'|from '../../lib/utils'|g" *.tsx
```

- [ ] **Step 3: Fix cross-component imports within moved components**

Three files have internal cross-imports that need relative paths:

**alert-dialog.tsx** — imports Button:

```bash
sed -i '' 's|from "@/components/ui/button"|from "./button"|g' libs/frontend/ui/src/components/ui/alert-dialog.tsx
```

**dialog.tsx** — imports Button:

```bash
sed -i '' 's|from "@/components/ui/button"|from "./button"|g' libs/frontend/ui/src/components/ui/dialog.tsx
```

**input-group.tsx** — imports Button, Input, Textarea:

```bash
sed -i '' 's|from "@/components/ui/button"|from "./button"|g' libs/frontend/ui/src/components/ui/input-group.tsx
sed -i '' 's|from "@/components/ui/input"|from "./input"|g' libs/frontend/ui/src/components/ui/input-group.tsx
sed -i '' 's|from "@/components/ui/textarea"|from "./textarea"|g' libs/frontend/ui/src/components/ui/input-group.tsx
```

- [ ] **Step 4: Update barrel exports**

Rewrite `libs/frontend/ui/src/index.ts` with all component exports:

```typescript
// Primitives — shadcn/ui
export * from './components/ui/alert-dialog';
export * from './components/ui/avatar';
export * from './components/ui/badge';
export * from './components/ui/button';
export * from './components/ui/card';
export * from './components/ui/checkbox';
export * from './components/ui/dialog';
export * from './components/ui/dropdown-menu';
export * from './components/ui/input';
export * from './components/ui/input-group';
export * from './components/ui/label';
export * from './components/ui/popover';
export * from './components/ui/scroll-area';
export * from './components/ui/select';
export * from './components/ui/separator';
export * from './components/ui/skeleton';
export * from './components/ui/sonner';
export * from './components/ui/switch';
export * from './components/ui/tabs';
export * from './components/ui/textarea';
export * from './components/ui/tooltip';

// Composites
export { FeaturePlaceholder, type FeaturePlaceholderProps } from './components/composites/feature-placeholder';
```

- [ ] **Step 5: Verify shared lib compiles**

Run: `npx nx lint frontend-ui`

Expected: PASS — all components lint clean. If there are warnings about `"use client"` directives, that's fine — they're needed for Next.js RSC boundary detection.

- [ ] **Step 6: Commit**

```bash
git add libs/frontend/ui/
git commit -m "feat(frontend-ui): move 21 shadcn primitives to shared UI library

Components moved: alert-dialog, avatar, badge, button, card, checkbox,
dialog, dropdown-menu, input, input-group, label, popover, scroll-area,
select, separator, skeleton, sonner, switch, tabs, textarea, tooltip

All internal imports updated to relative paths.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 3: Move confirm-dialog to Shared Composites

**Files:**

- Copy from: `apps/management-app/src/components/confirm-dialog.tsx`
- Create: `libs/frontend/ui/src/components/composites/confirm-dialog.tsx`
- Modify: `libs/frontend/ui/src/index.ts`

- [ ] **Step 1: Copy and fix confirm-dialog**

```bash
cp apps/management-app/src/components/confirm-dialog.tsx libs/frontend/ui/src/components/composites/confirm-dialog.tsx
```

Update the import in the copied file. Change:

```typescript
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
```

To:

```typescript
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
```

- [ ] **Step 2: Add export to barrel**

Add to `libs/frontend/ui/src/index.ts` after the composites section:

```typescript
export { ConfirmDialog } from './components/composites/confirm-dialog';
```

- [ ] **Step 3: Verify**

Run: `npx nx lint frontend-ui`

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add libs/frontend/ui/
git commit -m "feat(frontend-ui): move confirm-dialog to shared composites

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 4: Update management-app — Import from Shared Lib

This is the largest task. All management-app files that import moved components need updating from `@/components/ui/<name>` to `@einvoice/frontend-ui`.

**Key rule:** Only change imports for the 21 MOVED components. App-specific components (`sidebar`, `sheet`, `command`, `breadcrumb`, `collapsible`, `resizable`, `table`) keep their `@/components/ui/` imports.

**Files to modify:** ~40 files in management-app (see File Structure section above)

- [ ] **Step 1: Bulk-replace shared component imports in feature and app files**

Use `sed` to replace imports. For each moved component, find imports from `@/components/ui/<name>` and replace with `@einvoice/frontend-ui`.

```bash
cd /Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order

SHARED="alert-dialog avatar badge button card checkbox dialog dropdown-menu input input-group label popover scroll-area select separator skeleton sonner switch tabs textarea tooltip"

# Process all .tsx and .ts files in management-app (excluding node_modules)
find apps/management-app/src -name '*.tsx' -o -name '*.ts' | while read file; do
  for comp in $SHARED; do
    sed -i '' "s|from '@/components/ui/${comp}'|from '@einvoice/frontend-ui'|g" "$file"
    sed -i '' "s|from \"@/components/ui/${comp}\"|from '@einvoice/frontend-ui'|g" "$file"
  done
done
```

- [ ] **Step 2: Consolidate duplicate import lines**

After Step 1, files that imported multiple shared components will have multiple `import ... from '@einvoice/frontend-ui'` lines. Find them:

```bash
grep -rn "from '@einvoice/frontend-ui'" apps/management-app/src/ --include="*.tsx" --include="*.ts" | awk -F: '{print $1}' | sort | uniq -c | sort -rn | awk '$1 > 1'
```

For each file with >1 `@einvoice/frontend-ui` import, manually merge into a single import statement. Example:

```typescript
// BEFORE (multiple lines after sed):
import { Button } from '@einvoice/frontend-ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@einvoice/frontend-ui';
import { Input } from '@einvoice/frontend-ui';
import { Label } from '@einvoice/frontend-ui';

// AFTER (consolidated):
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, Input, Label } from '@einvoice/frontend-ui';
```

Key files needing consolidation (~20 files):

- `src/features/tables/components/table-floor-plan.tsx`
- `src/features/tables/components/qr-code-dialog.tsx`
- `src/features/tables/components/data-table-row-actions.tsx`
- `src/features/tables/components/table-mutate-dialog.tsx`
- `src/features/tables/components/area-mutate-dialog.tsx`
- `src/features/menu/components/data-table-row-actions.tsx`
- `src/features/menu/components/category-mutate-dialog.tsx`
- `src/features/menu/components/menu-item-mutate-drawer.tsx`
- `src/components/layout/app-topbar.tsx`
- `src/components/layout/app-sidebar.tsx`
- `src/components/layout/mode-toggle.tsx`
- `src/components/layout/nav-group.tsx`
- `src/components/data-table/pagination.tsx`
- `src/components/data-table/view-options.tsx`
- `src/components/data-table/toolbar.tsx`
- `src/components/data-table/faceted-filter.tsx`
- `src/components/data-table/column-header.tsx`
- `src/components/profile-dropdown.tsx`

- [ ] **Step 3: Update app-specific components that import shared components**

These files stay in management-app but need their shared component imports updated:

**`apps/management-app/src/components/ui/sidebar.tsx`:**

- Change Button, Input, Separator, Skeleton, Tooltip imports from `@/components/ui/*` to `@einvoice/frontend-ui`
- Keep Sheet import as-is: `from '@/components/ui/sheet'`
- Change `import { useIsMobile } from '@/hooks/use-mobile'` → `import { useIsMobile } from '@einvoice/frontend-hooks'`
- Keep `import { cn } from '@/lib/utils'` as-is (utils.ts will re-export)

**`apps/management-app/src/components/ui/sheet.tsx`:**

- Change `import { Button } from "@/components/ui/button"` → `import { Button } from '@einvoice/frontend-ui'`

**`apps/management-app/src/components/ui/command.tsx`:**

- Change Dialog and InputGroup imports from `@/components/ui/*` to `@einvoice/frontend-ui`

- [ ] **Step 4: Update placeholder imports (12 files)**

```bash
find apps/management-app/src -name '*.tsx' | xargs grep -l "from '@/components/placeholders/feature-placeholder'" | while read file; do
  sed -i '' "s|from '@/components/placeholders/feature-placeholder'|from '@einvoice/frontend-ui'|g" "$file"
done
```

Files affected:

- `src/app/(kds)/kds/bar/page.tsx`
- `src/app/(kds)/kds/kitchen/page.tsx`
- `src/app/(dashboard)/dashboard/subscription/page.tsx`
- `src/app/(dashboard)/dashboard/staff/page.tsx`
- `src/app/(dashboard)/dashboard/orders/page.tsx`
- `src/app/(pos)/pos/tables/page.tsx`
- `src/app/(pos)/pos/payment/page.tsx`
- `src/app/(pos)/pos/page.tsx`
- `src/app/(admin)/admin/plans/page.tsx`
- `src/app/(admin)/admin/tenants/page.tsx`
- `src/app/(admin)/admin/page.tsx`
- `src/app/(admin)/admin/analytics/page.tsx`

- [ ] **Step 5: Update confirm-dialog imports (4 files)**

```bash
find apps/management-app/src -name '*.tsx' | xargs grep -l "from '@/components/confirm-dialog'" | while read file; do
  sed -i '' "s|from '@/components/confirm-dialog'|from '@einvoice/frontend-ui'|g" "$file"
done
```

Files affected:

- `src/features/tables/components/table-delete-dialog.tsx`
- `src/features/tables/components/area-delete-dialog.tsx`
- `src/features/menu/components/menu-item-delete-dialog.tsx`
- `src/features/menu/components/category-delete-dialog.tsx`

- [ ] **Step 6: Replace management-app utils.ts with re-export**

Replace `apps/management-app/src/lib/utils.ts` content with:

```typescript
export { cn } from '@einvoice/frontend-utils';
```

- [ ] **Step 7: Delete moved files from management-app**

```bash
cd /Users/vodinhquan/Developer/Graduation-Thesis/graduation-thesis/qr-order

SHARED="alert-dialog avatar badge button card checkbox dialog dropdown-menu input input-group label popover scroll-area select separator skeleton sonner switch tabs textarea tooltip"
for comp in $SHARED; do
  rm "apps/management-app/src/components/ui/${comp}.tsx"
done

rm apps/management-app/src/components/confirm-dialog.tsx
rm apps/management-app/src/components/placeholders/feature-placeholder.tsx
rm apps/management-app/src/hooks/use-mobile.ts
```

- [ ] **Step 8: Verify management-app**

Run: `npx nx lint management-app --fix`

Expected: PASS — all imports resolve.

Then: `npx nx build management-app`

Expected: Build succeeds. If there are import consolidation issues, the build errors will show which files need manual merging of duplicate import lines.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "refactor(management-app): migrate to shared UI library imports

- Update ~40 files to import primitives from @einvoice/frontend-ui
- Update 12 placeholder pages to import from @einvoice/frontend-ui
- Update 4 delete-dialog files to import ConfirmDialog from shared lib
- Update sidebar.tsx to use @einvoice/frontend-hooks for useIsMobile
- Replace utils.ts with re-export from @einvoice/frontend-utils
- Delete 21 moved shadcn components, confirm-dialog, placeholder, use-mobile

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 5: Consolidate customer-pwa

**Files:**

- Modify: `apps/customer-pwa/src/lib/utils.ts`
- Delete: `apps/customer-pwa/src/components/ui/button.tsx`
- Delete: `apps/customer-pwa/src/components/placeholders/feature-placeholder.tsx`
- Modify: `apps/customer-pwa/src/pages/landing-page.tsx`
- Modify: `apps/customer-pwa/src/pages/menu-page.tsx`
- Modify: `apps/customer-pwa/src/pages/order-tracking-page.tsx`
- Modify: `apps/customer-pwa/src/pages/request-payment-page.tsx`

- [ ] **Step 1: Replace utils.ts with re-export**

Replace `apps/customer-pwa/src/lib/utils.ts` content with:

```typescript
export { cn } from '@einvoice/frontend-utils';
```

- [ ] **Step 2: Delete unused local components**

```bash
rm apps/customer-pwa/src/components/ui/button.tsx
rm apps/customer-pwa/src/components/placeholders/feature-placeholder.tsx
```

Note: `button.tsx` in customer-pwa is not imported by any other file. Safe to delete.

- [ ] **Step 3: Update placeholder imports (4 pages)**

```bash
find apps/customer-pwa/src -name '*.tsx' | xargs grep -l "from '@/components/placeholders/feature-placeholder'" | while read file; do
  sed -i '' "s|from '@/components/placeholders/feature-placeholder'|from '@einvoice/frontend-ui'|g" "$file"
done
```

Files affected:

- `apps/customer-pwa/src/pages/landing-page.tsx`
- `apps/customer-pwa/src/pages/menu-page.tsx`
- `apps/customer-pwa/src/pages/order-tracking-page.tsx`
- `apps/customer-pwa/src/pages/request-payment-page.tsx`

- [ ] **Step 4: Verify customer-pwa**

Run: `npx nx lint customer-pwa --fix`

Expected: PASS

Then: `npx nx build customer-pwa`

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(customer-pwa): consolidate to shared UI library imports

- Replace utils.ts with re-export from @einvoice/frontend-utils
- Update 4 pages to import FeaturePlaceholder from @einvoice/frontend-ui
- Delete unused local button.tsx and feature-placeholder.tsx re-export

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

---

## Task 6: Cross-app Verification

**Files:** None modified — verification only

- [ ] **Step 1: Lint all affected projects**

```bash
npx nx run-many -t lint -p frontend-ui,management-app,customer-pwa --fix
```

Expected: All 3 projects pass lint.

- [ ] **Step 2: Build all affected projects**

```bash
npx nx run-many -t build -p management-app,customer-pwa
```

Expected: Both apps build successfully.

- [ ] **Step 3: Run tests if they exist**

```bash
npx nx run-many -t test -p frontend-ui,management-app,customer-pwa --passWithNoTests 2>/dev/null || true
```

Expected: Tests pass or no tests exist (passWithNoTests).

- [ ] **Step 4: Verify no broken imports remain**

```bash
# management-app — ensure no stale imports for moved components
grep -rn "from '@/components/ui/button'" apps/management-app/src/ --include="*.tsx" --include="*.ts" | grep -v "node_modules" || echo "✅ No stale button imports"
grep -rn "from '@/components/ui/badge'" apps/management-app/src/ --include="*.tsx" --include="*.ts" | grep -v "node_modules" || echo "✅ No stale badge imports"
grep -rn "from '@/components/ui/dialog'" apps/management-app/src/ --include="*.tsx" --include="*.ts" | grep -v "node_modules" || echo "✅ No stale dialog imports"
grep -rn "from '@/components/ui/input'" apps/management-app/src/ --include="*.tsx" --include="*.ts" | grep -v "node_modules" || echo "✅ No stale input imports"
grep -rn "from '@/components/ui/separator'" apps/management-app/src/ --include="*.tsx" --include="*.ts" | grep -v "node_modules" || echo "✅ No stale separator imports"
grep -rn "from '@/components/placeholders'" apps/management-app/src/ --include="*.tsx" --include="*.ts" || echo "✅ No stale placeholder imports"
grep -rn "from '@/components/confirm-dialog'" apps/management-app/src/ --include="*.tsx" --include="*.ts" || echo "✅ No stale confirm-dialog imports"
grep -rn "from '@/hooks/use-mobile'" apps/management-app/src/ --include="*.tsx" --include="*.ts" || echo "✅ No stale use-mobile imports"

# customer-pwa
grep -rn "from '@/components/placeholders'" apps/customer-pwa/src/ --include="*.tsx" --include="*.ts" || echo "✅ No stale placeholder imports in PWA"
```

Expected: All checks show ✅.

---

## Task 7: Cleanup and Final Commit

**Files:** Empty directories to remove

- [ ] **Step 1: Clean up empty directories**

```bash
rmdir apps/management-app/src/components/placeholders 2>/dev/null || true
rmdir apps/management-app/src/hooks 2>/dev/null || true
rmdir apps/customer-pwa/src/components/ui 2>/dev/null || true
rmdir apps/customer-pwa/src/components/placeholders 2>/dev/null || true
```

- [ ] **Step 2: Verify final shared lib structure**

```bash
find libs/frontend/ui/src -type f -name '*.tsx' -o -name '*.ts' | sort
```

Expected output:

```
libs/frontend/ui/src/components/composites/confirm-dialog.tsx
libs/frontend/ui/src/components/composites/feature-placeholder.tsx
libs/frontend/ui/src/components/ui/alert-dialog.tsx
libs/frontend/ui/src/components/ui/avatar.tsx
libs/frontend/ui/src/components/ui/badge.tsx
libs/frontend/ui/src/components/ui/button.tsx
libs/frontend/ui/src/components/ui/card.tsx
libs/frontend/ui/src/components/ui/checkbox.tsx
libs/frontend/ui/src/components/ui/dialog.tsx
libs/frontend/ui/src/components/ui/dropdown-menu.tsx
libs/frontend/ui/src/components/ui/input-group.tsx
libs/frontend/ui/src/components/ui/input.tsx
libs/frontend/ui/src/components/ui/label.tsx
libs/frontend/ui/src/components/ui/popover.tsx
libs/frontend/ui/src/components/ui/scroll-area.tsx
libs/frontend/ui/src/components/ui/select.tsx
libs/frontend/ui/src/components/ui/separator.tsx
libs/frontend/ui/src/components/ui/skeleton.tsx
libs/frontend/ui/src/components/ui/sonner.tsx
libs/frontend/ui/src/components/ui/switch.tsx
libs/frontend/ui/src/components/ui/tabs.tsx
libs/frontend/ui/src/components/ui/textarea.tsx
libs/frontend/ui/src/components/ui/tooltip.tsx
libs/frontend/ui/src/index.ts
libs/frontend/ui/src/lib/utils.ts
```

- [ ] **Step 3: Verify management-app remaining UI components**

```bash
ls apps/management-app/src/components/ui/
```

Expected: Only app-specific components remain:

```
breadcrumb.tsx  collapsible.tsx  command.tsx  resizable.tsx  sheet.tsx  sidebar.tsx  table.tsx
```

- [ ] **Step 4: Final commit for cleanup**

```bash
git add -A
git commit -m "chore(frontend): cleanup empty directories after shared lib migration

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

- [ ] **Step 5: Verify clean git state**

```bash
git status
```

Expected: `nothing to commit, working tree clean`
