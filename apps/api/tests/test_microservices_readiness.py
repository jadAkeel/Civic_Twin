from app.services import get_service_contract, list_service_contracts


def test_service_contracts_cover_future_extraction_boundaries() -> None:
    contracts = list_service_contracts()
    names = {contract.name for contract in contracts}

    assert names == {
        "reporting",
        "city_model",
        "analytics",
        "routing",
        "scenario",
        "prediction",
        "assistant",
    }
    assert all(contract.public_endpoints for contract in contracts)
    assert all(contract.extraction_notes for contract in contracts)


def test_reporting_contract_keeps_modular_monolith_boundary_explicit() -> None:
    contract = get_service_contract("reporting")

    assert "issue_reports" in contract.owns
    assert "/reports" in contract.public_endpoints
    assert "Extract after" in contract.extraction_notes
