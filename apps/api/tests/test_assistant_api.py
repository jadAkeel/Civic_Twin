from fastapi.testclient import TestClient

from app.main import app
from app.modules.assistant.router import reset_assistant_queries_for_tests
from app.modules.auth.router import reset_user_store_for_tests


def _admin_headers(client: TestClient) -> dict[str, str]:
    reset_user_store_for_tests()
    response = client.post(
        "/auth/login?include_token=true",
        json={"email": "admin.demo@citymind.local", "password": "admin-demo"},
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def _authenticated_client() -> TestClient:
    reset_user_store_for_tests()
    client = TestClient(app)
    response = client.post(
        "/auth/login",
        json={"email": "citizen.demo@citymind.local", "password": "citizen-demo"},
    )
    assert response.status_code == 200
    client.headers["X-CSRF-Token"] = response.json()["csrf_token"]
    return client


def test_assistant_answers_known_question_from_grounded_city_data() -> None:
    reset_assistant_queries_for_tests()
    client = _authenticated_client()

    response = client.post("/assistant/query", json={"question": "Which Tripoli neighborhood needs trees first?"})

    assert response.status_code == 201
    payload = response.json()
    assert "غطاء أخضر" in payload["answer"]
    assert payload["provider"] == "local_grounded_rag"
    assert payload["data_sources_json"]["tables"] == ["green_metrics", "neighborhoods"]
    assert payload["data_sources_json"]["grounded"] is True
    assert payload["data_sources_json"]["citations"][0]["source"] == "memory_snapshot"
    assert 0 < payload["confidence_score"] <= 0.92


def test_assistant_retrieves_an_arabic_walkability_question() -> None:
    client = _authenticated_client()

    response = client.post("/assistant/query", json={"question": "أين قابلية المشي هي الأضعف؟"})

    assert response.status_code == 201
    payload = response.json()
    assert "قابلية المشي" in payload["answer"]
    assert payload["data_sources_json"]["grounded"] is True
    assert "walkability_metrics" in payload["data_sources_json"]["tables"]


def test_assistant_retrieves_arabic_open_reports_question() -> None:
    client = _authenticated_client()

    response = client.post("/assistant/query", json={"question": "ما البلاغات التي لم تُحل بعد؟"})

    assert response.status_code == 201
    payload = response.json()
    assert "بلاغًا غير محلول" in payload["answer"]
    assert payload["data_sources_json"]["tables"] == ["issue_reports"]
    assert payload["data_sources_json"]["grounded"] is True


def test_assistant_rejects_whitespace_only_question() -> None:
    client = _authenticated_client()

    response = client.post("/assistant/query", json={"question": "    "})

    assert response.status_code == 422


def test_assistant_refuses_unavailable_city_fact() -> None:
    client = _authenticated_client()

    response = client.post("/assistant/query", json={"question": "What is tomorrow's official tax policy?"})

    assert response.status_code == 201
    payload = response.json()
    assert payload["answer"].startswith("غير متاح في بيانات CityMind Tripoli الحالية")
    assert payload["confidence_score"] == 0
    assert payload["data_sources_json"]["grounded"] is False
    assert payload["data_sources_json"]["citations"] == []


def test_assistant_query_history_requires_municipality_access() -> None:
    reset_assistant_queries_for_tests()
    client = _authenticated_client()
    client.post("/assistant/query", json={"question": "Which reports are unresolved?"})

    unauthorized = client.get("/assistant/queries")
    authorized = client.get("/assistant/queries", headers=_admin_headers(client))

    assert unauthorized.status_code == 403
    assert authorized.status_code == 200
    assert len(authorized.json()) == 1
    assert "unresolved" in authorized.json()[0]["question"].lower()
