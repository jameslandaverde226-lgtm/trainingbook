"use client";

import { CalendarEvent, STICKERS } from "./types";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store/useStore";
import { Clock, User } from "lucide-react";

// Updated Interface to accept optional isMobile
interface SidebarRowProps {
    event: CalendarEvent;
    isMobile?: boolean;
}

export const TacticalSidebarRow = ({ event, isMobile = false }: SidebarRowProps) => {
  const { team } = useAppStore();
  const leader = team.find(m => m.id === event.assignee);
  const participant = team.find(m => m.id === event.teamMemberId);

  return (
    <div className={cn(
        "w-full h-full flex flex-col justify-center border-r border-slate-100 bg-white/50 backdrop-blur-sm hover:bg-white transition-colors group relative overflow-hidden",
        isMobile ? "px-3" : "px-6"
    )}>
      
      {/* Active Marker Indicator (Left Border) */}
      <div className={cn(
          "absolute left-0 top-0 bottom-0 w-1 transition-all duration-300",
          event.status === "Done" ? "bg-emerald-500" : event.priority === "High" ? "bg-[#E51636]" : "bg-transparent group-hover:bg-[#004F71]"
      )} />

      {/* MOBILE COMPACT VIEW */}
      {isMobile ? (
          <div className="flex items-center gap-2">
              <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-[8px] font-black text-white shadow-sm shrink-0", leader?.dept === 'FOH' ? 'bg-[#004F71]' : 'bg-[#E51636]')}>
                  {leader?.name.charAt(0) || "L"}
              </div>
              <div className="flex flex-col min-w-0">
                  <span className="text-[9px] font-bold text-slate-800 truncate leading-tight">{event.title}</span>
                  <span className="text-[7px] font-bold text-slate-400 uppercase tracking-tight truncate">{participant?.name || "Team"}</span>
              </div>
          </div>
      ) : (
          /* DESKTOP FULL VIEW */
          <>
            <div className="flex items-center gap-3 mb-1.5 min-w-0">
                <div className={cn("w-1.5 h-1.5 rounded-full shadow-[0_0_8px_current] shrink-0", 
                event.status === "Done" ? "bg-emerald-500 text-emerald-500" : 
                event.priority === "High" ? "bg-red-500 text-red-500" : "bg-blue-500 text-blue-500"
                )} />
                <span className="text-xs font-black text-slate-700 truncate tracking-tight">{event.title}</span>
            </div>

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                        <Clock className="w-3 h-3" />
                        <span>{format(event.startDate, "MMM d")}</span>
                    </div>
                    {event.stickers && event.stickers.length > 0 && (
                        <div className="flex items-center gap-1">
                            {event.stickers.map(stickerId => {
                                const sticker = STICKERS.find(s => s.id === stickerId);
                                if (!sticker) return null;
                                return (
                                    <div key={sticker.id} className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-sm border", sticker.color)}>
                                        {sticker.icon}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="flex items-center -space-x-2">
                    <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center text-[8px] font-black text-white shadow-sm ring-2 ring-white z-10", leader?.dept === 'FOH' ? 'bg-[#004F71]' : 'bg-[#E51636]')}>
                        {leader?.name.charAt(0) || "L"}
                    </div>
                    {participant ? (
                        <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center text-[8px] font-black text-white shadow-sm ring-2 ring-white", participant.dept === 'FOH' ? 'bg-[#004F71]' : 'bg-[#E51636]')}>
                            {participant.name.charAt(0)}
                        </div>
                    ) : (
                        <div className="w-6 h-6 rounded-lg bg-slate-50 border border-dashed border-slate-300 flex items-center justify-center ring-2 ring-white">
                            <User className="w-3 h-3 text-slate-300" />
                        </div>
                    )}
                </div>
            </div>
          </>
      )}
    </div>
  );
};