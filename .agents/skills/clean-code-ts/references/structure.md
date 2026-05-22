# Structure Analysis Protocol — QRTable

## Core Principle: Analyze Before Acting

The actual folder layout of the QRTable Nx monorepo is the source of truth.
DO NOT assume a structure — always analyze what exists first, then make decisions
that are consistent with the existing patterns in that codebase.

---

## Step 1 — Structure Scan (Run at Session Start or Before Major Changes)

When starting a session involving structural decisions (new feature, refactor, file placement),
ask the user to share the relevant directory tree, OR prompt them with:

> "Before I proceed, could you share the output of:
> `tree apps/{service}/src --depth 3` (or the relevant part of the project)?
> This ensures I place files consistently with your existing structure."

If they can't or don't want to share, ask targeted questions:

- "Does this service have a `repositories/` folder or does data access live inside the service file?"
- "Are DTOs local to each service or pulled from `@qrtable/dtos`?"
- "Is there a `constants/` folder at the service level?"

---

## Step 2 — Pattern Recognition (Read Before Write)

When shown existing files, extract the structural patterns before adding anything:

```
Observed in this service:
├── Module pattern: [what I see]
├── DTO location: [local dto/ OR @qrtable/dtos]
├── Constants: [local constants/ OR @qrtable/constants only]
├── Repository: [separate file OR inline in service]
└── Test location: [__tests__/ OR *.spec.ts alongside]

→ I'll follow this pattern for new code.
→ Deviation from this (if any): [explain why]
```

---

## Step 3 — Structural Fit Decision (New Feature / File)

When adding a new file or feature, determine placement by answering in order:

```
Q1: Is this logic used by 2+ services or apps?
  YES → goes into libs/ (see §Shared Lib Decision)
  NO  → stays inside apps/{service}/

Q2: Does it match an existing folder in this service?
  YES → place there, follow naming convention already in use
  NO  → create folder only if 3+ related files will live there (avoid premature nesting)

Q3: Is the naming consistent with neighbors?
  e.g., if existing files are kebab-case → new file is kebab-case
  e.g., if existing DTOs are named {action}-{domain}.dto.ts → follow exactly
```

---

## Shared Lib Decision Tree

```
New code candidate for libs/:

Is it pure TypeScript (no framework deps)?
├── YES, types/interfaces only → libs/shared/types/ (@qrtable/types)
├── YES, utility functions     → libs/shared/utils/ (@qrtable/utils)
└── NO, has framework deps:
    ├── NestJS only:
    │   ├── Guard/Auth logic    → libs/guards/
    │   ├── Interceptor/Filter  → libs/interceptors/
    │   ├── Config/Env          → libs/configuration/
    │   ├── DB entity/schema    → libs/schemas/
    │   ├── DTO (validated)     → libs/dtos/
    │   ├── Kafka producer/cons → libs/queue/
    │   ├── DB/Redis/TCP client → libs/providers/
    │   └── Other utilities     → libs/common/
    └── React/Next.js only:
        ├── UI components       → libs/frontend/ui/
        └── Hooks               → libs/frontend/hooks/
```

---

## Structural Quality Flags (Pattern Inconsistency)

Flag these when observed — they signal structural drift that should be addressed:

```
⚠️ STRUCT-001 [INCONSISTENT_LOCATION]
  Same type of file placed in different folders across services
  e.g., DTOs in dto/ in one service, dtos/ in another, inline in a third
  → Suggest: align to the majority pattern, note it for team alignment

⚠️ STRUCT-002 [PREMATURE_EXTRACTION]
  Code extracted to libs/ but only used by 1 service
  → Suggest: move back into the service until second consumer appears

⚠️ STRUCT-003 [MISSING_BARREL]
  Feature folder with 5+ files but no index.ts public API
  → Suggest: add index.ts to control what's exported from this feature

⚠️ STRUCT-004 [DEEP_NESTING]
  More than 4 levels of nesting inside a single service
  → Suggest: flatten or reconsider boundaries

⚠️ STRUCT-005 [CROSS_MODULE_IMPORT]
  Service A importing directly from apps/service-b/src/
  → BLOCK: must go through libs/ or TCP/Kafka — never direct app-to-app import
```

---

## Guiding Principles (Framework-Agnostic)

These apply regardless of the specific folder layout observed:

1. **Colocation** — code that changes together lives together
2. **Single exit point** — each feature/module has one `index.ts` exporting its public API
3. **No circular deps** — libs/ never import from apps/; apps can import from libs/
4. **Consistent depth** — all services should have roughly similar nesting depth
5. **Name reveals intent** — `user-session.service.ts` > `manager.ts`
6. **Don't over-engineer** — a simple `utils.ts` is fine; don't create `utils/string/formatters/phone/` for 1 function
