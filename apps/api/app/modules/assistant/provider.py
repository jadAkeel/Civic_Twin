from __future__ import annotations

from abc import ABC, abstractmethod
from collections import Counter
from typing import Any


class AssistantProvider(ABC):
    @abstractmethod
    def answer(self, question: str, seed: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError


class MockCityDataProvider(AssistantProvider):
    def answer(self, question: str, seed: dict[str, Any]) -> dict[str, Any]:
        normalized = question.lower()
        neighborhoods = {item["slug"]: item for item in seed["neighborhoods"]}

        if "tree" in normalized or "green coverage" in normalized:
            metric = min(seed["green_metrics"], key=lambda item: item["green_coverage_score"])
            area = neighborhoods[metric["neighborhood_slug"]]["name"]
            return {
                "answer": f"{area} has the weakest green coverage in the demo data and should be reviewed first for tree planting.",
                "sources": {"tables": ["green_metrics", "neighborhoods"], "neighborhood_slug": metric["neighborhood_slug"]},
                "confidence_score": 0.76,
            }

        if "unresolved" in normalized or "open report" in normalized:
            open_reports = [report for report in seed["issue_reports"] if report["status"] in {"submitted", "validated", "in_progress"}]
            by_status = Counter(report["status"] for report in open_reports)
            return {
                "answer": f"The demo data has {len(open_reports)} unresolved reports: {dict(by_status)}.",
                "sources": {"tables": ["issue_reports"], "statuses": dict(by_status)},
                "confidence_score": 0.82,
            }

        if "walkability" in normalized and ("weakest" in normalized or "lowest" in normalized):
            metric = min(seed["walkability_metrics"], key=lambda item: item["overall_walkability_score"])
            area = neighborhoods[metric["neighborhood_slug"]]["name"]
            return {
                "answer": f"{area} has the weakest walkability baseline in the demo data at {metric['overall_walkability_score']}/100.",
                "sources": {"tables": ["walkability_metrics", "neighborhoods"], "neighborhood_slug": metric["neighborhood_slug"]},
                "confidence_score": 0.8,
            }

        if "bab al tebbaneh" in normalized and ("intervention" in normalized or "improve" in normalized):
            return {
                "answer": "For Bab Al Tebbaneh, the demo data supports combining waste collection improvement with tree planting.",
                "sources": {"tables": ["issue_reports", "green_metrics", "scenarios"], "neighborhood_slug": "bab-al-tebbaneh"},
                "confidence_score": 0.74,
            }

        return {
            "answer": "Unavailable in CityMind Tripoli demo data. I can only answer from loaded reports, metrics, scenarios, mobility edges, and predictions.",
            "sources": {"available_tables": ["issue_reports", "green_metrics", "walkability_metrics", "scenarios", "mobility_edges", "predictions"]},
            "confidence_score": 0.0,
        }
