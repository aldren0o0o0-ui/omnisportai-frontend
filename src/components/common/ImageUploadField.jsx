import { useRef } from "react";
import IdentityImage from "./IdentityImage";

const ImageUploadField = ({
  label,
  imageUrl,
  fallbackLabel,
  onUpload,
  onRemove = null,
  uploading = false,
  error = "",
  kind = "avatar",
  scale = "lg",
  accept = ".jpg,.jpeg,.png,.webp",
  helperText = "Allowed: JPG, JPEG, PNG, WEBP (max 2MB)",
}) => {
  const inputRef = useRef(null);

  const triggerSelect = () => {
    if (uploading) return;
    inputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !onUpload) return;
    await onUpload(file);
  };

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-soft)] bg-[var(--surface)] p-3">
      <div className="flex items-center gap-3">
        <IdentityImage imageUrl={imageUrl} label={fallbackLabel} kind={kind} scale={scale} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--text-main)]">{label}</p>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">{helperText}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={triggerSelect}
              disabled={uploading}
              className="min-h-[var(--control-height-sm)] rounded-[var(--radius-sm)] bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white transition-colors duration-150 hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
            >
              {uploading ? "Uploading..." : imageUrl ? "Change Image" : "Upload Image"}
            </button>
            {onRemove ? (
              <button
                type="button"
                onClick={onRemove}
                disabled={uploading || !imageUrl}
                className="min-h-[var(--control-height-sm)] rounded-[var(--radius-sm)] border border-[var(--border-soft)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-main)] transition-colors duration-150 hover:bg-[var(--surface-soft)] disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
              >
                Remove
              </button>
            ) : null}
          </div>
          {error ? <p className="mt-2 text-xs text-[var(--danger)]" role="alert">{error}</p> : null}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
};

export default ImageUploadField;
