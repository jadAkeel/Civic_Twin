from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator

ReportCategory = Literal[
    "traffic_congestion",
    "pothole",
    "waste",
    "security_incident",
    "medical_emergency",
    "fire_hazard",
    "other",
]
ReportSeverity = Literal["low", "medium", "high", "critical"]
ReportStatus = Literal["submitted", "validated", "in_progress", "resolved", "rejected", "duplicate"]
ReportLocationSource = Literal["gps", "manual", "map", "demo_seed"]
ImageUploadStatus = Literal["none", "local_preview_only", "stored"]
AnalysisStatus = Literal["not_configured", "pending", "completed", "failed", "manual_review_required"]

TRIPOLI_LATITUDE_MIN = 34.38
TRIPOLI_LATITUDE_MAX = 34.49
TRIPOLI_LONGITUDE_MIN = 35.78
TRIPOLI_LONGITUDE_MAX = 35.9
MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}


def _contains_unsafe_text(value: str) -> bool:
    lowered = value.lower()
    return "<script" in lowered or "javascript:" in lowered or "data:text/html" in lowered


class ReportImageMetadata(BaseModel):
    filename: str = Field(min_length=1, max_length=180)
    content_type: str = Field(min_length=3, max_length=80)
    size_bytes: int = Field(ge=1, le=MAX_IMAGE_SIZE_BYTES)

    @field_validator("filename")
    @classmethod
    def validate_filename(cls, value: str) -> str:
        clean_value = value.strip()
        if _contains_unsafe_text(clean_value) or any(separator in clean_value for separator in ("/", "\\")):
            raise ValueError("Image filename is not safe")
        return clean_value

    @field_validator("content_type")
    @classmethod
    def validate_content_type(cls, value: str) -> str:
        clean_value = value.strip().lower()
        if clean_value not in ALLOWED_IMAGE_TYPES:
            raise ValueError("Image file type is not supported")
        return clean_value


class ReportImageAnalysis(BaseModel):
    status: AnalysisStatus
    provider: str | None = None
    message: str
    completed_at: datetime | None = None


class ReportCreate(BaseModel):
    title: str = Field(min_length=3, max_length=180)
    description: str = Field(min_length=10, max_length=1200)
    category: ReportCategory
    severity: ReportSeverity
    neighborhood_slug: str | None = Field(default=None, min_length=2, max_length=120)
    latitude: float | None = Field(default=None, ge=TRIPOLI_LATITUDE_MIN, le=TRIPOLI_LATITUDE_MAX)
    longitude: float | None = Field(default=None, ge=TRIPOLI_LONGITUDE_MIN, le=TRIPOLI_LONGITUDE_MAX)
    manual_location: str | None = Field(default=None, max_length=240)
    location_source: ReportLocationSource = "manual"
    image_url: str | None = Field(default=None, max_length=500)
    image_upload_status: ImageUploadStatus = "none"
    image_metadata: ReportImageMetadata | None = None

    @field_validator("title", "description", "manual_location")
    @classmethod
    def validate_safe_text(cls, value: str | None) -> str | None:
        if value is None:
            return value
        clean_value = value.strip()
        if _contains_unsafe_text(clean_value):
            raise ValueError("Text contains unsafe markup")
        return clean_value

    @model_validator(mode="after")
    def validate_location(self) -> "ReportCreate":
        has_coordinates = self.latitude is not None and self.longitude is not None
        has_manual_location = bool(self.manual_location)
        if not has_coordinates and not has_manual_location:
            raise ValueError("Provide either GPS/map coordinates or a manually typed Tripoli location")
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("Latitude and longitude must be provided together")
        if self.location_source == "gps" and not has_coordinates:
            raise ValueError("GPS location source requires coordinates")
        if self.location_source == "map" and not has_coordinates:
            raise ValueError("Map location source requires coordinates")
        if self.image_upload_status == "stored" and not self.image_url:
            raise ValueError("Stored image uploads require an image URL")
        if self.image_upload_status != "none" and self.image_metadata is None:
            raise ValueError("Image metadata is required when an image is attached")
        if self.image_upload_status == "none" and (self.image_metadata is not None or self.image_url):
            raise ValueError("Image metadata or URL cannot be supplied when no image is attached")
        return self


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
    neighborhood_slug: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    manual_location: str | None = None
    location_source: ReportLocationSource
    image_url: str | None = None
    image_upload_status: ImageUploadStatus
    image_metadata: ReportImageMetadata | None = None
    analysis_status: AnalysisStatus
    image_analysis: ReportImageAnalysis
    duplicate_group_id: str | None = None
    duplicate_candidates: list[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
