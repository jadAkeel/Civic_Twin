"use client";

import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import type {
  ImageUploadStatus,
  ReportCategory,
  ReportImageMetadata,
  ReportLocationSource,
  ReportSeverity,
  SmartReport,
  SmartReportCreateInput,
} from "@citymind/shared";

import { CityMapCanvas } from "@/components/map/city-map-canvas";
import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import {
  categoryLabel,
  reportCategories,
  reportSeverities,
  statusLabel,
  tripoliNeighborhoodOptions,
} from "@/features/reports/report-options";
import { ErrorState, LoadingState } from "@/components/ui/async-state";
import { EmptyState } from "@/components/ui/empty-state";
import { citymindApi } from "@/lib/api-client";
import { cn } from "@/lib/cn";
import { locationSourceLabelArabic, neighborhoodLabel } from "@/lib/display-labels";
import { smartReportMarkers } from "@/lib/map-markers";
import { apiErrorMessage } from "@/lib/use-api-resource";

const defaultNeighborhood = tripoliNeighborhoodOptions[2];
const tripoliBounds = {
  minLatitude: 34.38,
  maxLatitude: 34.49,
  minLongitude: 35.78,
  maxLongitude: 35.9,
};
const allowedImageTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const maxImageSizeBytes = 5 * 1024 * 1024;

type FormState = {
  title: string;
  description: string;
  category: ReportCategory;
  severity: ReportSeverity;
  neighborhoodSlug: string;
  latitude: string;
  longitude: string;
  manualLocation: string;
  locationSource: ReportLocationSource;
  imageUploadStatus: ImageUploadStatus;
  imageMetadata: ReportImageMetadata | null;
};

type FormErrors = Partial<Record<keyof FormState | "location" | "photo" | "submit", string>>;

const initialForm: FormState = {
  title: "",
  description: "",
  category: "traffic_congestion",
  severity: "medium",
  neighborhoodSlug: "",
  latitude: "",
  longitude: "",
  manualLocation: "",
  locationSource: "manual",
  imageUploadStatus: "none",
  imageMetadata: null,
};

function analysisLabel(status: SmartReport["analysisStatus"]) {
  if (status === "manual_review_required") return "يتطلب مراجعة يدوية";
  if (status === "not_configured") return "غير مهيأ";
  if (status === "completed") return "مكتمل";
  if (status === "failed") return "فشل";
  return "قيد الانتظار";
}

function analysisTone(status: SmartReport["analysisStatus"]) {
  if (status === "completed") return "green";
  if (status === "failed") return "rose";
  if (status === "manual_review_required") return "amber";
  return "blue";
}

function analysisMessage(message: string) {
  if (message.includes("Automated image analysis is not configured")) {
    return "خدمة تحليل الصور الآلي غير مهيأة بعد. تم إرسال هذا البلاغ من دون تحليل صور آلي.";
  }
  if (message.includes("Traffic model is not connected") || message.includes("خدمة بيانات المرور غير مهيأة")) {
    return "خدمة بيانات المرور غير مهيأة بعد.";
  }
  if (message.includes("routing is not configured") || message.includes("requires manual review")) {
    return "التوجيه الآلي للجهة المختصة غير مهيأ بعد. هذا البلاغ يتطلب مراجعة يدوية. في حال وجود خطر فوري، تواصل مع خدمات الطوارئ.";
  }
  return message;
}

function categoryReviewLabel(category: ReportCategory) {
  const labels: Record<ReportCategory, string> = {
    traffic_congestion: "مراجعة البلدية لقسم السير والأشغال",
    pothole: "مراجعة البلدية لقسم الأشغال والصيانة",
    waste: "مراجعة البلدية لقسم النظافة",
    security_incident: "مراجعة يدوية مع بوابة الشرطة عند توفر الصلاحية",
    medical_emergency: "مراجعة يدوية مع بوابة الصليب الأحمر اللبناني عند توفر الصلاحية",
    fire_hazard: "مراجعة يدوية مع بوابة الدفاع المدني عند توفر الصلاحية",
    other: "فرز يدوي من البلدية",
  };

  return labels[category];
}

function isInTripoliBounds(latitude: number, longitude: number) {
  return (
    latitude >= tripoliBounds.minLatitude &&
    latitude <= tripoliBounds.maxLatitude &&
    longitude >= tripoliBounds.minLongitude &&
    longitude <= tripoliBounds.maxLongitude
  );
}

function hasCoordinates(form: FormState) {
  return form.latitude.trim() !== "" || form.longitude.trim() !== "";
}

function toPayload(form: FormState): SmartReportCreateInput {
  const latitude = form.latitude.trim() ? Number(form.latitude) : null;
  const longitude = form.longitude.trim() ? Number(form.longitude) : null;

  return {
    title: form.title.trim(),
    description: form.description.trim(),
    category: form.category,
    severity: form.severity,
    neighborhoodSlug: form.neighborhoodSlug || null,
    latitude,
    longitude,
    manualLocation: form.manualLocation.trim() || null,
    locationSource: form.locationSource,
    imageUrl: null,
    imageUploadStatus: form.imageUploadStatus,
    imageMetadata: form.imageMetadata,
  };
}

function validateForm(form: FormState): FormErrors {
  const errors: FormErrors = {};
  const title = form.title.trim();
  const description = form.description.trim();
  const manualLocation = form.manualLocation.trim();
  const coordinatesProvided = hasCoordinates(form);

  if (!title || title.length < 3) {
    errors.title = "أضف ملخصًا قصيرًا من 3 أحرف على الأقل.";
  }
  if (!description || description.length < 10) {
    errors.description = "اكتب وصفًا للمشكلة من 10 أحرف على الأقل.";
  }

  if (!coordinatesProvided && !manualLocation) {
    errors.location = "أضف موقعًا يدويًا أو شارك/حدد موقعًا على الخريطة.";
  }

  if (coordinatesProvided) {
    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      errors.location = "يجب أن تكون الإحداثيات أرقامًا صحيحة.";
    } else if (!isInTripoliBounds(latitude, longitude)) {
      errors.location = "يجب أن تكون الإحداثيات ضمن طرابلس أو نطاق الاختبار القريب.";
    }
  }

  if (form.imageUploadStatus !== "none" && !form.imageMetadata) {
    errors.photo = "بيانات الصورة مطلوبة للمعاينة المحلية.";
  }

  return errors;
}

function formatFileSize(sizeBytes: number) {
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SmartReporterWorkspace() {
  const [reports, setReports] = useState<SmartReport[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyReloadToken, setHistoryReloadToken] = useState(0);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [gpsState, setGpsState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [gpsMessage, setGpsMessage] = useState("");
  const [confirmation, setConfirmation] = useState<SmartReport | null>(null);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    citymindApi.reports
      .listMine()
      .then((apiReports) => {
        if (!mounted) return;
        setReports(apiReports);
        setHistoryError(null);
      })
      .catch((caught: unknown) => {
        if (!mounted) return;
        // The citizen's own history is either real or absent; never substituted.
        setReports([]);
        setHistoryError(apiErrorMessage(caught));
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [historyReloadToken]);

  // Deep links from the home page (/reports?category=fire_hazard) preselect the
  // category the citizen chose instead of silently defaulting to traffic.
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("category");
    const match = reportCategories.find((category) => category.value === requested);
    if (match) setForm((current) => ({ ...current, category: match.value }));
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  // Number("") is 0, so an empty field must be rejected before parsing or the map
  // drops a marker at (0, 0) in the Atlantic.
  const draftLatitude = form.latitude.trim() === "" ? Number.NaN : Number(form.latitude);
  const draftLongitude = form.longitude.trim() === "" ? Number.NaN : Number(form.longitude);
  const draftPoint =
    Number.isFinite(draftLatitude) && Number.isFinite(draftLongitude)
      ? { latitude: draftLatitude, longitude: draftLongitude }
      : null;

  function patchForm(patch: Partial<FormState>) {
    setForm((current) => ({ ...current, ...patch }));
    setErrors((current) => ({ ...current, submit: undefined }));
  }

  function chooseNeighborhood(slug: string) {
    const option = tripoliNeighborhoodOptions.find((item) => item.slug === slug) ?? defaultNeighborhood;
    patchForm({
      neighborhoodSlug: option.slug,
      manualLocation: option.displayName,
      latitude: String(option.latitude),
      longitude: String(option.longitude),
      locationSource: "map",
    });
  }

  function useGpsLocation() {
    setErrors((current) => ({ ...current, location: undefined }));
    setGpsMessage("سيستخدم CityMind هذا الموقع المؤقت لهذا البلاغ فقط.");

    if (!navigator.geolocation) {
      setGpsState("error");
      setGpsMessage("خدمة GPS غير متاحة في هذا المتصفح. اكتب الموقع يدويًا بدلًا من ذلك.");
      return;
    }

    setGpsState("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        if (!isInTripoliBounds(latitude, longitude)) {
          setGpsState("error");
          setGpsMessage("الموقع المكتشف خارج نطاق اختبار طرابلس. اكتب موقع طرابلس يدويًا.");
          return;
        }

        patchForm({
          latitude: latitude.toFixed(6),
          longitude: longitude.toFixed(6),
          locationSource: "gps",
        });
        setGpsState("success");
        setGpsMessage("تم توفير موقع GPS من جهاز المواطن. هذا ليس تحققًا بلديًا رسميًا.");
      },
      () => {
        setGpsState("error");
        setGpsMessage("تم رفض إذن الموقع أو أنه غير متاح. يمكنك كتابة الموقع يدويًا.");
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
    );
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setErrors((current) => ({ ...current, photo: undefined }));

    if (!file) {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl("");
      patchForm({ imageUploadStatus: "none", imageMetadata: null });
      return;
    }

    if (!allowedImageTypes.includes(file.type)) {
      event.target.value = "";
      setErrors((current) => ({ ...current, photo: "استخدم صورة JPG أو PNG أو WebP أو HEIC أو HEIF." }));
      return;
    }

    if (file.size > maxImageSizeBytes) {
      event.target.value = "";
      setErrors((current) => ({ ...current, photo: "يجب ألا يتجاوز حجم الصورة 5 ميغابايت." }));
      return;
    }

    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl(URL.createObjectURL(file));
    patchForm({
      imageUploadStatus: "local_preview_only",
      imageMetadata: {
        filename: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      },
    });
  }

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateForm(form);
    setErrors(nextErrors);
    setConfirmation(null);

    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      const created = await citymindApi.reports.create(toPayload(form));
      setReports((current) => [created, ...current]);
      setConfirmation(created);
      setForm(initialForm);
      setGpsState("idle");
      setGpsMessage("");
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl("");
    } catch (error) {
      setErrors({ submit: `${apiErrorMessage(error)} لم يتم تسجيل البلاغ لدى البلدية.` });
    } finally {
      setIsSubmitting(false);
    }
  }

  const latestReports = reports.slice(0, 4);
  const myReportMarkers = useMemo(() => smartReportMarkers(reports), [reports]);
  const emergencySelected = ["security_incident", "medical_emergency", "fire_hazard"].includes(form.category);

  return (
    <div className="space-y-5">
      <section className="rounded-md border border-teal-200 bg-teal-50 p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">ابدأ بلاغ مواطن</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">
              اختر نوع المشكلة، اكتب ما حدث، وحدد موقعًا مؤقتًا من الجهاز أو اكتب المكان يدويًا.
            </p>
          </div>
          <a
            className="inline-flex min-h-12 items-center justify-center rounded-md bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800"
            href="#citizen-report-form"
          >
            بلّغ عن مشكلة
          </a>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="فئات بلاغات المواطنين">
        {reportCategories.map((category) => (
          <button
            className={cn(
              "min-h-20 rounded-md border p-3 text-right text-sm font-semibold shadow-sm transition",
              form.category === category.value
                ? "border-teal-700 bg-white text-teal-950 ring-2 ring-teal-100"
                : "border-slate-200 bg-white text-slate-800 hover:border-teal-300",
            )}
            key={category.value}
            type="button"
            onClick={() => patchForm({ category: category.value })}
          >
            {category.label}
          </button>
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Panel
          title="بلاغ مواطن"
          eyebrow="نموذج بلاغ رسمي"
          action={
            <Badge tone={historyError ? "rose" : "green"}>
              {isLoading ? "جارٍ التحميل" : historyError ? "الخدمة غير متاحة" : "متصل"}
            </Badge>
          }
        >
          <form id="citizen-report-form" className="space-y-5" onSubmit={submitReport}>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                الفئة
                <select
                  className="mt-1 min-h-12 w-full rounded-md border border-slate-300 px-3 text-base text-slate-950 shadow-sm"
                  value={form.category}
                  onChange={(event) => patchForm({ category: event.target.value as ReportCategory })}
                >
                  {reportCategories.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-slate-700">
                الخطورة كما يراها المواطن
                <select
                  className="mt-1 min-h-12 w-full rounded-md border border-slate-300 px-3 text-base text-slate-950 shadow-sm"
                  value={form.severity}
                  onChange={(event) => patchForm({ severity: event.target.value as ReportSeverity })}
                >
                  {reportSeverities.map((severity) => (
                    <option key={severity.value} value={severity.value}>
                      {severity.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {emergencySelected ? (
              <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm leading-6 text-rose-950">
                في حال وجود خطر فوري، تواصل مع خدمات الطوارئ. هذا الإصدار التجريبي من CityMind لا يرسل الشرطة أو الصليب الأحمر أو الدفاع المدني.
              </div>
            ) : null}

            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
              المراجعة المتوقعة: {categoryReviewLabel(form.category)}. لا يتم إرسال البلاغ تلقائيًا إلى جهة خارجية في هذا الإصدار.
            </div>

            <label className="block text-sm font-medium text-slate-700">
              ملخص قصير
              <input
                className="mt-1 min-h-12 w-full rounded-md border border-slate-300 px-3 text-base text-slate-950 shadow-sm"
                value={form.title}
                onChange={(event) => patchForm({ title: event.target.value })}
                placeholder="الطريق مزدحم قرب التل"
                aria-invalid={Boolean(errors.title)}
              />
              {errors.title ? <span className="mt-1 block text-sm text-rose-700">{errors.title}</span> : null}
            </label>

            <label className="block text-sm font-medium text-slate-700">
              الوصف
              <textarea
                className="mt-1 min-h-32 w-full rounded-md border border-slate-300 px-3 py-3 text-base text-slate-950 shadow-sm"
                value={form.description}
                onChange={(event) => patchForm({ description: event.target.value })}
                placeholder="صف ما تراه، ومتى بدأ، ومن المتأثر."
                aria-invalid={Boolean(errors.description)}
              />
              {errors.description ? <span className="mt-1 block text-sm text-rose-700">{errors.description}</span> : null}
            </label>

            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-slate-700">الموقع</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  شارك موقع GPS فقط إذا رغبت بذلك. كتابة موقع داخل طرابلس تكفي لبلاغ آمن تجريبيًا.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  className="min-h-12 rounded-md bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-wait disabled:bg-slate-500"
                  type="button"
                  onClick={useGpsLocation}
                  disabled={gpsState === "loading"}
                >
                  {gpsState === "loading" ? "جارٍ الحصول على موقع GPS" : "استخدم موقعي عبر GPS"}
                </button>

                <label className="block text-sm font-medium text-slate-700">
                  المنطقة القريبة
                  <select
                    className="mt-1 min-h-12 w-full rounded-md border border-slate-300 px-3 text-base text-slate-950 shadow-sm"
                    value={form.neighborhoodSlug}
                    onChange={(event) => chooseNeighborhood(event.target.value)}
                  >
                    <option value="">اختر منطقة في طرابلس</option>
                    {tripoliNeighborhoodOptions.map((option) => (
                      <option key={option.slug} value={option.slug}>
                        {option.displayName}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {gpsMessage ? (
                <p
                  className={cn(
                    "rounded-md border p-3 text-sm leading-6",
                    gpsState === "error"
                      ? "border-rose-200 bg-rose-50 text-rose-900"
                      : "border-slate-200 bg-slate-50 text-slate-700",
                  )}
                >
                  {gpsMessage}
                </p>
              ) : null}

              <label className="block text-sm font-medium text-slate-700">
                عنوان أو مكان يدوي
                <input
                  className="mt-1 min-h-12 w-full rounded-md border border-slate-300 px-3 text-base text-slate-950 shadow-sm"
                  value={form.manualLocation}
                  onChange={(event) => patchForm({ manualLocation: event.target.value, locationSource: "manual" })}
                  placeholder="مثال: قرب دوار الميناء، طرابلس"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-semibold uppercase text-slate-500">
                  خط العرض
                  <input
                    className="mt-1 min-h-12 w-full rounded-md border border-slate-300 px-3 text-base font-normal text-slate-950"
                    value={form.latitude}
                    onChange={(event) => patchForm({ latitude: event.target.value, locationSource: "map" })}
                    inputMode="decimal"
                  />
                </label>
                <label className="block text-xs font-semibold uppercase text-slate-500">
                  خط الطول
                  <input
                    className="mt-1 min-h-12 w-full rounded-md border border-slate-300 px-3 text-base font-normal text-slate-950"
                    value={form.longitude}
                    onChange={(event) => patchForm({ longitude: event.target.value, locationSource: "map" })}
                    inputMode="decimal"
                  />
                </label>
              </div>

              {errors.location ? <p className="text-sm text-rose-700">{errors.location}</p> : null}

              <CityMapCanvas
                compact
                heightClassName="min-h-[300px]"
                activeLayers={{
                  neighborhoods: true,
                  reports: true,
                  waste: false,
                  roads: false,
                  lighting: false,
                  pollution: false,
                  greenRoutes: false,
                  traffic: false,
                  assets: false,
                }}
                draftPoint={draftPoint}
                issues={myReportMarkers}
                onMapPick={(point) =>
                  patchForm({
                    latitude: point.latitude.toFixed(6),
                    longitude: point.longitude.toFixed(6),
                    locationSource: "map",
                  })
                }
              />
              <p className="text-xs leading-5 text-slate-500">
                طبقات الخريطة تستخدم حدودًا تجريبية تقريبية. موقع GPS، إذا تم توفيره، يأتي من جهاز المواطن.
              </p>
            </div>

            <label className="block text-sm font-medium text-slate-700">
              صورة اختيارية
              <input
                className="mt-1 min-h-12 w-full rounded-md border border-dashed border-slate-300 px-3 py-2 text-base text-slate-700"
                type="file"
                accept={allowedImageTypes.join(",")}
                onChange={handlePhotoChange}
              />
              {imagePreviewUrl ? (
                <span className="mt-3 block overflow-hidden rounded-md border border-slate-200">
                  <Image
                    alt="معاينة محلية للصورة المختارة"
                    className="h-44 w-full object-cover"
                    height={352}
                    src={imagePreviewUrl}
                    unoptimized
                    width={720}
                  />
                </span>
              ) : null}
              {form.imageMetadata ? (
                <span className="mt-2 block text-sm leading-6 text-slate-600">
                  معاينة محلية فقط. تخزين الصور غير مهيأ. {form.imageMetadata.filename} ({formatFileSize(form.imageMetadata.sizeBytes)})
                </span>
              ) : (
                <span className="mt-2 block text-sm leading-6 text-slate-500">
                  تخزين الصور غير مهيأ بعد، لذلك تبقى الصور كمعاينة محلية وبيانات وصفية في هذه المرحلة.
                </span>
              )}
              {errors.photo ? <span className="mt-1 block text-sm text-rose-700">{errors.photo}</span> : null}
            </label>

            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
              تحليل الصور الآلي غير مهيأ بعد. لن يتم اختراع عدد سيارات أو حجم/عمق حفر أو مخاطر نفايات أو تصنيف جرائم أو خطورة طبية أو خطورة حريق.
            </div>

            {errors.submit ? (
              <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm leading-6 text-rose-900">{errors.submit}</p>
            ) : null}

            <button
              className="min-h-12 w-full rounded-md bg-teal-700 px-4 text-base font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-400 sm:w-auto"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "جارٍ إرسال البلاغ" : "إرسال البلاغ"}
            </button>
          </form>
        </Panel>

        <aside className="space-y-5">
          {confirmation ? (
            <Panel title="تم إرسال البلاغ" eyebrow={confirmation.id} action={<Badge tone="green">مُرسل</Badge>}>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="font-semibold text-slate-500">رقم البلاغ</dt>
                  <dd className="mt-1 font-semibold text-slate-950">{confirmation.id}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500">الحالة</dt>
                  <dd className="mt-1 text-slate-950">{statusLabel(confirmation.status)}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500">مصدر الموقع</dt>
                  <dd className="mt-1 text-slate-950">{locationSourceLabelArabic(confirmation.locationSource)}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500">المراجعة التالية</dt>
                  <dd className="mt-1 text-slate-950">{categoryReviewLabel(confirmation.category)}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500">الصورة</dt>
                  <dd className="mt-1 text-slate-950">
                    {confirmation.imageUploadStatus === "local_preview_only"
                      ? "بيانات معاينة محلية فقط؛ لا يوجد تخزين إنتاجي للصور."
                      : "لم يتم تخزين صورة."}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500">التحليل</dt>
                  <dd className="mt-1">
                    <Badge tone={analysisTone(confirmation.analysisStatus)}>{analysisLabel(confirmation.analysisStatus)}</Badge>
                    <p className="mt-2 leading-6 text-slate-700">{analysisMessage(confirmation.imageAnalysis.message)}</p>
                  </dd>
                </div>
              </dl>
            </Panel>
          ) : null}

          <Panel title="إرشاد المسارات" eyebrow="حالة الإعداد">
            <div className="space-y-3 text-sm leading-6 text-slate-700">
              <p>توصية مسارات المشي غير مهيأة بعد.</p>
              <p>يلزم ربط بيانات ظل الأشجار والحرارة وجودة الأرصفة والمرور الحي ومزود التوجيه قبل عرض إرشاد رسمي.</p>
              <Link className="inline-flex min-h-10 items-center rounded-md border border-slate-300 px-3 font-semibold text-slate-800" href="/mobility">
                عرض جاهزية المسارات التجريبية
              </Link>
            </div>
          </Panel>

          <Panel title="بلاغاتي السابقة" eyebrow="سجل المواطن">
            {isLoading ? (
              <LoadingState label="جارٍ تحميل بلاغاتك" />
            ) : historyError ? (
              <ErrorState
                message={historyError}
                onRetry={() => setHistoryReloadToken((token) => token + 1)}
              />
            ) : latestReports.length === 0 ? (
              <EmptyState
                title="لم ترسل أي بلاغ بعد"
                description="عندما ترسل بلاغًا، سيظهر هنا مع رقمه وحالته والجهة التي ستراجعه."
              />
            ) : (
            <div className="space-y-3">
              {latestReports.map((report) => (
                <div key={report.id} className="rounded-md border border-slate-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-950">{report.title}</p>
                    <Badge tone={analysisTone(report.analysisStatus)}>{analysisLabel(report.analysisStatus)}</Badge>
                  </div>
                  <p className="mt-1 text-xs font-semibold uppercase text-slate-500">{categoryLabel(report.category)}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{categoryReviewLabel(report.category)}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {report.manualLocation || neighborhoodLabel(report.neighborhood)}
                  </p>
                </div>
              ))}
            </div>
            )}
          </Panel>
        </aside>
      </div>
    </div>
  );
}
