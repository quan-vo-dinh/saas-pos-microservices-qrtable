# QRTable — AGENTS.md

Primary agent context for the QRTable Restaurant QR-code ordering SaaS platform.

> ⚠️ **TARGET STANDARDS — NOT CURRENT STATE**
> This document describes **how the codebase should be built**, not necessarily its current state.
> The project is under active improvement. Always apply the patterns below when generating new code or refactoring existing code — even if surrounding code doesn't follow them yet.
> **Do not copy existing code patterns blindly** — audit them against these standards first.

## Project Identity

Nx monorepo with NestJS microservices backend + React/Next.js frontends. Multi-tenant SaaS architecture.

## Critical Patterns to Know

### Guard Chain (Backend)

Every protected HTTP endpoint goes through: `UserGuard` → `TenantGuard` → `PermissionGuard`.

- `UserGuard`: Validates JWT via gRPC call to Authorizer service. Attaches `user` to request.
- `TenantGuard`: Resolves tenant from header/subdomain/JWT. Attaches `tenant_id` to request.
- `PermissionGuard`: Checks RBAC permissions from `@common/constants`.

Never bypass this chain. Always apply guards in this order.

### TCP Microservice Communication

Services communicate via NestJS TCP transport. Pattern:

1. BFF Controller calls `this.client.send(TCP_MESSAGE_PATTERN, payload)`
2. Target service handles with `@MessagePattern(TCP_MESSAGE_PATTERN)`
3. Constants in `libs/constants/src/lib/enum/tcp-request-message.ts`

### Multi-Tenant Data Isolation

Every DB query MUST include `tenant_id` filter. `TenantMiddleware` resolves and injects it.
TypeORM: always add `WHERE tenant_id = :tenantId` parameter.
Mongoose: always add `{ tenant_id: tenantId }` to queries.

### Response Wrapper

All HTTP responses are wrapped by `ExceptionInterceptor`:

```json
{ "data": ..., "message": "...", "statusCode": 200, "duration": "12ms", "processID": "..." }
```

### Auth Flow

Keycloak (OAuth2/OIDC) → JWT in Authorization header → BFF UserGuard → gRPC to Authorizer → Redis cache (30min TTL)

### Frontend RBAC vs BFF permissions (`management-app`)

- **BFF:** Source of truth — mỗi endpoint dùng `PermissionGuard` + `@Permissions([...])` theo matrix (`docs/architecture/permission-matrix.md` §6).
- **Management App (Phase 2.x):** **Điều hướng + sidebar theo role** (prefix route + filter nav), đồng bộ với `role-routing.ts`. Đây là lớp **thô** (UX), không thay thế kiểm tra permission trên API.
- **Mock UI Step 2.2:** Đã có trong `apps/customer-pwa` và `apps/management-app` (`src/mocks/`, fake realtime); Phase 2A Step 2.5 sẽ thay mock bằng API + WS/polling thật.
- **Tech debt (sau):** có thể map từng control UI ↔ `session.user.permissions` khi cần phân quyền trong cùng một màn hình. Chi tiết & nguyên tắc đồng bộ: `docs/architecture/permission-matrix.md` §9.

## Service Ports Quick Reference

- BFF: HTTP 3000
- Authorizer: HTTP 3004, TCP 3104, gRPC 5100
- User-Access: HTTP 3003, TCP 3103, gRPC 5200
- Product: HTTP 3302, TCP 3202
- Invoice: HTTP 3301, TCP 3201
- Catalog: HTTP 3005, TCP 3205
- SaaS: HTTP 3006, TCP 3206

## Development Commands

```bash
npx nx serve <service>        # Single service
pnpm dev:bff-auth             # BFF + Authorizer
pnpm dev:bff-product          # BFF + Product
npx nx test <project>         # Unit tests
npx nx lint <project> --fix   # Lint fix
```

## When to Use Which Agent

- Adding/modifying NestJS service → `nestjs-microservice-expert`
- Frontend UI/UX changes → `frontend-specialist`
- Database schema changes → `database-architect`
- CI/CD or Docker issues → `devops-engineer`
- Tracking down bugs → `debugger`
- Writing tests → `test-engineer`
- Code quality / refactoring → `code-quality-auditor`
- PR / diff review → `code-reviewer` (global)

## Recommended Workflows

### Feature Development

```
/plan Add [feature] to [service]
→ Review plan → Proceed
→ Use the nestjs-microservice-expert to implement
→ Use the test-engineer to write tests
→ /review
→ Commit with conventional commit message
```

### Code Quality Audit

```
Use the code-quality-auditor to audit apps/[service]/src/
→ Review findings
→ Proceed with fixes
→ npx nx lint [service] --fix && npx nx test [service]
```

### Debugging

```
Use the debugger agent to investigate [symptom] in [service]
```

### New Microservice

```
/plan Scaffold new [name] microservice
→ Use the nestjs-microservice-expert to implement following the plan
→ Use the devops-engineer to add Docker config if needed
```

### Onboarding / Understanding Code

```
How does [feature/flow] work in this codebase?
Explain the auth flow from frontend to Keycloak
What's the pattern for adding a new TCP endpoint?
```

<skills_system priority="1">

## Available Skills

<!-- SKILLS_TABLE_START -->
<usage>
When users ask you to perform tasks, check if any of the available skills below can help complete the task more effectively. Skills provide specialized capabilities and domain knowledge.

How to use skills:

- Invoke: `npx openskills read <skill-name>` (run in your shell)
  - For multiple: `npx openskills read skill-one,skill-two`
- The skill content will load with detailed instructions on how to complete the task
- Base directory provided in output for resolving bundled resources (references/, scripts/, assets/)

Usage notes:

- Only use skills listed in <available_skills> below
- Do not invoke a skill that is already loaded in your context
- Each skill invocation is stateless
  </usage>

<available_skills>

<skill>
<name>brainstorming</name>
<description>Socratic questioning protocol + user communication. MANDATORY for complex requests, new features, or unclear requirements. Includes progress reporting and error handling.</description>
<location>project</location>
</skill>

<skill>
<name>clean-code</name>
<description>Pragmatic coding standards - concise, direct, no over-engineering, no unnecessary comments</description>
<location>project</location>
</skill>

<skill>
<name>code-review-checklist</name>
<description>Code review guidelines covering code quality, security, and best practices.</description>
<location>project</location>
</skill>

<skill>
<name>database-design</name>
<description>Database design principles and decision-making. Schema design, indexing strategy, ORM selection, serverless databases.</description>
<location>project</location>
</skill>

<skill>
<name>deployment-procedures</name>
<description>Production deployment principles and decision-making. Safe deployment workflows, rollback strategies, and verification. Teaches thinking, not scripts.</description>
<location>project</location>
</skill>

<skill>
<name>documentation-templates</name>
<description>Documentation templates and structure guidelines. README, API docs, code comments, and AI-friendly documentation.</description>
<location>project</location>
</skill>

<skill>
<name>frontend-design</name>
<description>Design thinking and decision-making for web UI. Use when designing components, layouts, color schemes, typography, or creating aesthetic interfaces. Teaches principles, not fixed values.</description>
<location>project</location>
</skill>

<skill>
<name>frontend-patterns</name>
<description>Frontend development patterns for React, Next.js, state management, performance optimization, and UI best practices.</description>
<location>project</location>
</skill>

<skill>
<name>game-development</name>
<description>Game development orchestrator. Routes to platform-specific skills based on project needs.</description>
<location>project</location>
</skill>

<skill>
<name>geo-fundamentals</name>
<description>Generative Engine Optimization for AI search engines (ChatGPT, Claude, Perplexity).</description>
<location>project</location>
</skill>

<skill>
<name>i18n-localization</name>
<description>Internationalization and localization patterns. Detecting hardcoded strings, managing translations, locale files, RTL support.</description>
<location>project</location>
</skill>

<skill>
<name>intelligent-routing</name>
<description>Automatic agent selection and intelligent task routing. Analyzes user requests and automatically selects the best specialist agent(s) without requiring explicit user mentions.</description>
<location>project</location>
</skill>

<skill>
<name>lint-and-validate</name>
<description>Automatic quality control, linting, and static analysis procedures. Use after every code modification to ensure syntax correctness and project standards. Triggers onKeywords: lint, format, check, validate, types, static analysis.</description>
<location>project</location>
</skill>

<skill>
<name>mcp-builder</name>
<description>MCP (Model Context Protocol) server building principles. Tool design, resource patterns, best practices.</description>
<location>project</location>
</skill>

<skill>
<name>mobile-design</name>
<description>Mobile-first design thinking and decision-making for iOS and Android apps. Touch interaction, performance patterns, platform conventions. Teaches principles, not fixed values. Use when building React Native, Flutter, or native mobile apps.</description>
<location>project</location>
</skill>

<skill>
<name>nextjs-react-expert</name>
<description>React and Next.js performance optimization from Vercel Engineering. Use when building React components, optimizing performance, eliminating waterfalls, reducing bundle size, reviewing code for performance issues, or implementing server/client-side optimizations.</description>
<location>project</location>
</skill>

<skill>
<name>nodejs-best-practices</name>
<description>Node.js development principles and decision-making. Framework selection, async patterns, security, and architecture. Teaches thinking, not copying.</description>
<location>project</location>
</skill>

<skill>
<name>parallel-agents</name>
<description>Multi-agent orchestration patterns. Use when multiple independent tasks can run with different domain expertise or when comprehensive analysis requires multiple perspectives.</description>
<location>project</location>
</skill>

<skill>
<name>performance-profiling</name>
<description>Performance profiling principles. Measurement, analysis, and optimization techniques.</description>
<location>project</location>
</skill>

<skill>
<name>plan-writing</name>
<description>Structured task planning with clear breakdowns, dependencies, and verification criteria. Use when implementing features, refactoring, or any multi-step work.</description>
<location>project</location>
</skill>

<skill>
<name>shadcn</name>
<description>Manages shadcn components and projects — adding, searching, fixing, debugging, styling, and composing UI. Provides project context, component docs, and usage examples. Applies when working with shadcn/ui, component registries, presets, --preset codes, or any project with a components.json file. Also triggers for "shadcn init", "create an app with --preset", or "switch to --preset".</description>
<location>project</location>
</skill>

<skill>
<name>shadcn-component-discovery</name>
<description>Discover existing shadcn components from registries before building custom. Use PROACTIVELY when about to build any UI component, page section, or layout. Use when user explicitly asks to find/search components. Searches 1,500+ components across official and community registries including @shadcn, @blocks, @reui, @animate-ui, @diceui, Magic UI, and 30+ specialty registries. Provides install commands and code examples. Works best with shadcn MCP configured, but provides manual guidance without it.</description>
<location>project</location>
</skill>

<skill>
<name>shadcn-component-review</name>
<description>Review custom components and layouts against shadcn design patterns, theme styles (Maia, Vega, Lyra, Nova, Mira), component structure, composability, and Radix UI best practices. Use when planning new components, reviewing existing components, auditing spacing, checking component structure, or verifying shadcn best practices alignment.</description>
<location>project</location>
</skill>

<skill>
<name>systematic-debugging</name>
<description>4-phase systematic debugging methodology with root cause analysis and evidence-based verification. Use when debugging complex issues.</description>
<location>project</location>
</skill>

<skill>
<name>tailwind-patterns</name>
<description>Tailwind CSS v4 principles. CSS-first configuration, container queries, modern patterns, design token architecture.</description>
<location>project</location>
</skill>

<skill>
<name>dispatching-parallel-agents</name>
<description>Use when facing 2+ independent tasks that can be worked on without shared state or sequential dependencies</description>
<location>global</location>
</skill>

<skill>
<name>executing-plans</name>
<description>Use when you have a written implementation plan to execute in a separate session with review checkpoints</description>
<location>global</location>
</skill>

<skill>
<name>finishing-a-development-branch</name>
<description>Use when implementation is complete, all tests pass, and you need to decide how to integrate the work - guides completion of development work by presenting structured options for merge, PR, or cleanup</description>
<location>global</location>
</skill>

<skill>
<name>receiving-code-review</name>
<description>Use when receiving code review feedback, before implementing suggestions, especially if feedback seems unclear or technically questionable - requires technical rigor and verification, not performative agreement or blind implementation</description>
<location>global</location>
</skill>

<skill>
<name>requesting-code-review</name>
<description>Use when completing tasks, implementing major features, or before merging to verify work meets requirements</description>
<location>global</location>
</skill>

<skill>
<name>subagent-driven-development</name>
<description>Use when executing implementation plans with independent tasks in the current session</description>
<location>global</location>
</skill>

<skill>
<name>test-driven-development</name>
<description>Use when implementing any feature or bugfix, before writing implementation code</description>
<location>global</location>
</skill>

<skill>
<name>using-git-worktrees</name>
<description>Use when starting feature work that needs isolation from current workspace or before executing implementation plans - creates isolated git worktrees with smart directory selection and safety verification</description>
<location>global</location>
</skill>

<skill>
<name>using-superpowers</name>
<description>Use when starting any conversation - establishes how to find and use skills, requiring Skill tool invocation before ANY response including clarifying questions</description>
<location>global</location>
</skill>

<skill>
<name>verification-before-completion</name>
<description>Use when about to claim work is complete, fixed, or passing, before committing or creating PRs - requires running verification commands and confirming output before making any success claims; evidence before assertions always</description>
<location>global</location>
</skill>

<skill>
<name>writing-plans</name>
<description>Use when you have a spec or requirements for a multi-step task, before touching code</description>
<location>global</location>
</skill>

<skill>
<name>writing-skills</name>
<description>Use when creating new skills, editing existing skills, or verifying skills work before deployment</description>
<location>global</location>
</skill>

</available_skills>

<!-- SKILLS_TABLE_END -->

</skills_system>
