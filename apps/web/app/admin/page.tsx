import { AdminWorkspace } from "@/features/admin/admin-workspace";
import { PageHeader } from "@/components/page/page-header";

export default function AdminPage() {
  return (
    <div>
      <PageHeader
        eyebrow="لوحة الوصول التشغيلي"
        title="بوابات الجهات في طرابلس"
        description="مساحة تجريبية محلية تعرض لكل جهة البلاغات المرتبطة بصلاحيتها فقط، مع فصل أدوات البلدية عن بوابات الشرطة والصليب الأحمر والدفاع المدني."
        status="تراعي صلاحيات الجهات"
      />

      <AdminWorkspace />
    </div>
  );
}
