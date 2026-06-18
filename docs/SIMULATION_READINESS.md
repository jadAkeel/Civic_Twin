# CityMind Tripoli Advanced Simulation Readiness

Phase 15 prepares interfaces for advanced engines without requiring SUMO, MATSim, or A/B Street to be installed.

## Adapter Interfaces

- `SumoAdapterPlaceholder` prepares a future SUMO job and returns `not_configured`.
- `MatsimAdapterPlaceholder` prepares a future MATSim job and returns `not_configured`.
- Both share the `SimulationAdapter` protocol shape: `prepare(scenario_id)` and `run(job)`.

## Future Integration Notes

- SUMO: candidate for traffic flow, signal timing, and congestion scenarios.
- MATSim: candidate for agent-based travel behavior and policy simulations.
- A/B Street-inspired planning: useful for lightweight street-space tradeoff review before heavy simulation.

## Current Constraint

The current app must run without simulation engine binaries. Phase 10 remains the active rule-based scenario simulator.

## Next Integration Steps

- Add durable `simulation_jobs` persistence.
- Define input export from CityMind mobility edges to each engine.
- Add engine-specific result importers.
- Add asynchronous job execution and status polling.
