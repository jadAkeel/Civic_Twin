from fastapi.testclient import TestClient

from app.main import app
from app.modules.assistant.router import reset_assistant_queries_for_tests


def test_assistant_answers_known_question_from_city_data() -> None:
    reset_assistant_queries_for_tests()
    client = TestClient(app)

    response = client.post("/assistant/query", json={"question": "Which Tripoli neighborhood needs trees first?"})

    assert response.status_code == 201
    payload = response.json()
    assert "green coverage" in payload["answer"]
    assert payload["provider"] == "mock_city_data"
    assert payload["data_sources_json"]["tables"] == ["green_metrics", "neighborhoods"]


def test_assistant_refuses_unavailable_city_fact() -> None:
    client = TestClient(app)

    response = client.post("/assistant/query", json={"question": "What is tomorrow's official tax policy?"})

    assert response.status_code == 201
    payload = response.json()
    assert payload["answer"].startswith("Unavailable in CityMind Tripoli demo data")
    assert payload["confidence_score"] == 0


def test_assistant_query_history_is_stored() -> None:
    reset_assistant_queries_for_tests()
    client = TestClient(app)

    client.post("/assistant/query", json={"question": "Which reports are unresolved?"})
    history = client.get("/assistant/queries").json()

    assert len(history) == 1
    assert "unresolved" in history[0]["question"].lower()
