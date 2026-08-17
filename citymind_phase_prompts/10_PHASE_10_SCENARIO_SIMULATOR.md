# Phase 10 - Urban Scenario Simulator

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
Implement rule-based Urban Scenario Simulator.

BUILD SCOPE:
- Actions: ADD_TREES, ADD_BIKE_LANE, ADD_PARK, ADD_BUS_STOP, IMPROVE_WASTE_COLLECTION, PEDESTRIANIZE_STREET, CHANGE_TRAFFIC_FLOW, IMPROVE_SIDEWALKS, IMPROVE_LIGHTING.
- Outputs: green_score_delta, temperature_delta, air_quality_delta, walkability_delta, traffic_delta, pollution_delta, estimated_cost, implementation_time_days, risk_level, confidence_score, recommendation.
- Before/after UI.
- Persist ScenarioResult.

LOCKED PATHS:
- apps/api/app/modules/scenarios/**
- apps/web/app/simulator/**
- apps/web/features/scenarios/**
- apps/api/tests/**
- packages/shared/**

FORBIDDEN:
- No SUMO/MATSim integration yet.

VALIDATION:
- scenario engine tests
- frontend build

