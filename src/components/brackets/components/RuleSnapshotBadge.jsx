import React from "react";

const mismatchStatuses = new Set(["CONFIG_MISMATCH", "REVIEW"]);
const blockedStatuses = new Set(["BLOCKED", "CONFIG_LOCKED"]);

const getRuleSourceLabel = (source) => {
  const normalized = String(source || "").trim().toLowerCase();
  if (!normalized) return "Unknown";
  if (normalized === "match_rule_snapshot") return "Snapshot";
  if (normalized === "matches.template_snapshot") return "Legacy Template";
  if (normalized === "canonical_template") return "Canonical Template";
  return normalized.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
};

const RuleSnapshotBadge = ({ snapshot, configStatus }) => {
  const status = String(configStatus || "").toUpperCase();
  const id = Number(snapshot?.id || 0) || null;
  const isLocked = snapshot?.isLocked === true || snapshot?.locked === true;
  const source = String(snapshot?.source || "").trim();
  const profileName = String(snapshot?.profileName || "").trim();
  const profileVersion = Number(snapshot?.profileVersion || 0) || null;
  const isLegacySource = source === "matches.template_snapshot" || source === "canonical_template";

  const badges = [];
  if (mismatchStatuses.has(status)) {
    badges.push({
      key: "rules-mismatch",
      label: "Rules Out Of Sync",
      className: "border-rose-500/50 bg-rose-500/15 text-rose-100",
    });
  } else if (blockedStatuses.has(status)) {
    badges.push({
      key: "rules-blocked",
      label: "Rules Config Blocked",
      className: "border-rose-500/40 bg-rose-500/10 text-rose-100",
    });
  } else if (isLocked && id) {
    badges.push({
      key: "rules-locked",
      label: "Rules Locked",
      className: "border-emerald-500/40 bg-emerald-500/15 text-emerald-100",
    });
  } else if (isLegacySource || !id) {
    badges.push({
      key: "rules-legacy",
      label: "Legacy Template",
      className: "border-amber-500/40 bg-amber-500/15 text-amber-100",
    });
  } else {
    badges.push({
      key: "rules-editable",
      label: "Rules Editable",
      className: "border-cyan-500/40 bg-cyan-500/15 text-cyan-100",
    });
  }

  if (id) {
    badges.push({
      key: "snapshot-id",
      label: profileVersion ? `Snapshot v${profileVersion}` : `Snapshot #${id}`,
      className: "border-slate-700 bg-slate-900/70 text-slate-200",
    });
  } else if (source) {
    badges.push({
      key: "snapshot-source",
      label: getRuleSourceLabel(source),
      className: "border-slate-700 bg-slate-900/70 text-slate-200",
    });
  }

  if (profileName) {
    badges.push({
      key: "profile-name",
      label: profileName,
      className: "border-indigo-500/35 bg-indigo-500/10 text-indigo-100",
    });
  }

  return (
    <>
      {badges.map((badge) => (
        <span key={badge.key} className={`rounded-full border px-2 py-0.5 ${badge.className}`}>
          {badge.label}
        </span>
      ))}
    </>
  );
};

export default RuleSnapshotBadge;
