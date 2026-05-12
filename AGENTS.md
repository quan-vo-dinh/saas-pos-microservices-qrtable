# QRTable — [AGENTS.md](http://AGENTS.md)

Ngữ cảnh chính cho agent về nền tảng SaaS đặt món nhà hàng qua mã QR QRTable.

> ⚠️ **TIÊU CHUẨN MỤC TIÊU — KHÔNG PHẢI TRẠNG THÁI HIỆN TẠI**
> Tài liệu này mô tả **cách codebase nên được xây dựng**, không nhất thiết phản ánh trạng thái hiện tại.
> Dự án đang được cải tiến tích cực. Luôn áp dụng các mẫu dưới đây khi sinh mã mới hoặc refactor — kể cả khi mã xung quanh chưa tuân theo.
> **Không sao chép mù quáng mẫu mã hiện có** — hãy đối chiếu với các tiêu chuẩn này trước.

## Bản sắc dự án

Monorepo Nx với backend NestJS dạng microservice + frontend React/Next.js. Kiến trúc SaaS đa tenant.

Khi người dùng yêu cầu thực hiện việc, kiểm tra xem các kỹ năng có sẵn bên dưới có giúp hoàn thành hiệu quả hơn không. Kỹ năng cung cấp năng lực chuyên biệt và kiến thức miền.

Cách dùng kỹ năng:

- Gọi: `npx openskills read <skill-name>` (chạy trong shell)
  - Nhiều skill: `npx openskills read skill-one,skill-two`
- Nội dung skill sẽ tải kèm hướng dẫn chi tiết để hoàn thành tác vụ
- Thư mục gốc trong output dùng để resolve tài nguyên đính kèm (references/, scripts/, assets/)

Lưu ý:

- Chỉ dùng các skill liệt kê trong bên dưới
- Không gọi lại skill đã có trong ngữ cảnh hiện tại
- Mỗi lần gọi skill là độc lập (stateless)

brainstormingSocratic questioning protocol + user communication. MANDATORY for complex requests, new features, or unclear requirements. Includes progress reporting and error handling.project

clean-codePragmatic coding standards - concise, direct, no over-engineering, no unnecessary commentsproject

code-review-checklistCode review guidelines covering code quality, security, and best practices.project

database-designDatabase design principles and decision-making. Schema design, indexing strategy, ORM selection, serverless databases.project

deployment-proceduresProduction deployment principles and decision-making. Safe deployment workflows, rollback strategies, and verification. Teaches thinking, not scripts.project

documentation-templatesDocumentation templates and structure guidelines. README, API docs, code comments, and AI-friendly documentation.project

frontend-designDesign thinking and decision-making for web UI. Use when designing components, layouts, color schemes, typography, or creating aesthetic interfaces. Teaches principles, not fixed values.project

frontend-patternsFrontend development patterns for React, Next.js, state management, performance optimization, and UI best practices.project

game-developmentGame development orchestrator. Routes to platform-specific skills based on project needs.project

geo-fundamentalsGenerative Engine Optimization for AI search engines (ChatGPT, Claude, Perplexity).project

i18n-localizationInternationalization and localization patterns. Detecting hardcoded strings, managing translations, locale files, RTL support.project

intelligent-routingAutomatic agent selection and intelligent task routing. Analyzes user requests and automatically selects the best specialist agent(s) without requiring explicit user mentions.project

lint-and-validateAutomatic quality control, linting, and static analysis procedures. Use after every code modification to ensure syntax correctness and project standards. Triggers onKeywords: lint, format, check, validate, types, static analysis.project

mcp-builderMCP (Model Context Protocol) server building principles. Tool design, resource patterns, best practices.project

mobile-designMobile-first design thinking and decision-making for iOS and Android apps. Touch interaction, performance patterns, platform conventions. Teaches principles, not fixed values. Use when building React Native, Flutter, or native mobile apps.project

nextjs-react-expertReact and Next.js performance optimization from Vercel Engineering. Use when building React components, optimizing performance, eliminating waterfalls, reducing bundle size, reviewing code for performance issues, or implementing server/client-side optimizations.project

nodejs-best-practicesNode.js development principles and decision-making. Framework selection, async patterns, security, and architecture. Teaches thinking, not copying.project

parallel-agentsMulti-agent orchestration patterns. Use when multiple independent tasks can run with different domain expertise or when comprehensive analysis requires multiple perspectives.project

performance-profilingPerformance profiling principles. Measurement, analysis, and optimization techniques.project

plan-writingStructured task planning with clear breakdowns, dependencies, and verification criteria. Use when implementing features, refactoring, or any multi-step work.project

shadcnManages shadcn components and projects — adding, searching, fixing, debugging, styling, and composing UI. Provides project context, component docs, and usage examples. Applies when working with shadcn/ui, component registries, presets, --preset codes, or any project with a components.json file. Also triggers for "shadcn init", "create an app with --preset", or "switch to --preset".project

shadcn-component-discoveryDiscover existing shadcn components from registries before building custom. Use PROACTIVELY when about to build any UI component, page section, or layout. Use when user explicitly asks to find/search components. Searches 1,500+ components across official and community registries including @shadcn, @blocks, @reui, @animate-ui, @diceui, Magic UI, and 30+ specialty registries. Provides install commands and code examples. Works best with shadcn MCP configured, but provides manual guidance without it.project

shadcn-component-reviewReview custom components and layouts against shadcn design patterns, theme styles (Maia, Vega, Lyra, Nova, Mira), component structure, composability, and Radix UI best practices. Use when planning new components, reviewing existing components, auditing spacing, checking component structure, or verifying shadcn best practices alignment.project

systematic-debugging4-phase systematic debugging methodology with root cause analysis and evidence-based verification. Use when debugging complex issues.project

tailwind-patternsTailwind CSS v4 principles. CSS-first configuration, container queries, modern patterns, design token architecture.project

dispatching-parallel-agentsUse when facing 2+ independent tasks that can be worked on without shared state or sequential dependenciesglobal

executing-plansUse when you have a written implementation plan to execute in a separate session with review checkpointsglobal

finishing-a-development-branchUse when implementation is complete, all tests pass, and you need to decide how to integrate the work - guides completion of development work by presenting structured options for merge, PR, or cleanupglobal

receiving-code-reviewUse when receiving code review feedback, before implementing suggestions, especially if feedback seems unclear or technically questionable - requires technical rigor and verification, not performative agreement or blind implementationglobal

requesting-code-reviewUse when completing tasks, implementing major features, or before merging to verify work meets requirementsglobal

subagent-driven-developmentUse when executing implementation plans with independent tasks in the current sessionglobal

test-driven-developmentUse when implementing any feature or bugfix, before writing implementation codeglobal

using-git-worktreesUse when starting feature work that needs isolation from current workspace or before executing implementation plans - creates isolated git worktrees with smart directory selection and safety verificationglobal

using-superpowersUse when starting any conversation - establishes how to find and use skills, requiring Skill tool invocation before ANY response including clarifying questionsglobal

verification-before-completionUse when about to claim work is complete, fixed, or passing, before committing or creating PRs - requires running verification commands and confirming output before making any success claims; evidence before assertions alwaysglobal

writing-plansUse when you have a spec or requirements for a multi-step task, before touching codeglobal

writing-skillsUse when creating new skills, editing existing skills, or verifying skills work before deploymentglobal
