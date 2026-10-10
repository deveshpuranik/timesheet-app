"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/kit";

// A button for actions that cannot be undone: the first click asks, the second confirms.
export default function ConfirmButton({ children, confirmLabel = "Confirm", onConfirm, busy = false, busyLabel = "Working…", variant = "danger", size = "sm" }) {
  const [asking, setAsking] = useState(false);

  // Step back by itself if the person does not confirm within a few seconds.
  useEffect(() => {
    if (!asking) return undefined;
    const timer = setTimeout(() => setAsking(false), 4000);
    return () => clearTimeout(timer);
  }, [asking]);

  if (busy) {
    return (
      <Button variant={variant} size={size} disabled>
        {busyLabel}
      </Button>
    );
  }

  if (!asking) {
    return (
      <Button variant={variant} size={size} onClick={() => setAsking(true)}>
        {children}
      </Button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <Button
        variant="dark"
        size={size}
        onClick={() => {
          setAsking(false);
          onConfirm();
        }}
      >
        {confirmLabel}
      </Button>
      <Button variant="ghost" size={size} onClick={() => setAsking(false)}>
        Keep
      </Button>
    </span>
  );
}
