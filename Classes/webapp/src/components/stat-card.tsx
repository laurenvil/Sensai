import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  color: "indigo" | "green" | "purple" | "amber" | "red" | "blue";
  subtitle?: string;
}

const COLOR_MAP: Record<StatCardProps["color"], string> = {
  indigo:
    "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400",
  green:
    "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400",
  purple:
    "bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400",
  amber:
    "bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400",
  red: "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400",
  blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400",
};

export function StatCard({ icon: Icon, label, value, color, subtitle }: StatCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${COLOR_MAP[color]}`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
          {subtitle && (
            <p className="text-[10px] text-gray-400 dark:text-gray-500">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
