from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

ReportCategory = Literal[
    "pothole",
    "garbage",
    "broken_sidewalk",
    "street_lighting",
    "water_leakage",
    "traffic_obstruction",
    "accessibility_issue",
    "pollution",
    "public_safety",
    "other",
]
ReportSeverity = Literal["low", "medium", "high", "critical"]
ReportStatus = Literal["submitted", "validated", "in_progress", "resolved", "rejected", "duplicate"]


class ReportCreate(BaseModel):
    title: str = Field(min_length=5, max_length=180)
    description: str = Field(min_length=10, max_length=1200)
    category: ReportCategory
    severity: ReportSeverity
    neighborhood_slug: str = Field(min_length=2, max_length=120)
    latitude: float = Field(ge=34.38, le=34.49)
    longitude: float = Field(ge=35.78, le=35.9)
    image_url: str | None = Field(default=None, max_length=500)


class ReportStatusUpdate(BaseModel):
    status: ReportStatus


class ReportCategorySuggestion(BaseModel):
    category: ReportCategory
    confidence: float = Field(ge=0, le=1)
    rationale: str
    duplicate_candidates: list[str] = Field(default_factory=list)


class ReportRead(BaseModel):
    id: str
    title: str
    description: str
    category: ReportCategory
    severity: ReportSeverity
    status: ReportStatus
    neighborhood: str
    neighborhood_slug: str
    latitude: float
    longitude: float
    image_url: str | None = None
    ai_detected_category: ReportCategory | None = None
    ai_confidence: float | None = Field(default=None, ge=0, le=1)
    duplicate_group_id: str | None = None
    duplicate_candidates: list[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
