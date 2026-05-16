"use client";

interface ProgressBarProps {
  value: number;
  max: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  animate?: boolean;
  className?: string;
}

export function ProgressBar({
  value,
  max,
  size = "md",
  showLabel = true,
  animate = true,
  className = "",
}: ProgressBarProps) {
  const percentage = max > 0 ? Math.round((value / max) * 100) : 0;

  const heightMap = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-4",
  };

  const colorClass =
    percentage >= 80
      ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
      : percentage >= 50
      ? "bg-gradient-to-r from-amber-500 to-amber-400"
      : percentage > 0
      ? "bg-gradient-to-r from-red-500 to-red-400"
      : "bg-gray-300 dark:bg-gray-700";

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className={`flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800 ${heightMap[size]}`}
      >
        <div
          className={`${heightMap[size]} rounded-full ${colorClass} ${
            animate ? "transition-all duration-700 ease-out" : ""
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <span className="shrink-0 text-xs font-semibold tabular-nums text-gray-600 dark:text-gray-400">
          {percentage}%
        </span>
      )}
    </div>
  );
}
