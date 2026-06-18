from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class SimulationJob:
    id: str
    engine: str
    scenario_id: str
    status: str = "planned"


@dataclass(frozen=True)
class SimulationAdapterResult:
    job_id: str
    engine: str
    status: str
    summary: dict[str, float | str]


class SimulationAdapter(Protocol):
    engine_name: str

    def prepare(self, scenario_id: str) -> SimulationJob:
        ...

    def run(self, job: SimulationJob) -> SimulationAdapterResult:
        ...


class SumoAdapterPlaceholder:
    engine_name = "SUMO"

    def prepare(self, scenario_id: str) -> SimulationJob:
        return SimulationJob(id=f"sumo:{scenario_id}", engine=self.engine_name, scenario_id=scenario_id)

    def run(self, job: SimulationJob) -> SimulationAdapterResult:
        return SimulationAdapterResult(
            job_id=job.id,
            engine=self.engine_name,
            status="not_configured",
            summary={"message": "SUMO is not required or installed in Phase 15."},
        )


class MatsimAdapterPlaceholder:
    engine_name = "MATSim"

    def prepare(self, scenario_id: str) -> SimulationJob:
        return SimulationJob(id=f"matsim:{scenario_id}", engine=self.engine_name, scenario_id=scenario_id)

    def run(self, job: SimulationJob) -> SimulationAdapterResult:
        return SimulationAdapterResult(
            job_id=job.id,
            engine=self.engine_name,
            status="not_configured",
            summary={"message": "MATSim is not required or installed in Phase 15."},
        )
