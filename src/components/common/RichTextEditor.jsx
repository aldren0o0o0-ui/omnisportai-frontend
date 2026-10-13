import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Minus,
  Palette,
  Undo2,
  Redo2,
  RemoveFormatting,
  ChevronDown,
} from "lucide-react";

const COLOR_SWATCHES = [
  { label: "Default", color: "inherit", bg: "bg-slate-700 dark:bg-slate-300" },
  { label: "Slate", color: "#64748b", bg: "bg-slate-500" },
  { label: "Blue", color: "#2563eb", bg: "bg-blue-600" },
  { label: "Cyan", color: "#0284c7", bg: "bg-sky-600" },
  { label: "Emerald", color: "#059669", bg: "bg-emerald-600" },
  { label: "Amber", color: "#d97706", bg: "bg-amber-600" },
  { label: "Rose", color: "#e11d48", bg: "bg-rose-600" },
  { label: "Purple", color: "#9333ea", bg: "bg-purple-600" },
];

export default function RichTextEditor({
  value = "",
  onChange,
  placeholder = "Write your announcement here...",
  minHeight = "280px",
  disabled = false,
}) {
  const editorRef = useRef(null);
  const colorMenuRef = useRef(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [customColor, setCustomColor] = useState("#2563eb");
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
    justifyLeft: false,
    justifyCenter: false,
    justifyRight: false,
    insertUnorderedList: false,
    insertOrderedList: false,
  });
  const [currentBlock, setCurrentBlock] = useState("p");
  const isInternalUpdate = useRef(false);

  // Sync external value to contentEditable
  useEffect(() => {
    if (editorRef.current && !isInternalUpdate.current) {
      const incoming = value || "";
      if (editorRef.current.innerHTML !== incoming) {
        editorRef.current.innerHTML = incoming;
      }
    }
    isInternalUpdate.current = false;
  }, [value]);

  // Close color picker on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (colorMenuRef.current && !colorMenuRef.current.contains(e.target)) {
        setShowColorPicker(false);
      }
    };
    if (showColorPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showColorPicker]);

  const updateActiveStates = () => {
    try {
      setActiveFormats({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        strikeThrough: document.queryCommandState("strikeThrough"),
        justifyLeft: document.queryCommandState("justifyLeft"),
        justifyCenter: document.queryCommandState("justifyCenter"),
        justifyRight: document.queryCommandState("justifyRight"),
        insertUnorderedList: document.queryCommandState("insertUnorderedList"),
        insertOrderedList: document.queryCommandState("insertOrderedList"),
      });

      const block = document.queryCommandValue("formatBlock");
      if (block) {
        setCurrentBlock(String(block).toLowerCase().replace(/[<>]/g, "") || "p");
      }
    } catch {
      // Ignore queryCommand errors if selection outside
    }
  };

  const handleInput = () => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    const text = (editorRef.current.textContent || "").trim();
    const hasStructuralTags = /<(?:ul|ol|li|img|hr|blockquote|h[1-6]|table)\b/i.test(html);
    const sanitizedHtml = !text && !hasStructuralTags ? "" : html;

    isInternalUpdate.current = true;
    if (onChange) {
      onChange(sanitizedHtml);
    }
    updateActiveStates();
  };

  const ensureSelection = () => {
    if (!editorRef.current) return;
    const selection = window.getSelection();
    if (!selection) return;

    if (!selection.rangeCount || !editorRef.current.contains(selection.anchorNode)) {
      editorRef.current.focus();
      const range = document.createRange();
      if (editorRef.current.childNodes.length === 0) {
        const p = document.createElement("p");
        p.appendChild(document.createElement("br"));
        editorRef.current.appendChild(p);
      }
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

  const exec = (command, value = null) => {
    if (disabled || !editorRef.current) return;
    ensureSelection();
    editorRef.current.focus();
    document.execCommand(command, false, value);
    handleInput();
  };

  const toggleList = (command) => {
    if (disabled || !editorRef.current) return;
    ensureSelection();
    editorRef.current.focus();
    document.execCommand(command, false, null);
    handleInput();
  };

  const applyColor = (color) => {
    if (color === "inherit") {
      exec("removeFormat");
    } else {
      exec("foreColor", color);
    }
    setShowColorPicker(false);
  };

  const handleBlockChange = (e) => {
    const tag = e.target.value;
    setCurrentBlock(tag);
    if (tag === "p") {
      exec("formatBlock", "<p>");
    } else if (tag === "h1") {
      exec("formatBlock", "<h1>");
    } else if (tag === "h2") {
      exec("formatBlock", "<h2>");
    } else if (tag === "h3") {
      exec("formatBlock", "<h3>");
    } else if (tag === "blockquote") {
      exec("formatBlock", "<blockquote>");
    }
  };

  const handleFontSizeChange = (e) => {
    const size = e.target.value;
    if (size) {
      exec("fontSize", size);
      e.target.value = "";
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Tab") {
      const selection = window.getSelection();
      if (selection && selection.rangeCount && editorRef.current.contains(selection.anchorNode)) {
        e.preventDefault();
        if (e.shiftKey) {
          exec("outdent");
        } else {
          exec("indent");
        }
      }
    }
  };

  const hasVisibleContent = Boolean(
    (value && (editorRef.current?.textContent || "").trim()) ||
    /<(?:ul|ol|li|img|hr|blockquote)\b/i.test(value || "")
  );

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white transition focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 dark:border-slate-800 dark:bg-[var(--surface-soft)]">
      {/* Word-like Editor Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50/80 p-1.5 sm:px-2 sm:py-1.5 text-slate-700 dark:border-slate-800 dark:bg-[var(--surface)]/90 dark:text-slate-300">
        {/* Style / Heading selector */}
        <div className="flex items-center">
          <select
            value={["p", "h1", "h2", "h3", "blockquote"].includes(currentBlock) ? currentBlock : "p"}
            onChange={handleBlockChange}
            disabled={disabled}
            className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs font-medium text-slate-700 shadow-xs focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-200"
            title="Text Style"
          >
            <option value="p">Normal text</option>
            <option value="h1">Heading 1 (Large)</option>
            <option value="h2">Heading 2 (Medium)</option>
            <option value="h3">Heading 3 (Small)</option>
            <option value="blockquote">Quote block</option>
          </select>
        </div>

        {/* Font Size dropdown */}
        <div className="flex items-center">
          <select
            defaultValue=""
            onChange={handleFontSizeChange}
            disabled={disabled}
            className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs font-medium text-slate-700 shadow-xs focus:border-emerald-500 focus:outline-hidden dark:border-slate-700 dark:bg-[var(--surface-soft)] dark:text-slate-200"
            title="Font Size"
          >
            <option value="" disabled>Size</option>
            <option value="1">10px - Small</option>
            <option value="2">13px - Normal</option>
            <option value="3">16px - Medium</option>
            <option value="4">18px - Large</option>
            <option value="5">24px - X-Large</option>
            <option value="6">32px - Huge</option>
          </select>
        </div>

        <div className="mx-1 h-5 w-px bg-slate-300 dark:bg-slate-700" />

        {/* Basic Formatting: Bold, Italic, Underline, Strikethrough */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            exec("bold");
          }}
          disabled={disabled}
          title="Bold (Ctrl+B)"
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
            activeFormats.bold
              ? "bg-emerald-100 text-emerald-900 font-bold dark:bg-emerald-950 dark:text-emerald-300"
              : "hover:bg-slate-200 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-700/60"
          }`}
        >
          <Bold className="h-4 w-4" />
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            exec("italic");
          }}
          disabled={disabled}
          title="Italic (Ctrl+I)"
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
            activeFormats.italic
              ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
              : "hover:bg-slate-200 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-700/60"
          }`}
        >
          <Italic className="h-4 w-4" />
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            exec("underline");
          }}
          disabled={disabled}
          title="Underline (Ctrl+U)"
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
            activeFormats.underline
              ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
              : "hover:bg-slate-200 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-700/60"
          }`}
        >
          <Underline className="h-4 w-4" />
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            exec("strikeThrough");
          }}
          disabled={disabled}
          title="Strikethrough"
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
            activeFormats.strikeThrough
              ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
              : "hover:bg-slate-200 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-700/60"
          }`}
        >
          <Strikethrough className="h-4 w-4" />
        </button>

        <div className="mx-1 h-5 w-px bg-slate-300 dark:bg-slate-700" />

        {/* Text Color Popover */}
        <div className="relative" ref={colorMenuRef}>
          <button
            type="button"
            onClick={() => setShowColorPicker((prev) => !prev)}
            disabled={disabled}
            title="Text Color"
            className="flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium hover:bg-slate-200 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-700/60"
          >
            <Palette className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Color</span>
            <ChevronDown className="h-3 w-3 opacity-60" />
          </button>

          {showColorPicker ? (
            <div className="absolute left-0 top-full z-30 mt-1 w-52 rounded-xl border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-[var(--surface)]">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Text Colors
              </span>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {COLOR_SWATCHES.map((swatch) => (
                  <button
                    key={swatch.label}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyColor(swatch.color);
                    }}
                    title={swatch.label}
                    className="flex flex-col items-center gap-1 rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <span className={`h-5 w-5 rounded-full border border-slate-300 dark:border-slate-600 shadow-xs ${swatch.bg}`} />
                    <span className="text-[10px] text-slate-600 dark:text-slate-400 truncate max-w-full">
                      {swatch.label}
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-3 border-t border-slate-200 pt-2 dark:border-slate-700">
                <label className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <span>Custom Color</span>
                  <input
                    type="color"
                    value={customColor}
                    onChange={(e) => {
                      setCustomColor(e.target.value);
                      applyColor(e.target.value);
                    }}
                    className="h-6 w-8 cursor-pointer rounded border border-slate-300 bg-transparent p-0"
                  />
                </label>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mx-1 h-5 w-px bg-slate-300 dark:bg-slate-700" />

        {/* Alignment */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            exec("justifyLeft");
          }}
          disabled={disabled}
          title="Align Left"
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
            activeFormats.justifyLeft
              ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
              : "hover:bg-slate-200 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-700/60"
          }`}
        >
          <AlignLeft className="h-4 w-4" />
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            exec("justifyCenter");
          }}
          disabled={disabled}
          title="Align Center"
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
            activeFormats.justifyCenter
              ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
              : "hover:bg-slate-200 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-700/60"
          }`}
        >
          <AlignCenter className="h-4 w-4" />
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            exec("justifyRight");
          }}
          disabled={disabled}
          title="Align Right"
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
            activeFormats.justifyRight
              ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
              : "hover:bg-slate-200 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-700/60"
          }`}
        >
          <AlignRight className="h-4 w-4" />
        </button>

        <div className="mx-1 h-5 w-px bg-slate-300 dark:bg-slate-700" />

        {/* Lists - Bullets and Numbering */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            toggleList("insertUnorderedList");
          }}
          disabled={disabled}
          title="Bullet List"
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
            activeFormats.insertUnorderedList
              ? "bg-emerald-100 text-emerald-900 font-bold dark:bg-emerald-950 dark:text-emerald-300"
              : "hover:bg-slate-200 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-700/60"
          }`}
        >
          <List className="h-4 w-4" />
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            toggleList("insertOrderedList");
          }}
          disabled={disabled}
          title="Numbered List"
          className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
            activeFormats.insertOrderedList
              ? "bg-emerald-100 text-emerald-900 font-bold dark:bg-emerald-950 dark:text-emerald-300"
              : "hover:bg-slate-200 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-700/60"
          }`}
        >
          <ListOrdered className="h-4 w-4" />
        </button>

        {/* Divider line */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            exec("insertHorizontalRule");
          }}
          disabled={disabled}
          title="Insert Horizontal Divider"
          className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-200 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-700/60 transition"
        >
          <Minus className="h-4 w-4" />
        </button>

        <div className="mx-1 h-5 w-px bg-slate-300 dark:bg-slate-700" />

        {/* Undo / Redo & Clear */}
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            exec("undo");
          }}
          disabled={disabled}
          title="Undo (Ctrl+Z)"
          className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-200 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-700/60 transition"
        >
          <Undo2 className="h-4 w-4" />
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            exec("redo");
          }}
          disabled={disabled}
          title="Redo (Ctrl+Y)"
          className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-200 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-700/60 transition"
        >
          <Redo2 className="h-4 w-4" />
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            exec("removeFormat");
          }}
          disabled={disabled}
          title="Clear Formatting"
          className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-200 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-700/60 transition"
        >
          <RemoveFormatting className="h-4 w-4" />
        </button>
      </div>

      {/* Editable Canvas */}
      <div className="relative p-3 sm:p-4">
        {!hasVisibleContent ? (
          <div className="pointer-events-none absolute left-3 sm:left-4 top-3 sm:top-4 select-none text-xs sm:text-sm text-slate-400 dark:text-slate-500">
            {placeholder}
          </div>
        ) : null}

        <div
          ref={editorRef}
          contentEditable={!disabled}
          onInput={handleInput}
          onKeyUp={updateActiveStates}
          onMouseUp={updateActiveStates}
          onKeyDown={handleKeyDown}
          onBlur={handleInput}
          style={{ minHeight }}
          className="rich-text-editor-content outline-hidden text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-100 break-words [&_img]:max-w-full [&_table]:overflow-x-auto [&_table]:block [&>h1]:mb-3 [&>h1]:text-xl sm:[&>h1]:text-2xl [&>h1]:font-bold [&>h2]:mb-2 [&>h2]:text-lg sm:[&>h2]:text-xl [&>h2]:font-semibold [&>h3]:mb-2 [&>h3]:text-sm sm:[&>h3]:text-base [&>h3]:font-medium [&>p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 sm:[&_ul]:pl-6 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 sm:[&_ol]:pl-6 [&_ol]:my-2 [&_li]:my-1 [&_li]:pl-1 [&>blockquote]:mb-2 [&>blockquote]:border-l-4 [&>blockquote]:border-emerald-500 [&>blockquote]:pl-3 [&>blockquote]:italic [&>blockquote]:text-slate-500 dark:[&>blockquote]:text-slate-400 [&>hr]:my-3 [&>hr]:border-slate-200 dark:[&>hr]:border-slate-700"
        />
      </div>
    </div>
  );
}
