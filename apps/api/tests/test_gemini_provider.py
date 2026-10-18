from urllib.error import URLError

import pytest

from app.core.config import settings
from app.modules.assistant.provider import (
    AssistantProviderError,
    GeminiGroundedRagProvider,
    _endpoint,
    build_assistant_provider,
)
from app.seed.load_seed import load_seed_file


def _gemini_response(text: str) -> dict[str, object]:
    return {
        "candidates": [
            {
                "finishReason": "STOP",
                "content": {"role": "model", "parts": [{"text": text}]},
            }
        ]
    }


def test_gemini_provider_sends_only_redacted_retrieved_evidence() -> None:
    captured: dict[str, object] = {}

    def transport(payload: dict[str, object]) -> dict[str, object]:
        captured.update(payload)
        return _gemini_response('{"answer":"Bab Al Tebbaneh is the first area to review.","grounded":true}')

    result = GeminiGroundedRagProvider(transport=transport).answer(
        "Which neighborhood needs trees first? Contact planner@example.com or 03123456.",
        load_seed_file(),
        safety_identifier="planner@example.com",
    )

    assert result["provider"] == f"google_gemini:{settings.gemini_model}"
    assert result["answer"] == "Bab Al Tebbaneh is the first area to review."
    assert result["sources"]["grounded"] is True

    generation_config = captured["generationConfig"]
    assert generation_config["responseMimeType"] == "application/json"  # type: ignore[index]
    assert generation_config["responseSchema"]["required"] == ["answer", "grounded"]  # type: ignore[index]

    prompt = captured["contents"][0]["parts"][0]["text"]  # type: ignore[index]
    assert "planner@example.com" not in prompt
    assert "03123456" not in prompt
    assert "[redacted-email]" in prompt
    # The caller's identity is never forwarded to Google.
    assert "planner@example.com" not in str(captured)


def test_gemini_provider_falls_back_to_local_evidence_when_the_service_is_down() -> None:
    def unavailable(_: dict[str, object]) -> dict[str, object]:
        raise URLError("offline")

    result = GeminiGroundedRagProvider(transport=unavailable).answer(
        "Which neighborhood needs trees first?",
        load_seed_file(),
        safety_identifier="analyst@example.com",
    )

    assert result["provider"] == "local_grounded_rag_fallback"
    assert result["sources"]["grounded"] is True
    assert "google_gemini" in result["sources"]["provider_warning"]


def test_gemini_provider_rejects_a_safety_blocked_response() -> None:
    def blocked(_: dict[str, object]) -> dict[str, object]:
        return {"promptFeedback": {"blockReason": "SAFETY"}}

    result = GeminiGroundedRagProvider(transport=blocked).answer(
        "Which neighborhood needs trees first?",
        load_seed_file(),
    )

    assert result["provider"] == "local_grounded_rag_fallback"


def test_gemini_provider_rejects_an_ungrounded_answer() -> None:
    def ungrounded(_: dict[str, object]) -> dict[str, object]:
        return _gemini_response('{"answer":"I made this up.","grounded":false}')

    result = GeminiGroundedRagProvider(transport=ungrounded).answer(
        "Which neighborhood needs trees first?",
        load_seed_file(),
    )

    assert result["provider"] == "local_grounded_rag_fallback"
    assert "I made this up." not in result["answer"]


def test_gemini_provider_refuses_when_no_local_evidence_matches() -> None:
    def never_called(_: dict[str, object]) -> dict[str, object]:
        raise AssertionError("The hosted model must not be called without retrieved evidence")

    result = GeminiGroundedRagProvider(transport=never_called).answer(
        "ما هو سعر صرف الليرة اللبنانية اليوم في السوق الموازي؟",
        load_seed_file(),
    )

    assert result["sources"]["grounded"] is False
    assert result["confidence_score"] == 0.0


def test_provider_endpoints_reject_non_http_schemes() -> None:
    with pytest.raises(AssistantProviderError):
        _endpoint("file:///etc", "models/x:generateContent")


def test_build_assistant_provider_selects_gemini(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ai_provider", "gemini")

    assert isinstance(build_assistant_provider(), GeminiGroundedRagProvider)
