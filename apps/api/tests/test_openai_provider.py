from urllib.error import URLError

from app.modules.assistant.provider import OpenAIGroundedRagProvider
from app.seed.load_seed import load_seed_file


def test_openai_provider_sends_only_retrieved_evidence_with_privacy_controls() -> None:
    captured: dict[str, object] = {}

    def transport(payload: dict[str, object]) -> dict[str, object]:
        captured.update(payload)
        return {
            "output": [
                {
                    "content": [
                        {
                            "type": "output_text",
                            "text": '{"answer":"Bab Al Tebbaneh is the first area to review.","grounded":true}',
                        }
                    ]
                }
            ]
        }

    provider = OpenAIGroundedRagProvider(transport=transport)
    result = provider.answer(
        "Which neighborhood needs trees first? Contact planner@example.com or 03123456.",
        load_seed_file(),
        safety_identifier="planner@example.com",
    )

    assert result["provider"].startswith("openai_responses:")
    assert result["sources"]["grounded"] is True
    assert captured["store"] is False
    assert captured["text"]["format"]["type"] == "json_schema"  # type: ignore[index]
    input_text = captured["input"][0]["content"][0]["text"]  # type: ignore[index]
    assert "planner@example.com" not in input_text
    assert "03123456" not in input_text
    assert "[redacted-email]" in input_text
    assert len(str(captured["safety_identifier"])) == 64


def test_openai_provider_returns_labelled_local_fallback_when_service_is_unavailable() -> None:
    def unavailable(_: dict[str, object]) -> dict[str, object]:
        raise URLError("offline")

    result = OpenAIGroundedRagProvider(transport=unavailable).answer(
        "Which neighborhood needs trees first?",
        load_seed_file(),
        safety_identifier="analyst@example.com",
    )

    assert result["provider"] == "local_grounded_rag_fallback"
    assert result["sources"]["grounded"] is True
    assert "provider_warning" in result["sources"]
