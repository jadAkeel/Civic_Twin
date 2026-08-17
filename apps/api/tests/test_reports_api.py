from fastapi.testclient import TestClient

from app.main import app
from app.modules.auth.router import reset_user_store_for_tests
from app.modules.reports.router import reset_report_store_for_tests


def _client(role: str | None = "citizen") -> TestClient:
    reset_report_store_for_tests()
    reset_user_store_for_tests()
    client = TestClient(app)
    if role is None:
        return client
    credentials = {
        "citizen": ("citizen.demo@citymind.local", "citizen-demo"),
        "municipality_admin": ("admin.demo@citymind.local", "admin-demo"),
    }
    email, password = credentials[role]
    login = client.post("/auth/login", json={"email": email, "password": password})
    assert login.status_code == 200
    client.headers["X-CSRF-Token"] = login.json()["csrf_token"]
    return client


def _valid_payload(**overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "title": "Traffic blocked near El Tal",
        "description": "Cars have been stuck near the crossing for more than twenty minutes.",
        "category": "traffic_congestion",
        "severity": "high",
        "neighborhood_slug": "el-tal",
        "latitude": 34.4378,
        "longitude": 35.837,
        "manual_location": "El Tal crossing",
        "location_source": "gps",
        "image_upload_status": "none",
    }
    payload.update(overrides)
    return payload


def test_reports_list_uses_tripoli_seed_data_with_honest_analysis_status() -> None:
    client = _client("municipality_admin")

    response = client.get("/reports")

    assert response.status_code == 200
    reports = response.json()
    assert len(reports) >= 20
    assert reports[0]["id"].startswith("TRP-")
    assert reports[0]["neighborhood"] in {"باب التبانة", "التل", "الأسواق القديمة"}
    assert reports[0]["analysis_status"] in {"not_configured", "manual_review_required"}
    assert "ai_detected_category" not in reports[0]
    assert "ai_confidence" not in reports[0]


def test_reports_create_valid_traffic_submission_returns_clear_status() -> None:
    client = _client()

    response = client.post("/reports", json=_valid_payload())

    assert response.status_code == 201
    report = response.json()
    assert report["status"] == "submitted"
    assert report["category"] == "traffic_congestion"
    assert report["location_source"] == "gps"
    assert report["image_upload_status"] == "none"
    assert report["analysis_status"] == "not_configured"
    assert "غير مهيأة" in report["image_analysis"]["message"]
    assert report["duplicate_candidates"]
    assert report["duplicate_group_id"].startswith("duplicate:")


def test_reports_create_allows_manual_location_without_coordinates() -> None:
    client = _client()

    response = client.post(
        "/reports",
        json=_valid_payload(
            category="waste",
            latitude=None,
            longitude=None,
            neighborhood_slug=None,
            manual_location="Waste bags outside a building near Al Mina roundabout",
            location_source="manual",
        ),
    )

    assert response.status_code == 201
    report = response.json()
    assert report["category"] == "waste"
    assert report["latitude"] is None
    assert report["longitude"] is None
    assert report["manual_location"] == "Waste bags outside a building near Al Mina roundabout"
    assert report["neighborhood"] == "موقع يدوي في طرابلس"


def test_reports_create_rejects_missing_required_fields() -> None:
    client = _client()

    response = client.post("/reports", json={"category": "waste"})

    assert response.status_code == 422


def test_reports_create_rejects_invalid_category() -> None:
    client = _client()

    response = client.post("/reports", json=_valid_payload(category="garbage"))

    assert response.status_code == 422


def test_reports_create_rejects_invalid_coordinates() -> None:
    client = _client()

    response = client.post("/reports", json=_valid_payload(latitude=33.9, longitude=35.837))

    assert response.status_code == 422


def test_report_status_update_requires_municipality_authentication() -> None:
    client = _client(None)

    unauthenticated = client.patch("/reports/TRP-1001/status", json={"status": "in_progress"})
    agency_login = client.post(
        "/auth/login",
        json={"email": "police.demo@citymind.local", "password": "agency-demo"},
    )
    agency = client.patch(
        "/reports/TRP-1001/status",
        json={"status": "in_progress"},
        headers={"Authorization": f"Bearer {agency_login.json()['access_token']}"},
    )
    municipality_login = client.post(
        "/auth/login",
        json={"email": "admin.demo@citymind.local", "password": "admin-demo"},
    )
    municipality = client.patch(
        "/reports/TRP-1001/status",
        json={"status": "in_progress"},
        headers={"Authorization": f"Bearer {municipality_login.json()['access_token']}"},
    )

    assert unauthenticated.status_code == 401
    assert agency_login.status_code == 200
    assert agency.status_code == 403
    assert municipality_login.status_code == 200
    assert municipality.status_code == 200
    assert municipality.json()["status"] == "in_progress"


def test_resolved_report_cannot_be_reopened_without_a_separate_workflow() -> None:
    client = _client("municipality_admin")

    assert client.patch("/reports/TRP-1003/status", json={"status": "resolved"}).status_code == 200
    response = client.patch("/reports/TRP-1003/status", json={"status": "submitted"})

    assert response.status_code == 409


def test_reports_create_rejects_unsafe_image_metadata() -> None:
    client = _client()

    response = client.post(
        "/reports",
        json=_valid_payload(
            category="pothole",
            image_upload_status="local_preview_only",
            image_metadata={
                "filename": "../pothole.svg",
                "content_type": "image/svg+xml",
                "size_bytes": 1200,
            },
        ),
    )

    assert response.status_code == 422


def test_reports_create_rejects_oversized_image_metadata() -> None:
    client = _client()

    response = client.post(
        "/reports",
        json=_valid_payload(
            category="waste",
            image_upload_status="local_preview_only",
            image_metadata={
                "filename": "waste.png",
                "content_type": "image/png",
                "size_bytes": 6 * 1024 * 1024,
            },
        ),
    )

    assert response.status_code == 422


def test_reports_traffic_pothole_and_waste_analysis_not_configured() -> None:
    client = _client()

    for category in ["traffic_congestion", "pothole", "waste"]:
        response = client.post("/reports", json=_valid_payload(category=category, title=f"{category} report"))
        assert response.status_code == 201
        report = response.json()
        assert report["category"] == category
        assert report["analysis_status"] == "not_configured"
        assert "غير مهيأة" in report["image_analysis"]["message"]


def test_reports_security_incident_requires_manual_review() -> None:
    client = _client()

    response = client.post(
        "/reports",
        json=_valid_payload(
            title="Public safety concern",
            description="A citizen is reporting a safety concern and requests municipal review.",
            category="security_incident",
            severity="critical",
        ),
    )

    assert response.status_code == 201
    report = response.json()
    assert report["analysis_status"] == "manual_review_required"
    assert "خدمات الطوارئ" in report["image_analysis"]["message"]


def test_reports_medical_and_fire_emergencies_require_manual_review_without_dispatch_claim() -> None:
    client = _client()

    for category in ["medical_emergency", "fire_hazard"]:
        response = client.post(
            "/reports",
            json=_valid_payload(
                title=f"{category} report",
                description="This demo emergency category must stay manual review only and must not claim dispatch.",
                category=category,
                severity="critical",
            ),
        )

        assert response.status_code == 201
        report = response.json()
        assert report["analysis_status"] == "manual_review_required"
        assert "غير مهيأ" in report["image_analysis"]["message"]
        assert "مراجعة يدوية" in report["image_analysis"]["message"]


def test_reports_suggest_category_is_labeled_keyword_helper_not_ai() -> None:
    client = _client()

    response = client.post(
        "/reports/suggest-category",
        json=_valid_payload(
            title="Waste blocking the Old Souks",
            description="Trash bags are blocking the walking path near shops.",
            category="other",
            location_source="map",
        ),
    )

    assert response.status_code == 200
    suggestion = response.json()
    assert suggestion["category"] == "waste"
    assert "keyword helper" in suggestion["rationale"].lower()
    assert "model inference" in suggestion["rationale"].lower()
