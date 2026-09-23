import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { motion as Motion, useReducedMotion } from "framer-motion";
import UserProfileView from "../../../components/user/UserProfileView";

const UserProfileDrawer = ({ open, userId, onClose, buttonClassName, maxWidthClass = "max-w-3xl" }) => {
  const panelRef = useRef(null);
  const returnFocusRef = useRef(null);
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    if (!open) return undefined;
    returnFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const controls = panelRef.current?.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (!controls?.length) return;
      const first = controls[0]; const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      returnFocusRef.current?.focus?.();
    };
  }, [onClose, open]);
  if (!open || !userId) return null;

  return createPortal(
    <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[calc(var(--z-overlay)+10)] flex justify-end bg-slate-950/55 backdrop-blur-sm dark:bg-black/75" onMouseDown={onClose}>
      <Motion.div ref={panelRef} tabIndex={-1} initial={{ x: reduceMotion ? 0 : "100%" }} animate={{ x: 0 }} transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeOut" }} role="dialog" aria-modal="true" aria-label="User profile" className={`h-full w-full max-w-full ${maxWidthClass} overflow-y-auto border-l border-[var(--border-soft)] bg-[var(--surface)] p-3.5 text-[var(--text-main)] shadow-[var(--shadow-lg)] sm:p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]`} onMouseDown={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-[var(--text-main)]">User Profile</h2>
            <p className="text-sm text-[var(--text-muted)]">Account details, roles, and assignments</p>
          </div>
          <button type="button" className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border-soft)] bg-[var(--surface-soft)] text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-main)] ${buttonClassName || ""}`} onClick={onClose} aria-label="Close profile drawer">
            <X size={16} />
          </button>
        </div>
        <UserProfileView userId={Number(userId)} mode="drawer" />
      </Motion.div>
    </Motion.div>,
    document.body
  );
};

export default UserProfileDrawer;
