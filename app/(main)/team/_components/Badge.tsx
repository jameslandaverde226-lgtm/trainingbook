"use client";

import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  /**
   * Defines the color palette for the badge.
   * Defaults to 'slate'.
   */
  color?: "blue" | "red" | "green" | "orange" | "slate";
  /**
   * Optional Lucide icon to display inside the badge.
   */
  icon?: any;
  /**
   * Additional Tailwind classes for layout adjustments (e.g., margins).
   */
  className?: string;
}

export const Badge = ({ 
  children, 
  color = "slate", 
  icon: Icon, 
  className 
}: BadgeProps) => {
  
  // High-contrast color mapping following the Operational Command aesthetic
  const styles = {
    blue: "bg-blue-50 text-[#004F71] border-blue-100 shadow-sm shadow-blue-900/5",
    red: "bg-red-50 text-[#E51636] border-red-100 shadow-sm shadow-red-900/5",
    green: "bg-emerald-50 text-emerald-700 border-emerald-100 shadow-sm shadow-emerald-900/5",
    orange: "bg-orange-50 text-orange-700 border-orange-100 shadow-sm shadow-orange-900/5",
    slate: "bg-slate-100 text-slate-600 border-slate-200 shadow-sm"
  };

  return (
    <div 
      className={cn(
        "px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest flex items-center gap-2 shrink-0 transition-all",
        styles[color],
        className
      )}
    >
      {Icon && <Icon className="w-3 h-3" />}
      <span className="leading-none">{children}</span>
    </div>
  );
};