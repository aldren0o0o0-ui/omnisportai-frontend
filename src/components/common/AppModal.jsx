import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const AppModal = ({
  open,
  onClose,
  title,
  subtitle = "",
  children,
  footer = null,
  maxWidthClass = "max-w-5xl",
  variant = "modal",
  bodyClassName = "",
  panelClassName = "",
  overlayClassName = "",
  closeButtonLabel = "Close modal",
  initialFocusRef = null,
  fallbackFocusRef = null,
  describedById = "",
  drawerResizable = false,
  drawerDefaultWidth = 560,
  drawerMinWidth = 380,
  drawerMaxWidth = 960,
}) => {
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const previouslyFocusedRef = useRef(null);
  const titleId = useId();
  const subtitleId = useId();
  const [drawerWidth, setDrawerWidth] = useState(drawerDefaultWidth);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const fallbackFocusTarget = fallbackFocusRef?.current || null;

    const body = document.body;
    const docEl = document.documentElement;
    const previousBodyOverflow = body.style.overflow;
    const previousDocOverflow = docEl.style.overflow;
    body.style.overflow = "hidden";
    docEl.style.overflow = "hidden";

    const focusDialog = () => {
      const target = initialFocusRef?.current || closeButtonRef.current || dialogRef.current;
      if (target && typeof target.focus === "function") {
        target.focus({ preventScroll: true });
      }
    };

    const frameId = window.requestAnimationFrame(focusDialog);

    const getFocusableElements = () => {
      const root = dialogRef.current;
      if (!root) return [];
      const selector = [
        "button:not([disabled])",
        "[href]",
        "input:not([disabled])",
        "select:not([disabled])",
        "textarea:not([disabled])",
        "[tabindex]:not([tabindex='-1'])",
        "summary",
      ].join(",");
      return Array.from(root.querySelectorAll(selector)).filter(
        (node) => node instanceof HTMLElement && !node.hasAttribute("disabled") && node.getAttribute("aria-hidden") !== "true"
      );
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onCloseRef.current?.();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = getFocusableElements();
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current?.focus?.();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("keydown", handleKeyDown);
      body.style.overflow = previousBodyOverflow;
      docEl.style.overflow = previousDocOverflow;
      const previous = previouslyFocusedRef.current;
      if (previous && typeof previous.focus === "function" && document.contains(previous)) {
        previous.focus({ preventScroll: true });
      } else if (fallbackFocusTarget && typeof fallbackFocusTarget.focus === "function") {
        fallbackFocusTarget.focus({ preventScroll: true });
      }
    };
  }, [fallbackFocusRef, initialFocusRef, open]);

  useEffect(() => {
    if (!open || variant !== "drawer" || !drawerResizable) return undefined;
    const clampWidth = () => {
      if (window.innerWidth < 640) return;
      const available = Math.max(drawerMinWidth, window.innerWidth - 48);
      setDrawerWidth((width) => Math.min(Math.max(width, drawerMinWidth), Math.min(drawerMaxWidth, available)));
    };
    clampWidth();
    window.addEventListener("resize", clampWidth);
    return () => window.removeEventListener("resize", clampWidth);
  }, [drawerMaxWidth, drawerMinWidth, drawerResizable, open, variant]);

  const beginDrawerResize = (event) => {
    if (!drawerResizable || window.innerWidth < 640) return;
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = drawerWidth;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";
    const handleMove = (moveEvent) => {
      const available = Math.max(drawerMinWidth, window.innerWidth - 48);
      const nextWidth = startWidth + (startX - moveEvent.clientX);
      setDrawerWidth(Math.min(Math.max(nextWidth, drawerMinWidth), Math.min(drawerMaxWidth, available)));
    };
    const handleUp = () => {
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp, { once: true });
  };

  const resizeDrawerFromKeyboard = (event) => {
    if (!drawerResizable || !["ArrowLeft", "ArrowRight", "Home"].includes(event.key)) return;
    event.preventDefault();
    const available = Math.max(drawerMinWidth, window.innerWidth - 48);
    const maximum = Math.min(drawerMaxWidth, available);
    if (event.key === "Home") setDrawerWidth(drawerDefaultWidth);
    else setDrawerWidth((width) => Math.min(Math.max(width + (event.key === "ArrowLeft" ? 24 : -24), drawerMinWidth), maximum));
  };

  if (!open) return null;

  const isDrawer = variant === "drawer";
  const overlayClasses = isDrawer
    ? "justify-end items-stretch bg-slate-950/45 px-0 py-0 sm:bg-slate-950/50"
    : "items-center justify-center bg-slate-950/50 p-3 sm:p-4 md:p-6";
  const panelClasses = isDrawer
    ? `h-[100dvh] w-full max-w-full rounded-none border-l border-[var(--border-soft)] sm:rounded-l-[var(--radius-lg)] sm:rounded-r-none ${drawerResizable ? "sm:w-[min(90vw,var(--drawer-width))]" : "sm:w-[min(90vw,720px)] lg:w-[min(560px,100vw)]"}`
    : `max-h-[calc(100dvh-1.5rem)] sm:max-h-[92vh] w-full max-w-[calc(100vw-1.5rem)] sm:max-w-none overflow-hidden rounded-[var(--radius-lg)] ${maxWidthClass}`;
  const bodyClasses = isDrawer
    ? `h-[calc(100dvh-73px)] overflow-y-auto overscroll-contain pb-[max(1rem,env(safe-area-inset-bottom))] ${bodyClassName}`
    : `max-h-[calc(100dvh-7.5rem)] sm:max-h-[calc(92vh-84px)] overflow-y-auto p-4 sm:p-5 md:p-6 ${bodyClassName}`;

  return createPortal(
    <div
      className={`fixed inset-0 z-[calc(var(--z-overlay)+10)] flex backdrop-blur-sm ${overlayClasses} ${overlayClassName}`}
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={describedById || (subtitle ? subtitleId : undefined)}
        tabIndex={-1}
        style={isDrawer && drawerResizable ? { "--drawer-width": `${drawerWidth}px` } : undefined}
        className={`relative overflow-hidden border border-[var(--border-soft)] bg-[var(--surface)] shadow-[var(--shadow-lg)] outline-none ${panelClasses} ${panelClassName}`}
        onClick={(event) => event.stopPropagation()}
      >
        {isDrawer && drawerResizable ? (
          <div
            role="separator"
            aria-label="Resize drawer"
            aria-orientation="vertical"
            aria-valuemin={drawerMinWidth}
            aria-valuemax={drawerMaxWidth}
            aria-valuenow={Math.round(drawerWidth)}
            tabIndex={0}
            onPointerDown={beginDrawerResize}
            onKeyDown={resizeDrawerFromKeyboard}
            onDoubleClick={() => setDrawerWidth(drawerDefaultWidth)}
            className="absolute inset-y-0 left-0 z-20 hidden w-2 -translate-x-1/2 cursor-col-resize touch-none outline-none after:absolute after:inset-y-0 after:left-1/2 after:w-px after:bg-transparent hover:after:bg-blue-500 focus-visible:after:bg-blue-500 sm:block"
            title="Drag to resize. Use arrow keys when focused; double-click to reset."
          />
        ) : null}
        <div className="flex items-start justify-between border-b border-[var(--border-soft)] px-4 py-3.5 sm:px-5 sm:py-4">
          <div className="min-w-0 flex-1 mr-3">
            <h2 id={titleId} className="text-base sm:text-lg font-semibold text-[var(--text-main)] truncate">{title}</h2>
            {subtitle ? (
              <p id={subtitleId} className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-[var(--text-muted)] line-clamp-2">{subtitle}</p>
            ) : null}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] text-[var(--text-muted)] transition-colors duration-150 hover:bg-[var(--surface-muted)] motion-reduce:transition-none"
            aria-label={closeButtonLabel}
          >
            <X size={16} />
          </button>
        </div>

        <div className={bodyClasses}>
          {children}
        </div>

        {footer ? (
          <div className="border-t border-[var(--border-soft)] bg-[var(--surface-soft)] px-4 py-3 sm:px-5 sm:py-3.5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body
  );
};

export default AppModal;
