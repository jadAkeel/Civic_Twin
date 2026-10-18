"use client";

import { useEffect, useMemo, useState } from "react";
import type { SmartReport } from "@citymind/shared";
import Image from "next/image";

import { CityMapCanvas, type CityMapSelection } from "@/components/map/city-map-canvas";
import { ErrorState, LoadingState } from "@/components/ui/async-state";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable } from "@/components/ui/data-table";
import { MetricCard } from "@/components/ui/metric-card";
import { Panel } from "@/components/ui/panel";
import { categoryLabel, reportCategories, reportStatuses, statusLabel } from "@/features/reports/report-options";
import { ApiClientError, citymindApi, type AdminAsset, type AdminOverview, type CityMindUser, type CityMindUserRole } from "@/lib/api-client";
import { readStoredAuthSession } from "@/lib/auth-session";
import { smartReportMarkers } from "@/lib/map-markers";
import { passwordProblem } from "@/lib/password-policy";
import { apiErrorMessage } from "@/lib/use-api-resource";
import { locationSourceLabelArabic, neighborhoodLabel, roleLabel, severityLabel, statusLabelArabic } from "@/lib/display-labels";

const PRE_HIJACK_MESSAGE =
  "هذا البريد مسجّل كحساب مواطن أنشأه صاحبه. عيّن كلمة مرور جديدة عند منحه صلاحية موظف، حتى لا يبقى من سجّله قادرًا على الدخول.";

function userSaveErrorMessage(caught: unknown): string {
  if (caught instanceof ApiClientError && caught.status === 409) {
    if (caught.message.includes("self-registered")) return PRE_HIJACK_MESSAGE;
    if (caught.message.includes("owner")) return "يجب أن يبقى مالك نشط واحد على الأقل. رقِّ مالكًا آخر قبل تغيير هذا الحساب.";
    return "تم تعديل هذا الحساب للتو من طلب آخر. حدّث الصفحة ثم أعد المحاولة.";
  }
  return apiErrorMessage(caught);
}

const operationsRoles: CityMindUserRole[] = ["owner", "municipality_admin", "decision_maker", "analyst", "police", "red_cross", "civil_defense"];
const municipalityRoles: CityMindUserRole[] = ["owner", "municipality_admin", "decision_maker", "analyst"];
const agencyRoles: CityMindUserRole[] = ["police", "red_cross", "civil_defense"];
const assignableRoles: CityMindUserRole[] = ["citizen", "municipality_admin", "decision_maker", "analyst", "police", "red_cross", "civil_defense", "owner"];
type ReportSortMode = "triage" | "newest" | "oldest" | "status";

function assetStatusLabel(status: AdminAsset["status"]) {
  return statusLabelArabic(status);
}

function portalLabel(name: string) {
  const labels: Record<string, string> = {
    "Municipality portal": "بوابة البلدية",
    "Police portal": "بوابة الشرطة",
    "Lebanese Red Cross portal": "بوابة الصليب الأحمر اللبناني",
    "Civil Defense / Fire portal": "بوابة الدفاع المدني / الحريق",
  };
  return labels[name] ?? name;
}

function assetTypeLabel(type: string) {
  const labels: Record<string, string> = {
    road: "طريق",
    sidewalk: "رصيف",
    street_light: "مصباح شارع",
    waste_container: "حاوية نفايات",
    park: "حديقة",
    tree: "شجرة",
    bus_stop: "موقف حافلات",
    heritage_site: "موقع تراثي",
  };
  return labels[type] ?? type;
}

function escalationLabel(category: string) {
  const labels: Record<string, string> = {
    medical_emergency: "التصعيد المقترح: الصليب الأحمر اللبناني",
    security_incident: "التصعيد المقترح: الشرطة",
    public_safety: "التصعيد المقترح: الشرطة",
    fire_hazard: "التصعيد المقترح: الدفاع المدني",
    traffic_congestion: "التصعيد المقترح: البلدية",
    traffic_obstruction: "التصعيد المقترح: البلدية",
    pothole: "التصعيد المقترح: البلدية",
    waste: "التصعيد المقترح: البلدية",
    garbage: "التصعيد المقترح: البلدية",
  };

  return labels[category] ?? "التصعيد المقترح: مراجعة بلدية يدوية";
}

function responsibleDeskLabel(category: string) {
  const labels: Record<string, string> = {
    medical_emergency: "الصليب الأحمر اللبناني / مراجعة إسعافية",
    security_incident: "الشرطة / السلامة العامة",
    public_safety: "الشرطة / السلامة العامة",
    fire_hazard: "الدفاع المدني / الحريق والإنقاذ",
    traffic_congestion: "البلدية / السير والأشغال",
    traffic_obstruction: "البلدية / السير والأشغال",
    pothole: "البلدية / الأشغال والصيانة",
    waste: "البلدية / النظافة",
    garbage: "البلدية / النظافة",
  };

  return labels[category] ?? "البلدية / فرز يدوي";
}

function reportLocationLabel(report: SmartReport) {
  return report.manualLocation || neighborhoodLabel(report.neighborhood);
}

function formatReportDate(value: string) {
  try {
    return new Intl.DateTimeFormat("ar-LB", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function statusRank(status: SmartReport["status"]) {
  const ranks: Record<SmartReport["status"], number> = {
    submitted: 5,
    validated: 4,
    in_progress: 3,
    duplicate: 2,
    rejected: 1,
    resolved: 0,
  };
  return ranks[status];
}

function severityRank(severity: SmartReport["severity"]) {
  const ranks: Record<SmartReport["severity"], number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };
  return ranks[severity];
}

function compareReportDate(a: SmartReport, b: SmartReport) {
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}

function sortReports(reports: SmartReport[], mode: ReportSortMode) {
  return [...reports].sort((a, b) => {
    if (mode === "newest") return compareReportDate(a, b);
    if (mode === "oldest") return compareReportDate(b, a);
    if (mode === "status") {
      return statusRank(b.status) - statusRank(a.status) || severityRank(b.severity) - severityRank(a.severity) || compareReportDate(a, b);
    }

    return severityRank(b.severity) - severityRank(a.severity) || statusRank(b.status) - statusRank(a.status) || compareReportDate(a, b);
  });
}

function matchesSearch(report: SmartReport, search: string) {
  if (!search) return true;

  const haystack = [
    report.id,
    report.title,
    report.description,
    categoryLabel(report.category),
    severityLabel(report.severity),
    statusLabel(report.status),
    reportLocationLabel(report),
    responsibleDeskLabel(report.category),
  ]
    .join(" ")
    .toLocaleLowerCase("ar-LB");

  return haystack.includes(search);
}

function roleGuidance(role: CityMindUserRole | "not signed in") {
  if (role === "red_cross") {
    return "تركّز هذه البوابة على البلاغات الطبية أو الإصابات. لا يوجد إرسال خارجي مهيأ؛ يلزم تصعيد يدوي عند الحاجة.";
  }
  if (role === "police") {
    return "تركّز هذه البوابة على السلامة العامة والحوادث الأمنية. لا تؤكد الواجهة جريمة أو مسؤولية قانونية؛ يلزم مراجعة يدوية.";
  }
  if (role === "civil_defense") {
    return "تركّز هذه البوابة على الحريق والإنقاذ والمخاطر. لا يوجد إرسال خارجي مهيأ؛ يلزم تصعيد يدوي عند الحاجة.";
  }
  return "البلدية ترى البلاغات والأصول وحالة التكامل من مكان واحد، مع تمييز واضح للبيانات التجريبية وغير المهيأة.";
}

function municipalityReviewLabel(status: SmartReport["status"]) {
  if (status === "submitted") return "بانتظار فرز بلدي أولي";
  if (status === "validated") return "تمت مراجعة بلدية أولية";
  if (status === "in_progress") return "قيد متابعة الجهة أو البلدية";
  if (status === "resolved") return "أُغلق كبلاغ محلول";
  if (status === "duplicate") return "معلّم كبلاغ مكرر";
  return "أُغلق أو رُفض بعد المراجعة";
}

function agencyOperatorChecklist(role: CityMindUserRole | "not signed in", report: SmartReport) {
  if (role === "red_cross") {
    return {
      title: "مراجعة الصليب الأحمر",
      items: [
        "نوع البلاغ: مساعدة طبية أو إصابة محتملة.",
        "الإصابات المبلغ عنها: غير مفصلة في البيانات الحالية؛ راجع الوصف والموقع يدويًا.",
        "التصعيد المقترح: الصليب الأحمر اللبناني.",
        "الإشعار الخارجي غير مهيأ. يلزم تصعيد يدوي عند الحاجة.",
      ],
    };
  }

  if (role === "police") {
    return {
      title: "مراجعة الشرطة",
      items: [
        "نوع البلاغ: سلامة عامة أو حادث أمني محتمل.",
        `مراجعة البلدية: ${municipalityReviewLabel(report.status)}.`,
        "لا تؤكد الواجهة جريمة أو مشتبهًا به أو مسؤولية قانونية.",
        "الإشعار الخارجي غير مهيأ. يلزم قرار بشري قبل أي تواصل رسمي.",
      ],
    };
  }

  if (role === "civil_defense") {
    return {
      title: "مراجعة الدفاع المدني",
      items: [
        "نوع البلاغ: حريق أو إنقاذ أو خطر محتمل.",
        "راجع الوصف والموقع والصورة إن وجدت قبل أي تصعيد.",
        "التصعيد المقترح: الدفاع المدني.",
        "الإشعار الخارجي غير مهيأ. يلزم تصعيد يدوي عند الحاجة.",
      ],
    };
  }

  return {
    title: "فرز البلدية",
    items: [
      `القسم المسؤول: ${responsibleDeskLabel(report.category)}.`,
      escalationLabel(report.category),
      `حالة المراجعة: ${municipalityReviewLabel(report.status)}.`,
      "لا يوجد إرسال خارجي مهيأ؛ أي تواصل رسمي يحتاج إلى إجراء يدوي.",
    ],
  };
}

export function AdminWorkspace() {
  const [role, setRole] = useState<CityMindUserRole | "not signed in">("not signed in");
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [reports, setReports] = useState<SmartReport[]>([]);
  const [assets, setAssets] = useState<AdminAsset[]>([]);
  const [users, setUsers] = useState<CityMindUser[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error" | "forbidden">("loading");
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionNotice, setActionNotice] = useState("");
  const [reloadToken, setReloadToken] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<ReportSortMode>("triage");
  const [selectedReportId, setSelectedReportId] = useState("");
  const [newUser, setNewUser] = useState<CityMindUser>({
    full_name: "",
    email: "",
    role: "citizen",
    password: "",
    is_active: true,
  });

  const filteredReports = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLocaleLowerCase("ar-LB");
    const visibleReports = reports.filter(
      (report) =>
        (statusFilter === "all" || report.status === statusFilter) &&
        (categoryFilter === "all" || report.category === categoryFilter) &&
        matchesSearch(report, normalizedSearch),
    );

    return sortReports(visibleReports, sortMode);
  }, [categoryFilter, reports, searchQuery, sortMode, statusFilter]);

  const selectedReport = filteredReports.find((report) => report.id === selectedReportId) ?? filteredReports[0] ?? null;
  const selectedReportChecklist = selectedReport ? agencyOperatorChecklist(role, selectedReport) : null;
  const canUseAdmin =
    operationsRoles.includes(role as CityMindUserRole) && loadState === "ready" && overview !== null;
  const isAgencyRole = agencyRoles.includes(role as CityMindUserRole);
  const canManageUsers = role === "owner" && loadState === "ready";
  const canManageAssets = municipalityRoles.includes(role as CityMindUserRole) && loadState === "ready";
  const visibleCategoryLabels = !overview
    ? ""
    : overview.visible_categories.includes("all")
      ? "كل فئات البلاغات"
      : overview.visible_categories
          .filter((category) => category !== "all")
          .map((category) => categoryLabel(category))
          .join("، ");
  const mappableReports = useMemo(() => smartReportMarkers(filteredReports), [filteredReports]);
  const selectedMappableReport = mappableReports.find((report) => report.id === selectedReportId);
  const selectedMapSelection: CityMapSelection | null = selectedMappableReport
    ? { type: "issue", item: selectedMappableReport }
    : null;

  useEffect(() => {
    if (!filteredReports.length || filteredReports.some((report) => report.id === selectedReportId)) return;
    setSelectedReportId(filteredReports[0].id);
  }, [filteredReports, selectedReportId]);

  // The HttpOnly session cookie is the credential. This workspace only reads who is
  // signed in so it can request the slices of data that role is allowed to see.
  useEffect(() => {
    let active = true;
    const savedSession = readStoredAuthSession();

    if (!savedSession) {
      setRole("not signed in");
      setLoadState("forbidden");
      setLoadError("سجّل الدخول بحساب بلدي أو حساب جهة للوصول إلى هذه المساحة.");
      return;
    }

    const currentRole = savedSession.user.role;
    setRole(currentRole);

    if (!operationsRoles.includes(currentRole)) {
      setLoadState("forbidden");
      setLoadError("هذا الحساب مخصص للمواطن فقط ولا يمكنه الوصول إلى عمليات الجهات أو البلدية.");
      return;
    }

    setLoadState("loading");
    Promise.all([
      citymindApi.admin.overview(),
      citymindApi.admin.reports(),
      municipalityRoles.includes(currentRole) ? citymindApi.admin.assets() : Promise.resolve([] as AdminAsset[]),
      currentRole === "owner" ? citymindApi.admin.users() : Promise.resolve([] as CityMindUser[]),
    ])
      .then(([adminOverview, adminReports, adminAssets, ownerUsers]) => {
        if (!active) return;
        setOverview(adminOverview);
        setReports(adminReports);
        setSelectedReportId(adminReports[0]?.id ?? "");
        setAssets(adminAssets);
        setUsers(ownerUsers);
        setLoadError("");
        setLoadState("ready");
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setLoadError(apiErrorMessage(caught));
        setLoadState("error");
      });

    return () => {
      active = false;
    };
  }, [reloadToken]);

  async function saveUser() {
    if (!canManageUsers) return;
    setActionError("");
    setActionNotice("");
    const email = newUser.email.trim().toLowerCase();
    const password = newUser.password?.trim() ? newUser.password : undefined;
    const existingUser = users.find((user) => user.email === email);
    const isExisting = Boolean(existingUser);

    if (newUser.full_name.trim().length < 2 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setActionError("أدخل اسمًا كاملًا وبريدًا إلكترونيًا صالحًا.");
      return;
    }
    if (!isExisting && !password) {
      setActionError("كلمة مرور مؤقتة مطلوبة عند إنشاء مستخدم جديد.");
      return;
    }
    if (existingUser?.role === "citizen" && newUser.role !== "citizen" && !password) {
      // Mirrors the API: a self-registered account keeps its registrant's password
      // unless a new one is set, so granting a staff role requires one.
      setActionError(PRE_HIJACK_MESSAGE);
      return;
    }
    const problem = password ? passwordProblem(password, email) : null;
    if (problem) {
      setActionError(problem);
      return;
    }

    try {
      // An empty password means "keep the current one"; sending "" would be rejected.
      const saved = await citymindApi.admin.upsertUser({ ...newUser, email, password });
      setActionNotice(isExisting ? `تم تحديث صلاحيات ${saved.email}.` : `تم إنشاء حساب ${saved.email}.`);
      setUsers((current) => {
        const exists = current.some((user) => user.email === saved.email);
        return exists ? current.map((user) => (user.email === saved.email ? saved : user)) : [...current, saved];
      });
      setNewUser({ full_name: "", email: "", role: "citizen", password: "", is_active: true });
    } catch (caught) {
      setActionError(userSaveErrorMessage(caught));
    }
  }

  async function updateReport(id: string, status: SmartReport["status"]) {
    if (!canUseAdmin) return;
    setActionError("");
    try {
      const updated = await citymindApi.admin.updateReportStatus(id, status);
      setReports((current) => current.map((report) => (report.id === id ? updated : report)));
    } catch (caught) {
      setActionError(apiErrorMessage(caught));
    }
  }

  async function updateAsset(id: string, status: AdminAsset["status"]) {
    if (!canUseAdmin) return;
    setActionError("");
    try {
      const updated = await citymindApi.admin.updateAssetStatus(id, status);
      setAssets((current) => current.map((asset) => (asset.id === id ? updated : asset)));
    } catch (caught) {
      setActionError(apiErrorMessage(caught));
    }
  }

  return (
    <div className="space-y-6">
      {loadState === "loading" ? <LoadingState label="جارٍ تحميل مساحة العمل التشغيلية" /> : null}

      {loadState === "error" ? (
        <ErrorState message={loadError} onRetry={() => setReloadToken((current) => current + 1)} />
      ) : null}

      {loadState === "forbidden" ? (
        <Panel
          title="وصول مقيّد"
          eyebrow="صلاحيات الجهات"
          action={<Badge tone="amber">{roleLabel(role)}</Badge>}
        >
          <EmptyState title="لا تملك صلاحية هذه المساحة" description={loadError} />
        </Panel>
      ) : null}

      <div aria-live="polite">
        {actionError ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm leading-6 text-rose-800" role="alert">
            {actionError}
          </p>
        ) : null}
        {actionNotice ? (
          <p className="rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm leading-6 text-teal-900" role="status">
            {actionNotice}
          </p>
        ) : null}
      </div>

      {canUseAdmin && overview ? (
        <>
          <section className={isAgencyRole ? "grid gap-4 md:grid-cols-3" : "grid gap-4 md:grid-cols-2 xl:grid-cols-5"}>
            <MetricCard label="البلاغات" value={String(overview.reports_total)} detail={`قائمة ${portalLabel(overview.portal_name)}`} tone="blue" />
            <MetricCard label="المفتوحة" value={String(overview.open_reports)} detail="عبء عمل ظاهر لهذه الجهة" tone="amber" />
            <MetricCard label="الحرجة" value={String(overview.monthly_summary.critical_reports)} detail={`ملخص ${overview.monthly_summary.month}`} tone="rose" />
            {!isAgencyRole ? (
              <>
                <MetricCard label="الإشعارات" value="متوقفة" detail="المزود غير مهيأ" tone="green" />
                <MetricCard label="GIS" value="تجريبي" detail="مصدر GIS الرسمي غير مهيأ" tone="blue" />
              </>
            ) : null}
          </section>

          <Panel title={portalLabel(overview.portal_name)} eyebrow="قواعد الظهور" action={<Badge tone="amber">لا يوجد مزود إرسال</Badge>}>
            <p className="mb-4 text-sm leading-6 text-slate-700">{roleGuidance(role)}</p>
            <div className={isAgencyRole ? "grid gap-4 lg:grid-cols-2" : "grid gap-4 lg:grid-cols-3"}>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">الفئات الظاهرة</p>
                <p className="mt-1 text-sm leading-6 text-slate-700">{visibleCategoryLabels}</p>
              </div>
              {!isAgencyRole ? (
                <div>
                  <p className="text-xs font-semibold uppercase text-slate-500">الملخص الشهري</p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">
                    {overview.monthly_summary.total_reports} بلاغات، {overview.monthly_summary.open_reports} مفتوحة، {overview.monthly_summary.critical_reports} حرجة.
                  </p>
                </div>
              ) : null}
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">{isAgencyRole ? "ملاحظة تشغيلية" : "حالة التكامل"}</p>
                <p className="mt-1 text-sm leading-6 text-slate-700">
                  {isAgencyRole
                    ? "هذه بوابة مراجعة تجريبية للبلاغات فقط؛ لا ترسل فرقًا ولا تنشئ تبليغًا رسميًا."
                    : `الإشعارات: ${statusLabelArabic(overview.notification_provider_status)}. GIS: ${statusLabelArabic(overview.official_gis_status)}.`}
                </p>
              </div>
            </div>
          </Panel>

          {canManageUsers ? (
            <Panel title="إدارة الصلاحيات" eyebrow="لرئيس البلدية فقط" action={<Badge tone="blue">{users.length} مستخدمين</Badge>}>
              <div className="grid gap-3 lg:grid-cols-[1fr_1fr_180px_180px_120px]">
                <input
                  aria-label="الاسم الكامل للمستخدم"
                  autoComplete="off"
                  className="min-w-0 rounded-md border border-slate-300 px-3 py-2 text-sm"
                  maxLength={255}
                  placeholder="الاسم الكامل"
                  value={newUser.full_name}
                  onChange={(event) => setNewUser((current) => ({ ...current, full_name: event.target.value }))}
                />
                <input
                  aria-label="البريد الإلكتروني للمستخدم"
                  autoComplete="off"
                  className="min-w-0 rounded-md border border-slate-300 px-3 py-2 text-sm"
                  dir="ltr"
                  maxLength={255}
                  placeholder="email@example.com"
                  type="email"
                  value={newUser.email}
                  onChange={(event) => setNewUser((current) => ({ ...current, email: event.target.value }))}
                />
                <input
                  aria-label="كلمة مرور مؤقتة (اتركها فارغة للإبقاء على الحالية)"
                  autoComplete="new-password"
                  className="min-w-0 rounded-md border border-slate-300 px-3 py-2 text-sm"
                  maxLength={128}
                  placeholder="كلمة مرور مؤقتة"
                  type="password"
                  value={newUser.password ?? ""}
                  onChange={(event) => setNewUser((current) => ({ ...current, password: event.target.value }))}
                />
                <select
                  aria-label="دور المستخدم"
                  className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={newUser.role}
                  onChange={(event) => setNewUser((current) => ({ ...current, role: event.target.value as CityMindUserRole }))}
                >
                  {assignableRoles.map((item) => (
                    <option key={item} value={item}>
                      {roleLabel(item)}
                    </option>
                  ))}
                </select>
                <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white" type="button" onClick={saveUser}>
                  حفظ الصلاحية
                </button>
              </div>

              <div className="mt-4 overflow-x-auto">
                <DataTable
                  rows={users}
                  getRowKey={(row) => row.email}
                  columns={[
                    { header: "المستخدم", cell: (row) => <span className="font-semibold">{row.full_name}</span> },
                    { header: "البريد", cell: (row) => row.email, className: "min-w-[220px] px-4 py-3" },
                    { header: "الصلاحية", cell: (row) => roleLabel(row.role) },
                    { header: "الحالة", cell: (row) => (row.is_active ? "نشط" : "غير نشط") },
                  ]}
                />
              </div>
            </Panel>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Panel
              title={isAgencyRole ? "طابور بلاغات الجهة" : "إدارة حالات البلاغات"}
              eyebrow="سير عمل مفلتر حسب الصلاحية"
              action={<Badge tone={filteredReports.length ? "blue" : "amber"}>{filteredReports.length} ظاهرة</Badge>}
            >
              <p className="mb-4 text-sm leading-6 text-slate-600">
                فلتر القائمة، اختر بلاغًا، وحدّث حالة الاستجابة من مكان واحد. تحتوي القائمة فقط على البلاغات الظاهرة لهذه الصلاحية.
              </p>
              <div className="mb-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_150px_190px_160px]">
                <input
                  className="h-10 min-w-0 rounded-md border border-slate-300 px-3 text-sm"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="ابحث بالرقم أو الموقع أو القسم"
                  aria-label="بحث في البلاغات"
                />
                <select
                  className="h-10 rounded-md border border-slate-300 px-3 text-sm"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  aria-label="فلتر الحالة"
                >
                  <option value="all">كل الحالات</option>
                  {reportStatuses.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
                <select
                  className="h-10 rounded-md border border-slate-300 px-3 text-sm"
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  aria-label="فلتر الفئة"
                >
                  <option value="all">كل الفئات الظاهرة</option>
                  {reportCategories
                    .filter((category) => overview.visible_categories.includes("all") || overview.visible_categories.includes(category.value))
                    .map((category) => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                </select>
                <select
                  className="h-10 rounded-md border border-slate-300 px-3 text-sm"
                  value={sortMode}
                  onChange={(event) => setSortMode(event.target.value as ReportSortMode)}
                  aria-label="ترتيب البلاغات"
                >
                  <option value="triage">الأولوية أولًا</option>
                  <option value="status">حسب الحالة</option>
                  <option value="newest">الأحدث</option>
                  <option value="oldest">الأقدم</option>
                </select>
              </div>
              {filteredReports.length ? (
                <>
                  <DataTable
                    rows={filteredReports.slice(0, 8)}
                    getRowKey={(row) => row.id}
                    columns={[
                      {
                        header: "البلاغ",
                        cell: (row) => (
                          <button
                            className="font-semibold text-teal-800 hover:text-teal-950"
                            type="button"
                            onClick={() => setSelectedReportId(row.id)}
                          >
                            {row.id}
                          </button>
                        ),
                      },
                      { header: "المنطقة", cell: (row) => reportLocationLabel(row), className: "min-w-[150px] px-4 py-3" },
                      { header: "الفئة", cell: (row) => categoryLabel(row.category), className: "min-w-[180px] px-4 py-3" },
                      { header: "القسم", cell: (row) => responsibleDeskLabel(row.category), className: "min-w-[190px] px-4 py-3" },
                      {
                        header: "الحالة",
                        cell: (row) => (
                          <select
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                            value={row.status}
                            onChange={(event) => updateReport(row.id, event.target.value as SmartReport["status"])}
                          >
                            {reportStatuses.map((status) => (
                              <option key={status.value} value={status.value}>
                                {status.label}
                              </option>
                            ))}
                          </select>
                        ),
                      },
                      { header: "الخطورة", cell: (row) => severityLabel(row.severity) },
                    ]}
                  />
                  {filteredReports.length > 8 ? (
                    <p className="mt-3 text-xs text-slate-500">تظهر أول 8 بلاغات حسب الترتيب الحالي. استخدم البحث أو الفلاتر لتضييق القائمة.</p>
                  ) : null}
                </>
              ) : (
                <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                  لا توجد بلاغات تطابق البحث والفلاتر الحالية لهذه الصلاحية. غيّر الفلتر أو امسح البحث لعرض الطابور المتاح.
                </div>
              )}
            </Panel>

            <Panel title={isAgencyRole ? "خريطة بلاغات الجهة" : "خريطة وتفاصيل مفلترة حسب الجهة"} eyebrow="بيانات خريطة تجريبية">
              {mappableReports.length ? (
                <CityMapCanvas
                  compact
                  focusSelected
                  showStatusBadges={false}
                  heightClassName="mb-5 min-h-[300px]"
                  activeLayers={{
                    neighborhoods: false,
                    reports: true,
                    waste: !isAgencyRole,
                    roads: !isAgencyRole,
                    lighting: !isAgencyRole,
                    pollution: !isAgencyRole,
                    greenRoutes: false,
                    traffic: false,
                    assets: false,
                  }}
                  issues={mappableReports}
                  routes={[]}
                  selected={selectedMapSelection}
                  onSelect={(selection: CityMapSelection) => {
                    if (selection.type === "issue") setSelectedReportId(selection.item.id);
                  }}
                />
              ) : (
                <div className="mb-5 rounded-md border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                  لا توجد إحداثيات خريطة للبلاغات المطابقة حاليًا. تبقى التفاصيل النصية متاحة عند ظهور نتائج في الطابور.
                </div>
              )}
              {selectedReport ? (
                <div className="mb-5 grid gap-4 rounded-md border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[190px_1fr]">
                  <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
                    {selectedReport.imageUrl ? (
                      <Image
                        alt={selectedReport.title}
                        className="h-44 w-full object-cover lg:h-full"
                        height={352}
                        src={selectedReport.imageUrl}
                        unoptimized
                        width={480}
                      />
                    ) : (
                      <div className="grid h-44 place-items-center px-4 text-center lg:h-full">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">بلاغ كتابي فقط</p>
                          <p className="mt-2 text-xs leading-5 text-slate-500">
                            لا توجد صورة مرفقة للمقارنة الميدانية، ويحتاج البلاغ إلى مراجعة لاحقة.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold uppercase text-slate-500">تفاصيل البلاغ</p>
                        <h3 className="mt-1 text-sm font-semibold text-slate-950">{selectedReport.title}</h3>
                      </div>
                      <Badge tone={selectedReport.severity === "critical" || selectedReport.severity === "high" ? "rose" : "amber"}>
                        {severityLabel(selectedReport.severity)}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{selectedReport.description}</p>
                    <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                      <div>
                        <dt className="text-slate-500">الفئة</dt>
                        <dd className="font-medium text-slate-800">{categoryLabel(selectedReport.category)}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">القسم المسؤول</dt>
                        <dd className="font-medium text-slate-800">{responsibleDeskLabel(selectedReport.category)}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">الحالة</dt>
                        <dd className="font-medium text-slate-800">{statusLabel(selectedReport.status)}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">الموقع</dt>
                        <dd className="font-medium text-slate-800">{reportLocationLabel(selectedReport)}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">مصدر الموقع</dt>
                        <dd className="font-medium text-slate-800">{locationSourceLabelArabic(selectedReport.locationSource)}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">تاريخ البلاغ</dt>
                        <dd className="font-medium text-slate-800">{formatReportDate(selectedReport.createdAt)}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">آخر تحديث</dt>
                        <dd className="font-medium text-slate-800">{formatReportDate(selectedReport.updatedAt)}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">التحليل</dt>
                        <dd className="font-medium text-slate-800">{statusLabelArabic(selectedReport.analysisStatus)}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">الإشعار</dt>
                        <dd className="font-medium text-slate-800">إشعار خارجي غير مهيأ</dd>
                      </div>
                    </dl>
                    {selectedReportChecklist ? (
                    <div className="mt-4 rounded-md border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-700">
                      <p className="font-semibold text-slate-950">{selectedReportChecklist.title}</p>
                      <ul className="mt-2 space-y-1">
                        {selectedReportChecklist.items.map((item) => (
                          <li key={item} className="flex gap-2">
                            <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-600" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    ) : null}
                    <div className="mt-4 rounded-md border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-700">
                      <p className="font-semibold text-slate-950">{escalationLabel(selectedReport.category)}</p>
                      <p className="mt-1">مراجعة يدوية مطلوبة قبل أي تواصل رسمي أو تغيير في حالة الاستجابة.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-5 rounded-md border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                  لا يوجد بلاغ محدد لأن الطابور الحالي فارغ.
                </div>
              )}

              {!isAgencyRole && overview.hotspots.length ? (
                <div className="mb-5">
                  <p className="mb-2 text-xs font-semibold uppercase text-slate-500">مناطق ساخنة</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {overview.hotspots.map((hotspot) => (
                      <div key={`${hotspot.slug}-${hotspot.category}`} className="rounded-md border border-slate-200 p-3">
                        <p className="text-sm font-semibold text-slate-900">{neighborhoodLabel(hotspot.name)}</p>
                        <p className="text-xs text-slate-600">
                          {categoryLabel(hotspot.category)} · {hotspot.open_reports} مفتوحة · المؤشر {hotspot.priority_score}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {canManageAssets ? (
                <>
                  <p className="mb-2 text-xs font-semibold uppercase text-slate-500">أصول المدينة</p>
              <DataTable
                rows={assets.slice(0, 8)}
                getRowKey={(row) => row.id}
                columns={[
                  { header: "الأصل", cell: (row) => <span className="font-semibold">{row.name}</span>, className: "min-w-[220px] px-4 py-3" },
                  { header: "النوع", cell: (row) => assetTypeLabel(row.asset_type) },
                  {
                    header: "الحالة",
                    cell: (row) => (
                      <select
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                        value={row.status}
                        onChange={(event) => updateAsset(row.id, event.target.value as AdminAsset["status"])}
                      >
                        {["active", "needs_maintenance", "inactive", "planned"].map((status) => (
                          <option key={status} value={status}>
                            {assetStatusLabel(status as AdminAsset["status"])}
                          </option>
                        ))}
                      </select>
                    ),
                  },
                ]}
              />
                </>
              ) : !isAgencyRole ? (
                <p className="text-sm leading-6 text-slate-600">إدارة أصول المدينة محصورة بصلاحيات البلدية.</p>
              ) : null}
            </Panel>
          </div>
        </>
      ) : (
        <Panel title="وصول آمن للمواطن" eyebrow="منطقة محمية" action={<Badge tone="green">بوابة المواطن تبقى متاحة</Badge>}>
          <p className="text-sm leading-6 text-slate-600">
            قوائم البلدية والجهات، والخرائط، والملخصات، وإدارة الصلاحيات مخفية إلى حين تسجيل الدخول بحساب رئيس بلدية أو بلدية أو جهة مختصة.
          </p>
        </Panel>
      )}
    </div>
  );
}
