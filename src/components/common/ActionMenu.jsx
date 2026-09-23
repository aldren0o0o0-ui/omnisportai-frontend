import { useEffect, useId, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";

/**
 * Generic overflow / actions dropdown.
 *
 * Purely presentational: it only renders the items it is given and invokes
 * their `onClick` handlers. It does not own any business logic.
 *
 * @param {Array<{ key?: string, label: string, icon?: React.ComponentType,
 *   onClick?: Function, disabled?: boolean, disabledReason?: string,
 *   danger?: boolean, title?: string }>} items
 */
const ActionMenu = ({
  items = [],
  buttonLabel = "Actions",
  align = "right",
  disabled = false,
  buttonClassName = "",
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const itemRefs = useRef([]);
  const menuId = useId();

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const frameId = window.requestAnimationFrame(() => itemRefs.current.find(Boolean)?.focus());
    return () => window.cancelAnimationFrame(frameId);
  }, [open]);

  const visibleItems = items.filter(Boolean);
  if (visibleItems.length === 0) return null;

  const handleItemClick = (item) => {
    if (item.disabled) return;
    setOpen(false);
    if (typeof item.onClick === "function") {
      item.onClick();
    }
  };

  const handleMenuKeyDown = (event) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const enabledItems = itemRefs.current.filter((item) => item && !item.disabled);
    if (!enabledItems.length) return;
    const currentIndex = enabledItems.indexOf(document.activeElement);
    if (event.key === "Home") enabledItems[0].focus();
    else if (event.key === "End") enabledItems.at(-1).focus();
    else {
      const direction = event.key === "ArrowDown" ? 1 : -1;
      enabledItems[(currentIndex + direction + enabledItems.length) % enabledItems.length].focus();
    }
  };

  return (
    <div className="relative inline-flex" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className={
          buttonClassName ||
          "inline-flex min-h-[var(--control-height-md)] items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--text-main)] transition-colors duration-150 hover:bg-[var(--surface-soft)] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
        }
      >
        <MoreHorizontal size={16} aria-hidden="true" />
        {buttonLabel}
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          onKeyDown={handleMenuKeyDown}
          className={`absolute top-full z-[var(--z-dropdown)] mt-2 min-w-[12rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] py-1 shadow-[var(--shadow-md)] sm:min-w-[14rem] ${
            align === "left" ? "left-0" : "right-0"
          }`}
        >
          {visibleItems.map((item, index) => {
            const Icon = item.icon || null;
            return (
              <button
                key={item.key || item.label}
                ref={(node) => { itemRefs.current[index] = node; }}
                type="button"
                role="menuitem"
                onClick={() => handleItemClick(item)}
                disabled={item.disabled}
                title={item.disabled ? item.disabledReason || item.label : item.title || item.label}
                className={`flex min-h-[var(--control-height-md)] w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none ${
                  item.danger
                    ? "text-[var(--danger)] hover:bg-[var(--danger-soft)]"
                    : "text-[var(--text-main)] hover:bg-[var(--surface-soft)]"
                }`}
              >
                {Icon ? <Icon size={15} className="shrink-0" aria-hidden="true" /> : null}
                <span className="min-w-0 break-words">{item.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

export default ActionMenu;
