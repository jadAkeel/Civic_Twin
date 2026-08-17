from __future__ import annotations

import math
import re
import unicodedata
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


TOKEN_PATTERN = re.compile(r"[a-z0-9\u0600-\u06ff]+", re.IGNORECASE)
ARABIC_DIACRITICS = re.compile(r"[\u0617-\u061a\u064b-\u0652\u0670\u06d6-\u06ed]")
STOP_WORDS = {
    "a",
    "an",
    "and",
    "are",
    "citymind",
    "for",
    "from",
    "in",
    "is",
    "of",
    "on",
    "the",
    "to",
    "tripoli",
    "what",
    "which",
    "with",
    "اين",
    "اي",
    "الى",
    "التي",
    "الذي",
    "بعد",
    "في",
    "لم",
    "ما",
    "من",
    "هو",
    "هي",
}
TOKEN_ALIASES: dict[str, tuple[str, ...]] = {
    "tree": ("trees", "green", "اشجار", "شجر", "اخضر"),
    "trees": ("tree", "green", "اشجار", "شجر", "اخضر"),
    "اشجار": ("tree", "trees", "green", "شجر", "اخضر"),
    "شجر": ("tree", "trees", "green", "اشجار", "اخضر"),
    "اخضر": ("green", "tree", "trees", "اشجار", "غطاء"),
    "unresolved": ("open", "reports", "غير", "محلوله", "بلاغات"),
    "open": ("unresolved", "reports", "مفتوحه", "بلاغات"),
    "بلاغات": ("reports", "report", "open", "unresolved"),
    "محلوله": ("resolved", "unresolved", "open"),
    "تحل": ("resolved", "unresolved", "open", "محلوله"),
    "walkability": ("walking", "مشي", "المشي"),
    "walking": ("walkability", "مشي", "المشي"),
    "مشي": ("walkability", "walking", "المشي"),
    "المشي": ("walkability", "walking", "مشي"),
    "weakest": ("lowest", "اضعف", "الاضعف"),
    "lowest": ("weakest", "اضعف", "الاضعف"),
    "اضعف": ("weakest", "lowest", "الاضعف"),
    "حي": ("neighborhood", "area", "منطقه"),
    "منطقه": ("neighborhood", "area", "حي"),
    "intervention": ("improve", "scenario", "تدخل", "تحسين"),
    "تدخل": ("intervention", "improve", "scenario", "تحسين"),
    "تحسين": ("intervention", "improve", "scenario", "تدخل"),
    "نفايات": ("waste", "garbage"),
    "waste": ("garbage", "نفايات"),
}


def normalize_text(value: str) -> str:
    normalized = unicodedata.normalize("NFKC", value).lower().replace("ـ", "")
    normalized = ARABIC_DIACRITICS.sub("", normalized)
    return normalized.translate(str.maketrans({"أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا", "ى": "ي", "ة": "ه"}))


def tokenize(value: str, *, expand_aliases: bool = False) -> set[str]:
    raw_tokens = {
        token
        for token in TOKEN_PATTERN.findall(normalize_text(value))
        if len(token) > 1 and token not in STOP_WORDS
    }
    tokens = set(raw_tokens)
    tokens.update(token[2:] for token in raw_tokens if token.startswith("ال") and len(token) > 4)
    if not expand_aliases:
        return tokens

    expanded = set(tokens)
    for token in tokens:
        expanded.update(TOKEN_ALIASES.get(token, ()))
    return expanded


@dataclass(frozen=True)
class KnowledgeChunk:
    id: str
    title: str
    content: str
    answer: str
    source: str
    tables: tuple[str, ...] = ()
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class RetrievalMatch:
    chunk: KnowledgeChunk
    score: float


class CityKnowledgeRetriever:
    def __init__(self, chunks: list[KnowledgeChunk]):
        self.chunks = chunks
        self._tokens = {chunk.id: tokenize(f"{chunk.title} {chunk.content}") for chunk in chunks}
        document_frequency = Counter(token for tokens in self._tokens.values() for token in tokens)
        self._idf = {
            token: math.log((len(chunks) + 1) / (frequency + 1)) + 1
            for token, frequency in document_frequency.items()
        }

    @classmethod
    def from_seed(cls, seed: dict[str, Any]) -> "CityKnowledgeRetriever":
        chunks = _structured_chunks(seed)
        chunks.extend(_markdown_chunks())
        return cls(chunks)

    def retrieve(self, question: str, *, top_k: int, min_score: float) -> list[RetrievalMatch]:
        query_tokens = tokenize(question)
        if not query_tokens:
            return []

        known_query_tokens = {
            query_token
            for query_token in query_tokens
            if any(
                {query_token, *TOKEN_ALIASES.get(query_token, ())}.intersection(document_tokens)
                for document_tokens in self._tokens.values()
            )
        }
        # One generic overlap (for example "official") is too weak to support a
        # municipal answer and should result in a refusal instead of a false match.
        if len(known_query_tokens) < 2:
            return []

        matches: list[RetrievalMatch] = []
        for chunk in self.chunks:
            document_tokens = self._tokens[chunk.id]
            matched_query_tokens = 0
            weighted_matches = 0.0
            for query_token in known_query_tokens:
                alternatives = {query_token, *TOKEN_ALIASES.get(query_token, ())}
                matched = alternatives.intersection(document_tokens)
                if matched:
                    matched_query_tokens += 1
                    weighted_matches += max(self._idf.get(token, 1.0) for token in matched)

            if not matched_query_tokens:
                continue

            coverage = matched_query_tokens / len(known_query_tokens)
            specificity = weighted_matches / max(1.0, len(known_query_tokens) * 2.5)
            title_overlap = len(tokenize(chunk.title, expand_aliases=True).intersection(tokenize(question, expand_aliases=True)))
            score = min(1.0, (coverage * 0.68) + (specificity * 0.24) + min(title_overlap * 0.04, 0.08))
            if score >= min_score:
                matches.append(RetrievalMatch(chunk=chunk, score=round(score, 4)))

        matches.sort(key=lambda item: item.score, reverse=True)
        return matches[:top_k]


def _structured_chunks(seed: dict[str, Any]) -> list[KnowledgeChunk]:
    neighborhoods = {item["slug"]: item for item in seed.get("neighborhoods", [])}
    metadata = seed.get("metadata", {})
    source = str(metadata.get("source") or "data/tripoli_seed.json")
    demo_data = bool(metadata.get("demo_data", True))
    chunks: list[KnowledgeChunk] = []

    green_metrics = [
        item for item in seed.get("green_metrics", []) if item.get("neighborhood_slug") in neighborhoods
    ]
    if green_metrics:
        weakest_green = min(green_metrics, key=lambda item: item["green_coverage_score"])
        green_neighborhood = neighborhoods[weakest_green["neighborhood_slug"]]
        chunks.append(
        KnowledgeChunk(
            id="insight-green-priority",
            title="أولوية الأشجار والغطاء الأخضر | tree planting priority",
            content="أي حي يحتاج أشجار أولا weakest green coverage neighborhood trees green planting priority",
            answer=(
                f"بحسب البيانات التجريبية المؤرخة {weakest_green['measurement_date']}، "
                f"{green_neighborhood['name']} لديه أدنى مؤشر غطاء أخضر "
                f"({weakest_green['green_coverage_score']}/100)، لذلك يظهر كأولوية أولية للمراجعة الميدانية قبل زراعة الأشجار."
            ),
            source=source,
            tables=("green_metrics", "neighborhoods"),
            metadata={"neighborhood_slug": weakest_green["neighborhood_slug"], "demo_data": demo_data},
        )
        )

    open_statuses = {"submitted", "validated", "in_progress"}
    open_reports = [report for report in seed.get("issue_reports", []) if report["status"] in open_statuses]
    by_status = Counter(report["status"] for report in open_reports)
    chunks.append(
        KnowledgeChunk(
            id="insight-open-reports",
            title="البلاغات المفتوحة وغير المحلولة | unresolved reports",
            content="بلاغات مفتوحة غير محلولة unresolved open reports submitted validated in progress status",
            answer=f"تحتوي البيانات التجريبية على {len(open_reports)} بلاغًا غير محلول، موزعة حسب الحالة: {dict(by_status)}.",
            source=source,
            tables=("issue_reports",),
            metadata={"statuses": dict(by_status), "demo_data": demo_data},
        )
    )

    walkability_metrics = [
        item for item in seed.get("walkability_metrics", []) if item.get("neighborhood_slug") in neighborhoods
    ]
    if walkability_metrics:
        weakest_walkability = min(walkability_metrics, key=lambda item: item["overall_walkability_score"])
        walkability_neighborhood = neighborhoods[weakest_walkability["neighborhood_slug"]]
        chunks.append(
        KnowledgeChunk(
            id="insight-walkability-lowest",
            title="أضعف قابلية للمشي | weakest walkability",
            content="اين قابلية المشي اضعف weakest lowest walkability walking neighborhood",
            answer=(
                f"بحسب خط الأساس التجريبي، {walkability_neighborhood['name']} لديه أدنى مؤشر لقابلية المشي "
                f"({weakest_walkability['overall_walkability_score']}/100). يلزم التحقق الميداني قبل اتخاذ قرار تخطيطي."
            ),
            source=source,
            tables=("walkability_metrics", "neighborhoods"),
            metadata={"neighborhood_slug": weakest_walkability["neighborhood_slug"], "demo_data": demo_data},
        )
        )

    bab_scenarios = [
        item for item in seed.get("scenarios", []) if item["neighborhood_slug"] == "bab-al-tebbaneh"
    ]
    if bab_scenarios:
        action_names = [action["action_type"] for item in bab_scenarios for action in item.get("actions", [])]
        chunks.append(
            KnowledgeChunk(
                id="insight-bab-intervention",
                title="تدخلات باب التبانة | Bab Al Tebbaneh interventions",
                content="باب التبانة تدخل تحسين intervention improve scenario waste garbage trees green recovery",
                answer=(
                    "تدعم مكتبة السيناريوهات التجريبية في باب التبانة مراجعة حزمة تجمع التعافي الأخضر وتحسين خدمة النفايات. "
                    f"الإجراءات المسجلة حاليًا: {', '.join(action_names)}. هذه فرضية تخطيطية وليست توصية تنفيذية نهائية."
                ),
                source=source,
                tables=("scenarios", "scenario_actions"),
                metadata={"neighborhood_slug": "bab-al-tebbaneh", "demo_data": demo_data},
            )
        )

    green_by_slug = {item["neighborhood_slug"]: item for item in green_metrics}
    walkability_by_slug = {item["neighborhood_slug"]: item for item in walkability_metrics}
    for slug, neighborhood in neighborhoods.items():
        green = green_by_slug.get(slug)
        walkability = walkability_by_slug.get(slug)
        if not green or not walkability:
            continue
        chunks.append(
            KnowledgeChunk(
                id=f"neighborhood-{slug}",
                title=f"{neighborhood['name']} | {slug}",
                content=(
                    f"neighborhood area حي منطقة {neighborhood['description']} priority {neighborhood['priority_level']} "
                    f"green coverage trees {green['green_coverage_score']} walkability walking {walkability['overall_walkability_score']}"
                ),
                answer=(
                    f"{neighborhood['name']}: أولوية تجريبية {neighborhood['priority_level']}، "
                    f"الغطاء الأخضر {green['green_coverage_score']}/100، وقابلية المشي "
                    f"{walkability['overall_walkability_score']}/100."
                ),
                source=source,
                tables=("neighborhoods", "green_metrics", "walkability_metrics"),
                metadata={"neighborhood_slug": slug, "demo_data": demo_data},
            )
        )

    return chunks


def _knowledge_path() -> Path | None:
    for parent in Path(__file__).resolve().parents:
        candidate = parent / "TRIPOLI_CITY_KNOWLEDGE.md"
        if candidate.is_file():
            return candidate
    return None


def _markdown_chunks() -> list[KnowledgeChunk]:
    path = _knowledge_path()
    if path is None:
        return []

    chunks: list[KnowledgeChunk] = []
    heading = "Tripoli local knowledge"
    paragraphs: list[str] = []

    def flush() -> None:
        nonlocal paragraphs
        content = " ".join(part.strip() for part in paragraphs if part.strip())
        paragraphs = []
        if len(content) < 40:
            return
        chunk_number = len(chunks) + 1
        excerpt = content[:700].strip()
        chunks.append(
            KnowledgeChunk(
                id=f"knowledge-doc-{chunk_number}",
                title=heading,
                content=excerpt,
                answer=f"تذكر قاعدة المعرفة المحلية تحت قسم «{heading}»: {excerpt}",
                source="TRIPOLI_CITY_KNOWLEDGE.md",
                metadata={"demo_data": True},
            )
        )

    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if stripped.startswith("#"):
            flush()
            heading = stripped.lstrip("#").strip()
        elif stripped:
            paragraphs.append(stripped)
            if sum(len(part) for part in paragraphs) >= 900:
                flush()
    flush()
    return chunks
