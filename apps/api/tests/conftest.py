"""Test environment bootstrap.

Runs before any ``app.*`` module is imported so the settings singleton picks these
values up. Demo identities are disabled by default in the application; the suite
opts into them explicitly, which is exactly how a developer machine is expected to
be configured and never how production is configured.
"""

from __future__ import annotations

import os

os.environ.setdefault("ALLOW_DEMO_USERS", "true")
os.environ.setdefault("OPERATIONAL_PERSISTENCE_BACKEND", "memory")
os.environ.setdefault("SCENARIO_PERSISTENCE_BACKEND", "memory")
os.environ.setdefault("RATE_LIMIT_BACKEND", "memory")
os.environ.setdefault("AI_PROVIDER", "local_rag")

import pytest  # noqa: E402

DEMO_CREDENTIALS = {
    "owner": ("owner.demo@citymind.local", "owner-demo"),
    "citizen": ("citizen.demo@citymind.local", "citizen-demo"),
    "municipality_admin": ("admin.demo@citymind.local", "admin-demo"),
    "analyst": ("analyst.demo@citymind.local", "analyst-demo"),
    "police": ("police.demo@citymind.local", "agency-demo"),
    "red_cross": ("redcross.demo@citymind.local", "agency-demo"),
    "civil_defense": ("civildefense.demo@citymind.local", "agency-demo"),
}


@pytest.fixture(autouse=True)
def reset_in_memory_stores() -> None:
    """Give every test a clean in-memory baseline so ordering cannot leak state."""
    from app.modules.admin.router import reset_admin_assets_for_tests
    from app.modules.assistant.router import reset_assistant_queries_for_tests
    from app.modules.auth.router import reset_user_store_for_tests
    from app.modules.reports.router import reset_report_store_for_tests
    from app.modules.scenarios.router import reset_scenario_results_for_tests

    reset_user_store_for_tests()
    reset_report_store_for_tests()
    reset_admin_assets_for_tests()
    reset_assistant_queries_for_tests()
    reset_scenario_results_for_tests()
