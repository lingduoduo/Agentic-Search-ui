import { useEffect } from "react";
import type { RefObject } from "react";

const FOCUSABLE = "a[href], button:not([disabled]), input, textarea, select";

/**
 * Modal dialog keyboard behavior: Escape closes, and Tab wraps at either end so
 * focus stays inside `panel` while it is open.
 */
export function useFocusTrap(panel: RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !panel.current) return;
      const focusable = panel.current.querySelectorAll<HTMLElement>(FOCUSABLE);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first) return;
      const inside = panel.current.contains(document.activeElement);
      if (event.shiftKey && (!inside || document.activeElement === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (!inside || document.activeElement === last)) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [panel, onClose]);
}
