from __future__ import annotations

from app.contracts import SERVICE_CONTRACTS, ServiceContract, ServiceName


def list_service_contracts() -> list[ServiceContract]:
    return SERVICE_CONTRACTS


def get_service_contract(name: ServiceName) -> ServiceContract:
    return next(contract for contract in SERVICE_CONTRACTS if contract.name == name)
