import { Suspense } from "react";
import ExportPanel from "@/components/ExportPanel";

export const metadata = { title: "Export | Mruda Eco Village" };

export default function ExportPage() {
  return (
    <Suspense fallback={null}>
      <ExportPanel />
    </Suspense>
  );
}
