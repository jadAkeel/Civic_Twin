"""Walkability boundary. Scoring logic arrives in a later phase."""
from app.modules.walkability.calculator import calculate_walkability_score
from app.modules.walkability.router import router

__all__ = ["calculate_walkability_score", "router"]
