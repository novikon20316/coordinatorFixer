import { he } from "@admin-coordinator/shared";

export default function ReportsPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
      <h1 className="text-2xl font-bold text-gray-900">{he.menu.reports}</h1>
      <p className="text-gray-500">{he.common.comingSoon}</p>
    </div>
  );
}
