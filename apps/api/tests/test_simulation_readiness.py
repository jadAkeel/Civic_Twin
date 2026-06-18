from app.modules.simulation import MatsimAdapterPlaceholder, SumoAdapterPlaceholder


def test_sumo_placeholder_does_not_require_installed_engine() -> None:
    adapter = SumoAdapterPlaceholder()

    job = adapter.prepare("scenario-1")
    result = adapter.run(job)

    assert job.engine == "SUMO"
    assert result.status == "not_configured"
    assert "not required" in str(result.summary["message"])


def test_matsim_placeholder_does_not_require_installed_engine() -> None:
    adapter = MatsimAdapterPlaceholder()

    job = adapter.prepare("scenario-1")
    result = adapter.run(job)

    assert job.engine == "MATSim"
    assert result.status == "not_configured"
    assert "not required" in str(result.summary["message"])
