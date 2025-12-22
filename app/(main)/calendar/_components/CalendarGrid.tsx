"use client";

import { useMemo } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { CalendarEvent, getLayoutForWeek } from "./types";
import DraggableEventCard from "./DraggableEventCard";

interface CalendarGridProps {
  currentDate: Date;
  events: CalendarEvent[];
  isStamping: boolean; 
  onDragEnd: (id: string, offsetDays: number) => void;
  onSelectEvent: (event: CalendarEvent) => void;
  onStamp?: (eventId: string) => void;
}

export default function CalendarGrid({
  currentDate,
  events,
  isStamping,
  onDragEnd,
  onSelectEvent,
  onStamp
}: CalendarGridProps) {
  
  const startDate = startOfWeek(startOfMonth(currentDate));
  const endDate = endOfWeek(endOfMonth(currentDate));

  const calendarWeeks = useMemo(() => {
    const weeks = [];
    let day = startDate;
    while (day <= endDate) {
      const week = [];
      for (let i = 0; i < 7; i++) { 
        week.push(day); 
        day = addDays(day, 1); 
      }
      weeks.push(week);
    }
    return weeks;
  }, [currentDate, startDate, endDate]);

  const handleCardClick = (event: CalendarEvent) => {
      // PRIORITY: STAMPING
      if (isStamping && onStamp) {
          onStamp(event.id);
      } else {
          onSelectEvent(event);
      }
  };

  return (
    <div className="flex-1 bg-white min-w-[800px] select-none pb-20">
      <div className="grid grid-cols-7 border-b border-slate-200 bg-white sticky top-0 z-30 shadow-sm">
        {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map((d) => (
          <div key={d} className="py-4 text-center text-[10px] font-black text-slate-400 tracking-widest border-r border-slate-50 last:border-0 bg-slate-50/30">
            {d}
          </div>
        ))}
      </div>

      <div className="flex-1">
        {calendarWeeks.map((week, wIdx) => {
          const { placedItems, totalSlots } = getLayoutForWeek(week[0], events);
          
          // COMPACT LAYOUT: Reduced multiplier from 50 to 40, and base height from 160 to 120
          const dynamicHeight = Math.max(120, (totalSlots * 40) + 60);

          return (
            <div key={wIdx} className="grid grid-cols-7 border-b border-slate-100 last:border-0 relative group" style={{ height: dynamicHeight }}>
              
              {week.map(day => (
                  <div 
                    key={day.toString()}
                    data-date={format(day, "yyyy-MM-dd")} 
                    className={cn(
                      "relative border-r border-slate-100 last:border-0 p-2 transition-colors duration-200 z-0 h-full",
                      !isSameMonth(day, currentDate) && "bg-slate-50/60",
                      isToday(day) && "bg-blue-50/10"
                    )}
                  >
                    <span className={cn(
                      "absolute top-2 left-2 w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition-all pointer-events-none",
                      isToday(day) ? "bg-[#004F71] text-white shadow-md" : "text-slate-400",
                    )}>
                      {format(day, "d")}
                    </span>
                  </div>
              ))}

              <div className="absolute inset-0 grid grid-cols-7 mt-10 z-20 pointer-events-none">
                  {placedItems.map((item) => {
                      const segmentDate = addDays(week[0], item.col - 1);

                      return (
                        <DraggableEventCard
                            key={`${item.event.id}-${wIdx}`}
                            {...item}
                            segmentDate={segmentDate}
                            isDragging={false}
                            isStamping={isStamping}
                            onDragEnd={onDragEnd}
                            onClick={handleCardClick}
                        />
                      );
                  })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
}