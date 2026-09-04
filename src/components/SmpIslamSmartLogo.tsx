import React from "react";
import logoUrl from "../assets/images/smp_logo_exact_match_revised_1783840969621.jpg";

interface SmpIslamSmartLogoProps {
  className?: string;
  size?: number | string;
  variant?: "app-icon" | "school-crest";
}

/**
 * SmpIslamSmartLogo:
 * Renders either the luxury App Icon (for App headers, Login screen, PWA)
 * or the official School Crest (for official printed report card documents).
 */
export default function SmpIslamSmartLogo({
  className = "",
  size = "100%",
  variant = "app-icon",
}: SmpIslamSmartLogoProps) {
  if (variant === "school-crest") {
    return (
      <img
        src={logoUrl}
        alt="SMP Islam Smart Logo"
        className={`select-none object-cover rounded-full ${className}`}
        style={{ width: size, height: size }}
        referrerPolicy="no-referrer"
        id="smp-islam-smart-crest"
      />
    );
  }

  // Modern Luxury App Icon with SVG high-fidelity vector rendering
  return (
    <img
      src="/icon.svg?v=2026"
      alt="Raport STS SMP Islam Smart Icon"
      className={`select-none object-cover rounded-xl shadow-lg border border-amber-400/30 ${className}`}
      style={{ width: size, height: size }}
      referrerPolicy="no-referrer"
      id="smp-islam-smart-logo"
    />
  );
}
