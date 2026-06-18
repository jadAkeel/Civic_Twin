# CityMind Tripoli Microservices Extraction Readiness

CityMind remains a modular monolith. This plan defines future service boundaries without splitting deployment in Phase 14.

## Candidate Services

- Reporting: owns citizen issue intake and report status workflow.
- City Model: owns neighborhoods, assets, green metrics, and walkability metrics.
- Analytics: owns dashboard read models and municipal KPIs.
- Routing: owns mobility edges and future routing-provider adapters.
- Scenario: owns scenario actions and simulation results.
- Prediction: owns rule-based risk signals and future model evidence.
- Assistant: owns grounded city questions and AI query audit history.

## Extraction Rules

- Keep Tripoli demo data contracts stable before any extraction.
- Move from in-memory prototype stores to durable database writes first.
- Publish events from reporting, city-model, scenario, and prediction boundaries before async services are split.
- Keep evidence JSON required for predictions and assistant responses.
- Do not introduce external routing or ML services until the boundary contracts are covered by tests.

## Current Interfaces

The API exposes service contracts in `apps/api/app/contracts/service_contracts.py` and a registry in `apps/api/app/services/registry.py`.

## Deferred Work

- Dedicated package per service.
- Message bus and event schemas.
- Per-service Dockerfiles and deployment manifests.
- Contract tests across service boundaries.
