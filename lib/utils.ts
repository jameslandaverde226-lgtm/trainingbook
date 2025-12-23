// --- FILE: ./lib/utils.ts ---
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { addDays, differenceInDays } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- NEW HELPER: Probation Logic ---
export function getProbationStatus(joinedDateString?: string) {
    if (!joinedDateString) return null;
    
    // Parse
    const joined = new Date(joinedDateString);
    const today = new Date();
    
    // Calculate End Date (30 Days from Join)
    const probationEnd = addDays(joined, 30);
    
    // Calculate Difference
    const daysRemaining = differenceInDays(probationEnd, today);
    const daysPassed = 30 - daysRemaining;
    
    // If probation is over (negative remaining), return null
    if (daysRemaining <= 0) return null;

    // Calculate percentage (0 to 100)
    const percentage = Math.min(100, Math.max(0, Math.round((daysPassed / 30) * 100)));

    return {
        isActive: true,
        daysRemaining,
        daysPassed,
        percentage,
        total: 30
    };
}