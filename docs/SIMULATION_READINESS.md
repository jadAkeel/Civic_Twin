# CityMind Tripoli Advanced Simulation Readiness

Phase 15 prepares interfaces for advanced engines without requiring SUMO, MATSim, or A/B Street to be installed.

## Adapter Interfaces

- `SumoAdapterPlaceholder` prepares a future SUMO job and returns `not_configured`.
- `MatsimAdapterPlaceholder` prepares a future MATSim job and returns `not_configured`.
- Both share the `SimulationAdapter` protocol shape: `prepare(scenario_id)` and `run(job)`.
- `GET /scenarios/engines` exposes the honest runtime status for the internal rules engine, SUMO, and MATSim.

## Future Integration Notes

- SUMO: candidate for traffic flow, signal timing, and congestion scenarios.
- MATSim: candidate for agent-based travel behavior and policy simulations.
- A/B Street-inspired planning: useful for lightweight street-space tradeoff review before heavy simulation.

## Current Simulator

The current app runs Scenario Simulator v2 without external engine binaries. It
uses neighborhood green, air, waste, walkability, heat, and open-report
baselines; applies documented action interactions; and returns budget status,
before/after projections, and uncertainty ranges. Municipality roles are
required, and production results are stored in PostgreSQL.

It remains a transparent planning model with
`official_decision_ready=false`. Its coefficients are not a substitute for
SUMO/MATSim, engineering analysis, or calibration against measured projects.

## Next Integration Steps

- Add durable `simulation_jobs` persistence.
- Replace demo baselines and calibrate coefficients with authoritative data.
- Define input export from CityMind mobility edges to each engine.
- Add engine-specific result importers.
- Add asynchronous job execution and status polling.
