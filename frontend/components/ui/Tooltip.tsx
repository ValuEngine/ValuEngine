"use client";

import { useState, useRef, useEffect } from "react";

interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

export default function Tooltip({ content, children }: TooltipProps) {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState<"top" | "bottom">("top");
  const triggerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (show && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      if (rect.top < 80) setPosition("bottom");
      else setPosition("top");
    }
  }, [show]);

  return (
    <span
      ref={triggerRef}
      className="relative inline-flex items-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={() => setShow(!show)}
    >
      {children}
      {show && (
        <span
          className={`absolute z-50 px-3 py-2 rounded-lg text-xs leading-relaxed max-w-[240px] w-max pointer-events-none animate-[fadeIn_0.15s_ease-out] ${
            position === "top" ? "bottom-full mb-2" : "top-full mt-2"
          }`}
          style={{
            background: "var(--bg-overlay)",
            border: "1px solid var(--border-default)",
            color: "var(--text-secondary)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          {content}
        </span>
      )}
    </span>
  );
}
