import { AdminWorkspace } from "@/features/admin/admin-workspace";
import { PageHeader } from "@/components/page/page-header";

export default function AdminPage() {
  return (
    <div>
      <PageHeader
        eyebrow="لوحة الوصول التشغيلي"
        title="عمليات بلدية طرابلس"
        description="بوابات تجريبية محلية لرئيس البلدية والبلدية والشرطة والصليب الأحمر والدفاع المدني، مع قوائم بلاغات مفلترة حسب الصلاحية."
        status="تراعي صلاحيات الجهات"
      />

      <AdminWorkspace />
    </div>
  );
}
