import { PageHeader } from "@/components/page/page-header";
import { AssistantWorkspace } from "@/features/assistant/assistant-workspace";

export default function AskCityPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Ask Your City"
        title="Grounded Tripoli city assistant"
        description="Mock-provider assistant that answers only from loaded CityMind Tripoli data and refuses unavailable facts."
        status="Resident portal"
      />

      <AssistantWorkspace />
    </div>
  );
}
