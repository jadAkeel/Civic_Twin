import { AdminWorkspace } from "@/features/admin/admin-workspace";
import { PageHeader } from "@/components/page/page-header";

export default function AdminPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Municipality Admin Panel"
        title="Tripoli municipal operations"
        description="Role-ready local auth, report status operations, city asset management, and review counts."
        status="Municipality"
      />

      <AdminWorkspace />
    </div>
  );
}
