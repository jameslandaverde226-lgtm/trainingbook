"use client";

import { useRef, memo, useState } from "react";
import { motion, PanInfo, AnimatePresence } from "framer-motion";
import { CalendarEvent, TeamMember, STICKERS } from "./types";
import { cn } from "@/lib/utils";
import { GripVertical, Flag, Clock, Calendar as CalendarIcon, Users } from "lucide-react";
import { useAppStore } from "@/lib/store/useStore";
import { differenceInCalendarDays, parse, format, isSameDay, isSameMonth } from "date-fns";

interface Props {
  event: CalendarEvent;
  col: number;
  span: number;
  slot: number;
  segmentDate: Date; 
  continuesBefore: boolean;
  continuesAfter: boolean;
  isDragging: boolean;
  isStamping: boolean; 
  onDragEnd: (id: string, daysMoved: number) => void;
  onClick: (event: CalendarEvent) => void;
}

const DraggableEventCard = ({
  event, col, span, slot, segmentDate, continuesBefore, continuesAfter,
  isStamping, onDragEnd, onClick
}: Props) => {
  
  const cardRef = useRef<HTMLDivElement>(null);
  const wasDragged = useRef(false);
  const { team } = useAppStore();
  const [isLocalDragging, setIsLocalDragging] = useState(false);

  if (span <= 0) return null;

  // --- RESOLVE PERSONNEL ---
  const leader = team.find((u: TeamMember) => u.id === event.assignee);
  const participant = team.find((u: TeamMember) => u.id === event.teamMemberId);

  const handleDragStart = () => {
    setIsLocalDragging(true);
    wasDragged.current = false;
  };

  const handleDragUpdate = () => {
    wasDragged.current = true;
  };

  const handleDragEnd = (e: any, info: PanInfo) => {
    if (isStamping) {
        setIsLocalDragging(false);
        return;
    }

    const clientX = e.clientX || e.changedTouches?.[0]?.clientX;
    const clientY = e.clientY || e.changedTouches?.[0]?.clientY;

    if (clientX && clientY) {
      if (cardRef.current) cardRef.current.style.visibility = "hidden";
      const elementsBelow = document.elementsFromPoint(clientX, clientY);
      if (cardRef.current) cardRef.current.style.visibility = "visible";

      const dateCell = elementsBelow.find(el => el.hasAttribute("data-date"));
      
      if (dateCell) {
        const dateStr = dateCell.getAttribute("data-date");
        if (dateStr) {
          const targetDate = parse(dateStr, "yyyy-MM-dd", new Date());
          const daysDiff = differenceInCalendarDays(targetDate, segmentDate);
          if (daysDiff !== 0) onDragEnd(event.id, daysDiff);
        }
      }
    }

    setTimeout(() => {
        setIsLocalDragging(false);
    }, 10);
  };

  const getStyles = (type: string) => {
    switch (type) {
      case "Training": return { bar: "bg-[#004F71]", bg: "bg-white" };
      case "Goal": return { bar: "bg-emerald-500", bg: "bg-white" };
      case "Deadline": return { bar: "bg-[#E51636]", bg: "bg-white" };
      case "OneOnOne": return { bar: "bg-purple-600", bg: "bg-white" };
      default: return { bar: "bg-slate-500", bg: "bg-white" };
    }
  };
  
  const styles = getStyles(event.type);
  const isMultiDay = !isSameDay(event.startDate, event.endDate);

  // FORMAT DATE STRING LOGIC
  let dateLabel = format(event.startDate, "h:mm a");
  
  if (isMultiDay) {
      const sameMonth = isSameMonth(event.startDate, event.endDate);
      if (sameMonth) {
          dateLabel = `${format(event.startDate, "MMM d")} - ${format(event.endDate, "d")}`;
      } else {
          dateLabel = `${format(event.startDate, "MMM d")} - ${format(event.endDate, "MMM d")}`;
      }
  }

  // --- PRIORITY COLOR LOGIC ---
  const getPriorityColor = (p: string) => {
      switch(p) {
          case 'High': return "bg-red-50 text-[#E51636] border-red-100";
          case 'Medium': return "bg-amber-50 text-amber-500 border-amber-100";
          case 'Low': return "bg-blue-50 text-[#004F71] border-blue-100";
          default: return "bg-slate-50 text-slate-400 border-slate-100";
      }
  }

  return (
    <motion.div 
      layout
      data-event-id={event.id}
      style={{ 
        gridColumnStart: col, 
        gridColumnEnd: `span ${span}`, 
        top: slot * 40, 
        left: 0, 
        right: 0,
        zIndex: isLocalDragging ? 1000 : 20,
        willChange: "transform, opacity",
      }}
      className="absolute h-[36px] mb-1 px-1 pointer-events-auto touch-none"
    >
      <motion.div
        ref={cardRef}
        drag={!isStamping} 
        dragMomentum={false} 
        dragElastic={0.01} 
        dragSnapToOrigin={true}
        onDragStart={handleDragStart}
        onDrag={handleDragUpdate}
        onDragEnd={handleDragEnd}
        onTap={() => { if (!wasDragged.current) onClick(event); }}
        
        whileHover={{ y: -1, scale: 1.01 }}
        whileDrag={{ 
            scale: 1.05, 
            opacity: 0.9,
            rotate: 1,
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
            cursor: "grabbing"
        }}
        
        className={cn(
          "h-full w-full flex flex-col justify-center px-2 border select-none overflow-hidden relative rounded-lg transition-colors duration-300",
          styles.bg,
          isLocalDragging ? "border-[#E51636]" : "border-slate-200/60 shadow-sm",
          continuesBefore ? "rounded-l-none border-l-0 pl-3" : "rounded-l-lg",
          continuesAfter ? "rounded-r-none border-r-0 pr-3" : "rounded-r-lg",
          isStamping ? "cursor-crosshair" : "cursor-grab"
        )}
      >
        {!continuesBefore && <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-lg", styles.bar)} />}
        {!continuesAfter && <div className={cn("absolute right-0 top-0 bottom-0 w-1 rounded-r-lg", styles.bar)} />}
        
        <div className="flex items-center w-full h-full relative z-20">
            <div className="flex-1 min-w-0 mr-1.5 flex flex-col justify-center">
                <div className="flex items-center justify-between w-full">
                    <p className="truncate text-[10px] font-bold text-slate-800 leading-none tracking-tight flex items-center gap-1.5 flex-1 min-w-0">
                        {event.title}
                        {event.stickers && event.stickers.length > 0 && (
                            <span className="flex items-center gap-0.5 shrink-0">
                                {event.stickers.map(s => {
                                    const st = STICKERS.find(x => x.id === s);
                                    return st ? <span key={s} className="text-[8px]">{st.icon}</span> : null
                                })}
                            </span>
                        )}
                    </p>
                </div>
                
                {/* DATE DISPLAY */}
                <div className="flex items-center gap-1 opacity-60 mt-0.5">
                    {isMultiDay ? <CalendarIcon className="w-2.5 h-2.5 shrink-0" /> : <Clock className="w-2.5 h-2.5 shrink-0" />}
                    <span className="text-[7px] font-black uppercase tracking-wider tabular-nums truncate">
                        {dateLabel}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
                 {/* PRIORITY FLAG - VISIBLE ON ALL */}
                 <div className={cn("p-1 rounded-[4px] border", getPriorityColor(event.priority))}>
                     <Flag className="w-2 h-2 fill-current" />
                 </div>

                 {!continuesAfter && (
                    <div className="flex -space-x-1">
                        <div className={cn(
                            "w-3.5 h-3.5 rounded flex items-center justify-center text-[6px] font-black text-white shadow-sm ring-1 ring-white", 
                            leader?.dept === "FOH" ? "bg-[#004F71]" : "bg-[#E51636]"
                        )}>
                            {leader?.name.charAt(0) || 'L'}
                        </div>

                        {participant && (
                            <div className={cn(
                                "w-3.5 h-3.5 rounded flex items-center justify-center text-[6px] font-black text-white shadow-sm ring-1 ring-white transition-transform group-hover:translate-x-0.5", 
                                participant?.dept === "FOH" ? "bg-[#004F71]" : "bg-[#E51636]"
                            )}>
                                {participant.name.charAt(0)}
                            </div>
                        )}
                     </div>
                 )}
            </div>
        </div>

        <AnimatePresence>
            {isLocalDragging && (
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-red-500/5 pointer-events-none" 
                />
            )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default memo(DraggableEventCard);