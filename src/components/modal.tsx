"use client";

import { cn } from "cn";
import { useEffect, useRef } from "react";

/**
 * Native <dialog> shown as a bottom sheet on phones and a centered window
 * on desktop. The browser handles focus trapping, Escape and the backdrop.
 */
export function Modal({
  open,
  onClose,
  labelledBy,
  describedBy,
  alert = false,
  placement = "sheet",
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  describedBy?: string;
  /** Confirmation of a destructive action. */
  alert?: boolean;
  /** "sheet": bottom sheet on phones; "center": centered everywhere. */
  placement?: "sheet" | "center";
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      role={alert ? "alertdialog" : undefined}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      onClose={onClose}
      onClick={(e) => {
        // A click on the backdrop lands on the <dialog> element itself.
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "max-h-[92dvh] overflow-y-auto bg-parchment p-0 text-ink shadow-[0_6px_0_rgb(4_22_33/0.5)]",
        placement === "sheet"
          ? "mx-0 mt-auto mb-0 w-full max-w-none rounded-t-[22px] lg:m-auto lg:w-[520px] lg:rounded-[20px]"
          : "m-auto w-[calc(100%-48px)] max-w-[460px] rounded-[20px]",
        className,
      )}
    >
      {open && children}
    </dialog>
  );
}

/** The grab handle of a bottom sheet (phones only). */
export function SheetHandle() {
  return (
    <span
      aria-hidden="true"
      className="mx-auto mb-1 block h-[5px] w-10 rounded-full bg-line lg:hidden"
    />
  );
}
