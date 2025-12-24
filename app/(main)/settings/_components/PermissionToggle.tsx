// app/(main)/settings/_components/PermissionToggle.tsx
"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Props {
    label: string;
    description: string;
    isEnabled: boolean;
    onToggle: () => void;
    disabled?: boolean;
}

export function PermissionToggle({ label, description, isEnabled, onToggle, disabled }: Props) {
    return (
        <div className={cn(
            "flex items-center justify-between p-4 rounded-2xl border transition-all duration-200",
            isEnabled 
                ? "bg-white border-[#004F71]/20 shadow-sm" 
                : "bg-slate-50 border-slate-100 opacity-80",
            disabled && "opacity-50 cursor-not-allowed"
        )}>
            <div className="flex-1 pr-4">
                <h4 className={cn("text-xs font-bold uppercase tracking-wider mb-1", isEnabled ? "text-slate-900" : "text-slate-500")}>
                    {label}
                </h4>
                <p className="text-[10px] font-medium text-slate-400 leading-tight">
                    {description}
                </p>
            </div>

            <button
                onClick={onToggle}
                disabled={disabled}
                className={cn(
                    "w-10 h-6 rounded-full relative transition-colors duration-300 flex items-center shrink-0",
                    isEnabled ? "bg-[#004F71]" : "bg-slate-300",
                    disabled ? "cursor-not-allowed" : "cursor-pointer"
                )}
            >
                <motion.div
                    initial={false}
                    animate={{ x: isEnabled ? 18 : 2 }}
                    className="w-5 h-5 bg-white rounded-full shadow-md"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
            </button>
        </div>
    );
}