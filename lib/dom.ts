import type { MouseEvent } from "react";

/**
 * Native `<input type="date">` only reliably opens its picker when you
 * click the calendar-icon segment (Firefox/Safari) or the exact text
 * segment (older Chrome) — clicking elsewhere in the field just moves the
 * caret. `showPicker()` (Chrome/Edge 99+, Firefox 101+, Safari 16.4+)
 * forces it open from anywhere in the field; unsupported browsers just
 * fall back to normal focus/caret behavior via the `?.`.
 */
export function openDatePicker(event: MouseEvent<HTMLInputElement>) {
  const input = event.currentTarget;
  if (!input.disabled) input.showPicker?.();
}
