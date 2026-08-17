"""Scenario Simulator boundary. Rule engine arrives in a later phase."""
from app.modules.scenarios.engine import simulate_scenario
from app.modules.scenarios.router import router

__all__ = ["router", "simulate_scenario"]
