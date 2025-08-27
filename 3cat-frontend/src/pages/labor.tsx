import { LaborDashboard } from "@/features/labor/components/LaborDashboard";

export default function LaborPage() {
  return (
    <div className="flex flex-col gap-6 p-6 md:gap-8">
      <LaborDashboard defaultLocationId={435860} />
    </div>
  );
}