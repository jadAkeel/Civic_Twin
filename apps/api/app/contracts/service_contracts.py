from __future__ import annotations

from typing import Literal

from pydantic import BaseModel

ServiceName = Literal[
    "reporting",
    "city_model",
    "analytics",
    "routing",
    "scenario",
    "prediction",
    "assistant",
]


class ServiceContract(BaseModel):
    name: ServiceName
    owns: list[str]
    consumes: list[str]
    public_endpoints: list[str]
    extraction_notes: str


SERVICE_CONTRACTS: list[ServiceContract] = [
    ServiceContract(
        name="reporting",
        owns=["issue_reports"],
        consumes=["neighborhoods", "users"],
        public_endpoints=["/reports", "/admin/reports"],
        extraction_notes="Extract after durable report storage and event publishing are introduced.",
    ),
    ServiceContract(
        name="city_model",
        owns=["neighborhoods", "city_assets", "green_metrics", "walkability_metrics"],
        consumes=[],
        public_endpoints=["/green-score/neighborhoods", "/walkability/neighborhoods", "/admin/assets"],
        extraction_notes="Keep as the canonical Tripoli spatial and asset data owner.",
    ),
    ServiceContract(
        name="analytics",
        owns=["dashboard aggregates"],
        consumes=["issue_reports", "city_assets", "predictions"],
        public_endpoints=["/dashboard/summary"],
        extraction_notes="Extract once read-model refresh jobs replace synchronous seed aggregation.",
    ),
    ServiceContract(
        name="routing",
        owns=["mobility_edges"],
        consumes=["neighborhoods"],
        public_endpoints=["/mobility/routes", "/mobility/edges"],
        extraction_notes="Future adapters can wrap OpenTripPlanner, GraphHopper, or Valhalla.",
    ),
    ServiceContract(
        name="scenario",
        owns=["scenarios", "scenario_actions", "scenario_results"],
        consumes=["green_metrics", "walkability_metrics", "issue_reports", "mobility_edges"],
        public_endpoints=["/scenarios/actions", "/scenarios", "/scenarios/simulate", "/scenarios/results"],
        extraction_notes="Scenario reads and writes require municipality roles; production result writes use PostgreSQL.",
    ),
    ServiceContract(
        name="prediction",
        owns=["predictions"],
        consumes=["issue_reports", "green_metrics", "walkability_metrics"],
        public_endpoints=["/predictions"],
        extraction_notes="Keep rule evidence mandatory before any ML pipeline is introduced.",
    ),
    ServiceContract(
        name="assistant",
        owns=["ai_queries"],
        consumes=["approved city read models"],
        public_endpoints=["/assistant/query", "/assistant/queries"],
        extraction_notes="Extract behind a provider interface only after grounding and audit requirements are stable.",
    ),
]
