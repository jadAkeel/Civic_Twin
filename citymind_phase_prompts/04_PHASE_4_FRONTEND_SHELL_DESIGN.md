# Phase 4 - Frontend Shell and Design System

Use this prompt in Codex App. Codex is the primary orchestrator and must call OpenCode agents directly through MCP.


GLOBAL EXECUTION RULES:
- Codex is the primary orchestrator.
- Do not use OpenCode orchestrator for normal execution.
- Use direct MCP calls to planner/architect/builder/reviewer/tester/debugger.
- No silent fallback.
- Do not modify AGENT.md, PRODUCT.md, ARCHITECTURE.md, TRIPOLI_CITY_KNOWLEDGE.md.
- Stop after this phase. Do not implement the next phase.
- If builder needs files outside the lock, return NEEDS_INTEGRATION.
- After builder: run reviewer and tester.
- If validation fails: run debugger with a narrow lock only on failing files.

STANDARD AGENT FLOW:
1. Run planner/architect/tester/reviewer read-only if useful.
2. Run builder directly with the lock plan.
3. Run reviewer read-only.
4. Run tester read-only/bash tests.
5. Produce phase report.

FINAL PHASE REPORT FORMAT:
1. Phase summary
2. Agents used
3. Files created
4. Files changed
5. Commands executed
6. Validation results
7. Reviewer result
8. Tester result
9. Known limitations
10. Confirmation docs were not modified
11. Next phase recommendation


OBJECTIVE:
Build professional frontend shell and reusable design system.

BUILD SCOPE:
- Layout, sidebar, topbar, cards, panels, tabs, badges, tables, empty states, loaders.
- API client layer.
- Pages shell: dashboard, map, reports, green-score, mobility, simulator, predictions, ask-city, admin.
- Tripoli-specific branding.

LOCKED PATHS:
- apps/web/**
- packages/shared/**
- README.md

FORBIDDEN:
- No backend changes unless NEEDS_INTEGRATION.
- No real map layers yet.

VALIDATION:
- pnpm lint
- pnpm typecheck
- frontend build

