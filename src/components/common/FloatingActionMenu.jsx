import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const FloatingActionMenu = ({
  label = "Action",
  disabled = false,
  actions = [],
  align = "right",
  buttonClassName = "",
}) => {
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const menuWidth = 160;
    const left =
      align === "right"
        ? Math.max(8, rect.right - menuWidth)
        : Math.max(8, rect.left);
    setPosition({
      top: rect.bottom + 8,
      left,
    });
  }, [align]);

  useEffect(() => {
    if (!open) return undefined;
    updatePosition();

    const handlePointerDown = (event) => {
      const target = event.target;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, updatePosition]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          if (disabled) return;
          updatePosition();
          setOpen((current) => !current);
        }}
        className={
          buttonClassName ||
          "rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-700 disabled:opacity-60 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
        }
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {label}
      </button>

      {open
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              className="fixed z-[9999] w-40 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-left shadow-2xl ring-1 ring-slate-900/5 dark:border-slate-700 dark:bg-slate-900 dark:ring-white/10"
              style={{ top: position.top, left: position.left }}
            >
              {actions.map((action) => (
                <button
                  key={action.key}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    action.onClick?.();
                  }}
                  className={`block w-full px-3 py-2 text-left text-xs font-semibold transition ${
                    action.className ||
                    "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  }`}
                  disabled={action.disabled}
                >
                  {action.label}
                </button>
              ))}
            </div>,
            document.body
          )
        : null}
    </>
  );
};

export default FloatingActionMenu;
