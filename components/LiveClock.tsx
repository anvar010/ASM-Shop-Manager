"use client";

import { useEffect, useState } from "react";
import { formatClock } from "@/lib/format";

/**
 * The current time, ticking every second. Starts rendering nothing: the
 * server has no way to know the exact second this reaches the browser, so
 * guessing here would just be a value React immediately has to correct,
 * which is exactly what a hydration mismatch warning is for. Filling it in
 * after mount means the real clock appears a tick after the page does,
 * rather than a wrong one appearing and jumping.
 */
export default function LiveClock({ className }: { className?: string }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) return null;
  return <span className={className}>{formatClock(now)}</span>;
}
