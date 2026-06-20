"use client";

import { useEffect, useRef, useState } from "react";

export function StatCounter({
  value,
  suffix = "",
  prefix = "",
  decimals = 0,
  label,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  label: string;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const duration = 1500;
          const start = performance.now();
          const tick = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 4);
            setCount(eased * value);
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.4 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);

  return (
    <div ref={ref} className="text-center">
      <div className="font-display text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
        {prefix}
        {count
          .toFixed(decimals)
          .replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
        {suffix}
      </div>
      <div className="mt-1 text-sm font-medium text-surface-300/80">
        {label}
      </div>
    </div>
  );
}
