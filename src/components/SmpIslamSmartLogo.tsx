import React from "react";
import defaultLogoUrl from "../assets/images/smp_logo_exact_match_revised_1783840969621.jpg";

export { defaultLogoUrl };

export interface SchoolLogoProps {
  className?: string;
  size?: number | string;
  logoUrl?: string | null;
  schoolName?: string;
  id?: string;
}

export function getInitials(name?: string): string {
  if (!name || !name.trim()) return "SCH";
  const words = name
    .trim()
    .replace(/^(smp|sma|smk|sd|mi|mts|ma)\s+/i, "")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return name.slice(0, 3).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return (words[0][0] + (words[1]?.[0] || "") + (words[2]?.[0] || "")).toUpperCase();
}

export default function SmpIslamSmartLogo({
  className = "",
  size = "100%",
  logoUrl,
  schoolName = "SMP ISLAM SMART PANGKALPINANG",
  id = "school-logo-img",
}: SchoolLogoProps) {
  // 1. If custom logoUrl is given and non-empty
  if (logoUrl && typeof logoUrl === "string" && logoUrl.trim() !== "") {
    return (
      <img
        src={logoUrl}
        alt={schoolName || "Logo Sekolah"}
        className={`select-none object-cover rounded-full ${className}`}
        style={{ width: size, height: size }}
        referrerPolicy="no-referrer"
        id={id}
      />
    );
  }

  // 2. If logo was explicitly deleted / set to empty string
  if (logoUrl === "") {
    return (
      <div
        className={`select-none rounded-full flex items-center justify-center font-bold text-white bg-gradient-to-br from-emerald-600 to-teal-800 shadow-inner ${className}`}
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
        id={id}
        title={schoolName}
      >
        <span className="text-xs uppercase tracking-wider">{getInitials(schoolName)}</span>
      </div>
    );
  }

  // 3. Default fallback for SMP Islam Smart
  const isDefaultSchool =
    !schoolName ||
    schoolName.toLowerCase().includes("smart") ||
    schoolName.toLowerCase().includes("smp islam smart");

  if (isDefaultSchool) {
    return (
      <img
        src={defaultLogoUrl}
        alt="SMP Islam Smart Logo"
        className={`select-none object-cover rounded-full ${className}`}
        style={{ width: size, height: size }}
        referrerPolicy="no-referrer"
        id={id}
      />
    );
  }

  // 4. Fallback badge for other schools without logo
  return (
    <div
      className={`select-none rounded-full flex items-center justify-center font-bold text-white bg-gradient-to-br from-blue-600 to-indigo-800 shadow-inner ${className}`}
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
      id={id}
      title={schoolName}
    >
      <span className="text-xs uppercase tracking-wider">{getInitials(schoolName)}</span>
    </div>
  );
}

