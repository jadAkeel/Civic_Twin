import { PageHeader } from "@/components/page/page-header";
import { SmartReporterWorkspace } from "@/components/reports/smart-reporter-workspace";

export default function ReportsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Smart Reporter"
        title="Report a Tripoli city issue"
        description="Submit a citizen report, choose the exact map location, attach a local photo preview, and follow the municipal response status."
        status="Resident portal"
      />

      <SmartReporterWorkspace />
    </div>
  );
}
