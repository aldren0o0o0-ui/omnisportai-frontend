import { useMemo, useState } from "react";
import { initialsFromLabel, resolveMediaUrl } from "../../utils/media";

const shapeClassByKind = {
  avatar: "rounded-full",
  logo: "rounded-xl",
};

const sizeClassByScale = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-20 w-20 text-xl",
};

const IdentityImage = ({
  imageUrl,
  label,
  kind = "avatar",
  scale = "md",
  className = "",
}) => {
  const [hasError, setHasError] = useState(false);
  const src = useMemo(() => resolveMediaUrl(imageUrl), [imageUrl]);
  const initials = initialsFromLabel(label, "?");
  const shapeClass = shapeClassByKind[kind] || shapeClassByKind.avatar;
  const sizeClass = sizeClassByScale[scale] || sizeClassByScale.md;

  const commonClass = `${shapeClass} ${sizeClass} flex items-center justify-center border border-[var(--border-soft)] bg-[var(--surface-muted)] font-semibold text-[var(--text-muted)] ${className}`.trim();

  if (!src || hasError) {
    return <div className={commonClass}>{initials}</div>;
  }

  return (
    <img
      src={src}
      alt={label || "Identity image"}
      className={`${shapeClass} ${sizeClass} border border-[var(--border-soft)] bg-[var(--surface-muted)] object-cover ${className}`.trim()}
      onError={() => setHasError(true)}
    />
  );
};

export const UserAvatar = (props) => <IdentityImage kind="avatar" {...props} />;
export const PlayerAvatar = (props) => <IdentityImage kind="avatar" {...props} />;
export const TeamLogo = (props) => <IdentityImage kind="logo" {...props} />;
export const DepartmentLogo = (props) => <IdentityImage kind="logo" {...props} />;
export const SportIcon = (props) => <IdentityImage kind="logo" {...props} />;

export default IdentityImage;
