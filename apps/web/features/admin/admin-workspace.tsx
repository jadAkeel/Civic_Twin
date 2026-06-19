"use client";

import { useEffect, useMemo, useState } from "react";
import type { SmartReport } from "@citymind/shared";

import { CityMapCanvas, type CityMapSelection } from "@/components/map/city-map-canvas";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { MetricCard } from "@/components/ui/metric-card";
import { Panel } from "@/components/ui/panel";
import { categoryLabel, fallbackReports, reportCategories, reportStatuses, statusLabel } from "@/features/reports/report-options";
import type { TripoliIssueMarker } from "@/features/map/tripoli-map-data";
import { citymindApi, type AdminAsset, type AdminOverview, type AuthLoginResponse, type CityMindUser, type CityMindUserRole } from "@/lib/api-client";
import { neighborhoodLabel, roleLabel, severityLabel, statusLabelArabic } from "@/lib/display-labels";

const fallbackOverview: AdminOverview = {
  portal_name: "بوابة البلدية",
  role: "owner",
  visible_categories: ["all"],
  visibility_note: "احتياطي تجريبي محلي؛ سجّل الدخول لتحميل القوائم المفلترة من API.",
  notification_provider_status: "not_configured",
  official_gis_status: "not_configured",
  reports_total: 20,
  assets_total: 10,
  open_reports: 19,
  pending_scenarios: 5,
  active_predictions: 8,
  monthly_summary: {
    month: "حزيران 2026",
    total_reports: 20,
    open_reports: 19,
    critical_reports: 1,
    source: "demo_seed",
  },
  hotspots: [
    {
      name: "باب التبانة",
      slug: "bab-al-tebbaneh",
      category: "waste",
      total_reports: 1,
      open_reports: 1,
      critical_reports: 1,
      priority_score: 15,
    },
  ],
};

const fallbackAssets: AdminAsset[] = [
  { id: "asset-1", name: "مقطع طريق ساحلي في الميناء", asset_type: "road", status: "active", neighborhood_slug: "al-mina" },
  { id: "asset-2", name: "مسار مشاة تراثي في الأسواق القديمة", asset_type: "sidewalk", status: "needs_maintenance", neighborhood_slug: "old-souks" },
];

const STORAGE_KEY = "citymind.localSession";
const operationsRoles: CityMindUserRole[] = ["owner", "municipality_admin", "decision_maker", "analyst", "police", "red_cross", "civil_defense"];
const municipalityRoles: CityMindUserRole[] = ["owner", "municipality_admin", "decision_maker", "analyst"];
const assignableRoles: CityMindUserRole[] = ["citizen", "municipality_admin", "decision_maker", "analyst", "police", "red_cross", "civil_defense", "owner"];

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

export function AdminWorkspace() {
  const [email, setEmail] = useState("jadakeel05@gmail.com");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [role, setRole] = useState<CityMindUserRole | "not signed in">("not signed in");
  const [overview, setOverview] = useState(fallbackOverview);
  const [reports, setReports] = useState<SmartReport[]>(fallbackReports);
  const [assets, setAssets] = useState<AdminAsset[]>(fallbackAssets);
  const [users, setUsers] = useState<CityMindUser[]>([]);
  const [source, setSource] = useState<"api" | "locked">("locked");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedReportId, setSelectedReportId] = useState(fallbackReports[0]?.id ?? "");
  const [authError, setAuthError] = useState("");
  const [newUser, setNewUser] = useState<CityMindUser>({
    full_name: "",
    email: "",
    role: "citizen",
    password: "",
    is_active: true,
  });

  const filteredReports = useMemo(
    () =>
      reports.filter(
        (report) =>
          (statusFilter === "all" || report.status === statusFilter) &&
          (categoryFilter === "all" || report.category === categoryFilter),
      ),
    [categoryFilter, reports, statusFilter],
  );

  const selectedReport = reports.find((report) => report.id === selectedReportId) ?? reports[0];
  const canUseAdmin = operationsRoles.includes(role as CityMindUserRole) && Boolean(token);
  const canManageUsers = role === "owner" && Boolean(token);
  const canManageAssets = municipalityRoles.includes(role as CityMindUserRole) && Boolean(token);
  const visibleCategoryLabels = overview.visible_categories.includes("all")
    ? "كل فئات البلاغات"
    : overview.visible_categories
        .filter((category) => category !== "all")
        .map((category) => categoryLabel(category))
        .join("، ");
  const mappableReports = filteredReports
    .filter((report) => report.latitude != null && report.longitude != null)
    .map((report): TripoliIssueMarker => ({
      id: report.id,
      title: report.title,
      description: report.description,
      category: report.category,
      severity: report.severity,
      status: report.status === "duplicate" || report.status === "rejected" ? "resolved" : report.status,
      neighborhood: report.neighborhood,
      neighborhoodSlug: report.neighborhoodSlug ?? "manual-location",
      latitude: report.latitude ?? 0,
      longitude: report.longitude ?? 0,
    }));
  const selectedMappableReport = mappableReports.find((report) => report.id === selectedReportId);
  const selectedMapSelection: CityMapSelection | null = selectedMappableReport
    ? { type: "issue", item: selectedMappableReport }
    : null;

  useEffect(() => {
    if (!filteredReports.length || filteredReports.some((report) => report.id === selectedReportId)) return;
    setSelectedReportId(filteredReports[0].id);
  }, [filteredReports, selectedReportId]);

  useEffect(() => {
    const rawSession = window.localStorage.getItem(STORAGE_KEY);
    if (!rawSession) return;

    try {
      const savedSession = JSON.parse(rawSession) as AuthLoginResponse;
      setEmail(savedSession.user.email);
      void loadAdminData(savedSession);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  async function loadAdminData(auth: AuthLoginResponse) {
    setRole(auth.user.role);

    if (!operationsRoles.includes(auth.user.role)) {
      setToken("");
      setSource("locked");
      setAuthError("هذا الحساب مخصص للمواطن فقط ولا يمكنه الوصول إلى عمليات الجهات أو البلدية.");
      return;
    }

    const [adminOverview, adminReports, adminAssets, ownerUsers] = await Promise.all([
      citymindApi.admin.overview(auth.access_token),
      citymindApi.admin.reports(auth.access_token),
      municipalityRoles.includes(auth.user.role) ? citymindApi.admin.assets(auth.access_token) : Promise.resolve([]),
      auth.user.role === "owner" ? citymindApi.admin.users(auth.access_token) : Promise.resolve([]),
    ]);

    setToken(auth.access_token);
    setOverview(adminOverview);
    setReports(adminReports);
    setSelectedReportId(adminReports[0]?.id ?? "");
    setAssets(adminAssets);
    setUsers(ownerUsers);
    setSource("api");
    setAuthError("");
  }

  async function login() {
    try {
      const auth = await citymindApi.auth.login(email, password);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
      setPassword("");
      await loadAdminData(auth);
    } catch {
      setToken("");
      setRole("not signed in");
      setSource("locked");
      setAuthError("تم رفض الوصول. استخدم حسابًا تجريبيًا لرئيس البلدية أو البلدية أو جهة مختصة.");
    }
  }

  async function saveUser() {
    if (!canManageUsers || !newUser.email.trim()) return;
    const saved = await citymindApi.admin.upsertUser(token, newUser);
    setUsers((current) => {
      const exists = current.some((user) => user.email === saved.email);
      return exists ? current.map((user) => (user.email === saved.email ? saved : user)) : [...current, saved];
    });
    setNewUser({ full_name: "", email: "", role: "citizen", password: "", is_active: true });
  }

  async function updateReport(id: string, status: SmartReport["status"]) {
    if (!canUseAdmin) return;
    const updated = await citymindApi.admin.updateReportStatus(token, id, status);
    setReports((current) => current.map((report) => (report.id === id ? updated : report)));
  }

  async function updateAsset(id: string, status: AdminAsset["status"]) {
    if (!canUseAdmin) return;
    const updated = await citymindApi.admin.updateAssetStatus(token, id, status);
    setAssets((current) => current.map((asset) => (asset.id === id ? updated : asset)));
  }

  return (
    <div className="space-y-6">
      {!canUseAdmin ? (
        <Panel title="دخول رئيس البلدية والبلدية والجهات" eyebrow="وصول محلي" action={<Badge tone={source === "api" ? "green" : "amber"}>{roleLabel(role)}</Badge>}>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-label="بريد الإدارة"
              type="email"
            />
            <input
              className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-label="كلمة مرور الإدارة"
              placeholder="كلمة المرور"
              type="password"
            />
            <button className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white" type="button" onClick={login}>
              تسجيل دخول محلي
            </button>
          </div>
          {authError ? <p className="mt-3 text-sm font-medium text-rose-700">{authError}</p> : null}
        </Panel>
      ) : null}

      {canUseAdmin ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <MetricCard label="البلاغات" value={String(overview.reports_total)} detail={`قائمة ${portalLabel(overview.portal_name)}`} tone="blue" />
            <MetricCard label="المفتوحة" value={String(overview.open_reports)} detail="عبء عمل ظاهر لهذه الجهة" tone="amber" />
            <MetricCard label="الحرجة" value={String(overview.monthly_summary.critical_reports)} detail={`ملخص ${overview.monthly_summary.month}`} tone="rose" />
            <MetricCard label="الإشعارات" value="متوقفة" detail="المزود غير مهيأ" tone="green" />
            <MetricCard label="GIS" value="تجريبي" detail="مصدر GIS الرسمي غير مهيأ" tone="blue" />
          </section>

          <Panel title={portalLabel(overview.portal_name)} eyebrow="قواعد الظهور" action={<Badge tone="amber">لا يوجد مزود إرسال</Badge>}>
            <div className="grid gap-4 lg:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">الفئات الظاهرة</p>
                <p className="mt-1 text-sm leading-6 text-slate-700">{visibleCategoryLabels}</p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">الملخص الشهري</p>
                <p className="mt-1 text-sm leading-6 text-slate-700">
                  {overview.monthly_summary.total_reports} بلاغات، {overview.monthly_summary.open_reports} مفتوحة، {overview.monthly_summary.critical_reports} حرجة.
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">حالة التكامل</p>
                <p className="mt-1 text-sm leading-6 text-slate-700">
                  الإشعارات: {statusLabelArabic(overview.notification_provider_status)}. GIS: {statusLabelArabic(overview.official_gis_status)}.
                </p>
              </div>
            </div>
          </Panel>

          {canManageUsers ? (
            <Panel title="إدارة الصلاحيات" eyebrow="لرئيس البلدية فقط" action={<Badge tone="blue">{users.length} مستخدمين</Badge>}>
              <div className="grid gap-3 lg:grid-cols-[1fr_1fr_180px_180px_120px]">
                <input
                  className="min-w-0 rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="الاسم الكامل"
                  value={newUser.full_name}
                  onChange={(event) => setNewUser((current) => ({ ...current, full_name: event.target.value }))}
                />
                <input
                  className="min-w-0 rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="email@example.com"
                  value={newUser.email}
                  onChange={(event) => setNewUser((current) => ({ ...current, email: event.target.value }))}
                />
                <input
                  className="min-w-0 rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="كلمة مرور مؤقتة"
                  type="password"
                  value={newUser.password ?? ""}
                  onChange={(event) => setNewUser((current) => ({ ...current, password: event.target.value }))}
                />
                <select
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
            <Panel title="إدارة حالات البلاغات" eyebrow="سير عمل مفلتر حسب الجهة">
              <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_180px_220px]">
                <p className="text-sm leading-6 text-slate-600">
                  فلتر القائمة، اختر بلاغًا، وحدّث حالة الاستجابة من مكان واحد. تحتوي القائمة فقط على البلاغات الظاهرة لهذه الصلاحية.
                </p>
                <select
                  className="h-10 rounded-md border border-slate-300 px-3 text-sm"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
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
              </div>
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
                  { header: "المنطقة", cell: (row) => neighborhoodLabel(row.neighborhood) },
                  { header: "الفئة", cell: (row) => categoryLabel(row.category), className: "min-w-[180px] px-4 py-3" },
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
            </Panel>

            <Panel title="خريطة وتفاصيل مفلترة حسب الجهة" eyebrow="بيانات خريطة تجريبية">
              {mappableReports.length ? (
                <CityMapCanvas
                  compact
                  focusSelected
                  showStatusBadges={false}
                  heightClassName="mb-5 min-h-[300px]"
                  activeLayers={{
                    neighborhoods: false,
                    reports: true,
                    waste: true,
                    roads: true,
                    lighting: true,
                    pollution: true,
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
              ) : null}
              {selectedReport ? (
                <div className="mb-5 grid gap-4 rounded-md border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[190px_1fr]">
                  <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
                    {selectedReport.imageUrl ? (
                      <img
                        alt={selectedReport.title}
                        className="h-44 w-full object-cover lg:h-full"
                        src={selectedReport.imageUrl}
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
                  <p className="text-xs font-semibold uppercase text-slate-500">تفاصيل البلاغ</p>
                  <h3 className="mt-1 text-sm font-semibold text-slate-950">{selectedReport.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{selectedReport.description}</p>
                  <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-slate-500">الفئة</dt>
                      <dd className="font-medium text-slate-800">{categoryLabel(selectedReport.category)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">الحالة</dt>
                      <dd className="font-medium text-slate-800">{statusLabel(selectedReport.status)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">التحليل</dt>
                      <dd className="font-medium text-slate-800">{statusLabelArabic(selectedReport.analysisStatus)}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">الإشعار</dt>
                      <dd className="font-medium text-slate-800">غير مهيأ</dd>
                    </div>
                  </dl>
                  </div>
                </div>
              ) : null}

              {overview.hotspots.length ? (
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
              ) : (
                <p className="text-sm leading-6 text-slate-600">إدارة أصول المدينة محصورة بصلاحيات البلدية.</p>
              )}
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
