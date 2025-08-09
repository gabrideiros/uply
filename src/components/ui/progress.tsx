import React from "react";

interface ProgressBarProps {
  progress: number;
  className?: string;
  barClassName?: string;
}

export function ProgressBar({
  progress,
  className = "",
  barClassName = "",
}: ProgressBarProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div
      role="progressbar"
      aria-valuenow={clampedProgress}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`h-2 rounded-full bg-gray-200 overflow-hidden ${className}`}
    >
      <div
        className={`h-full rounded-full bg-emerald-300 transition-all duration-300 ease-out ${barClassName}`}
        style={{ width: `${clampedProgress}%` }}
      />
    </div>
  );
}
