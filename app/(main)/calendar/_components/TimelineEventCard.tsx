"use client";

import { useRef, memo, useState } from "react"; 
import { motion, AnimatePresence } from "framer-motion";
import { CalendarEvent, STICKERS } from "./types";
import { cn } from "@/lib/utils";
import { differenceInCalendarDays, isValid, format, isSameDay, isSameMonth, max } from "date-fns";
import { Link2, Clock, Calendar as CalendarIcon, ChevronLeft, ChevronRight, Flag } from "lucide-react";
import { useAppStore } from "@/lib/store/useStore";

interface Props {
  event: CalendarEvent;
  timelineStart: Date;
  timelineEnd: Date;
  dayWidth: number;
  isStamping: boolean;
  isLinking: boolean;
  isSource?: boolean;
  isTarget?: boolean;
  onDragEnd: (id: string, daysMoved: number) => void;
  onClick: () => void;
  onDragStart?: () => void;
  onDragComplete?: () => void;
}

const TerminalNode = ({ type }: { type: 'input' | 'output' }) => (
  <div className={cn(
    "absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-[2px] border-white shadow-md z-30 flex items-center justify-center bg-[#004F71] transition-transform scale-0 group-hover/card:scale-100",
    type === 'input' ? "-left-1.5" : "-right-1.5" 
  )} />
);

const TimelineEventCard = ({
  event, timelineStart, timelineEnd, dayWidth, isStamping, isLinking, isSource, isTarget, onDragEnd, onClick, onDragStart, onDragComplete
}: Props) => {
  const { team } = useAppStore();
  const cardRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const [isLocalDragging, setIsLocalDragging] = useState(false);

  if (!isValid(event.startDate) || !isValid(event.endDate) || !isValid(timelineStart)) return null;

  // Visual Bounds Logic
  const visualStart = max([event.startDate, timelineStart]);
  const isContinuesLeft = event.startDate < timelineStart;
  const isContinuesRight = event.endDate > timelineEnd;

  const startDiff = differenceInCalendarDays(visualStart, timelineStart);
  const duration = differenceInCalendarDays(event.endDate, visualStart) + 1;
  
  const leftPos = (startDiff * dayWidth);
  const width = Math.max(duration * dayWidth - 8, dayWidth - 8); 
  const isCompact = width < 60;
  
  const leader = team.find(u => u.id === event.assignee);
  const participant = team.find(u => u.id === event.teamMemberId);
  const isMultiDay = !isSameDay(event.startDate, event.endDate);

  let dateLabel = format(event.startDate, "h:mm a");
  if (isMultiDay) {
      dateLabel = isSameMonth(event.startDate, event.endDate) 
        ? `${format(event.startDate, "MMM d")} - ${format(event.endDate, "d")}`
        : `${format(event.startDate, "MMM d")} - ${format(event.endDate, "MMM d")}`;
  }

  const getStyles = (type: string) => {
    switch (type) {
      case "Training": return { bar: "bg-[#004F71]", bg: "bg-white", text: "text-[#004F71]" };
      case "Goal": return { bar: "bg-emerald-500", bg: "bg-white", text: "text-emerald-700" };
      case "Deadline": return { bar: "bg-[#E51636]", bg: "bg-white", text: "text-[#E51636]" };
      case "OneOnOne": return { bar: "bg-purple-600", bg: "bg-white", text: "text-purple-700" };
      default: return { bar: "bg-slate-500", bg: "bg-white", text: "text-slate-600" };
    }
  };
  const styles = getStyles(event.type);

  const getPriorityColor = (p: string) => {
      switch(p) {
          case 'High': return "text-[#E51636]";
          case 'Medium': return "text-amber-500";
          case 'Low': return "text-[#004F71]";
          default: return "text-slate-400";
      }
  }

  return (
    <motion.div
      className="absolute top-2 h-[40px] md:h-[44px] z-20 group/card" 
      style={{ left: leftPos, width: width }}
    >
      <motion.div
        ref={cardRef}
        drag={!isLinking && !isStamping ? "x" : false}
        dragMomentum={false}
        dragElastic={0.05} // Consistent with grid
        dragSnapToOrigin={true}
        onDragStart={() => { 
            isDraggingRef.current = true; 
            setIsLocalDragging(true);
            if (onDragStart) onDragStart(); 
        }}
        onDragEnd={(_, info) => {
          if (onDragComplete) onDragComplete(); 
          const movedSlots = Math.round(info.offset.x / dayWidth);
          if (movedSlots !== 0) onDragEnd(event.id, movedSlots);
          
          setIsLocalDragging(false);
          setTimeout(() => { isDraggingRef.current = false; }, 150);
        }}
        onClick={(e) => { e.stopPropagation(); if (isDraggingRef.current) return; onClick(); }}
        
        whileHover={{ y: -2, scale: 1.02, zIndex: 50 }}
        whileDrag={{ 
            scale: 1.05, 
            opacity: 0.95, 
            zIndex: 100,
            cursor: "grabbing",
            boxShadow: "0 20px 40px -10px rgba(0,0,0,0.15)"
        }}
        
        className={cn(
            "w-full h-full border overflow-hidden transition-all relative select-none shadow-sm",
            styles.bg,
            isLinking ? "cursor-alias border-dashed border-[#004F71]" : "cursor-grab border-slate-200/80",
            (isSource || isTarget) && "border-[#004F71]/30 shadow-md ring-2 ring-[#004F71]/5",
            isStamping && "cursor-crosshair opacity-80",
            isCompact ? "p-1" : "px-2 md:px-3 flex flex-col justify-center",
            isContinuesLeft ? "rounded-l-none border-l-0" : "rounded-l-[12px]",
            isContinuesRight ? "rounded-r-none border-r-0" : "rounded-r-[12px]",
            isLocalDragging && "border-[#004F71] ring-2 ring-[#004F71]/10"
        )}
      >
        {isTarget && <TerminalNode type="input" />}
        {isSource && <TerminalNode type="output" />}

        {!isContinuesLeft && <div className={cn("absolute left-0 top-0 bottom-0 w-1", styles.bar)} />}
        {!isContinuesRight && <div className={cn("absolute right-0 top-0 bottom-0 w-1", styles.bar)} />}
        
        {isContinuesLeft && <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-slate-100 to-transparent z-10 flex items-center justify-start pl-0.5"><ChevronLeft className="w-3 h-3 text-slate-400" /></div>}
        {isContinuesRight && <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-slate-100 to-transparent z-10 flex items-center justify-end pr-0.5"><ChevronRight className="w-3 h-3 text-slate-400" /></div>}

        {isCompact ? (
            <div className="flex flex-col justify-center h-full w-full pl-1.5 overflow-hidden">
                 <div className="flex items-center gap-1">
                    <Flag className={cn("w-2 h-2 fill-current shrink-0", getPriorityColor(event.priority))} />
                    <span className={cn("text-[8px] font-black truncate leading-tight", styles.text)}>{event.title}</span>
                 </div>
            </div>
        ) : (
            <div className="flex items-center justify-between w-full relative z-20 gap-2 pl-1">
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-center gap-1.5">
                        {isSource && !isLinking && <Link2 className="w-2.5 h-2.5 text-slate-400" />}
                        <Flag className={cn("w-2.5 h-2.5 fill-current shrink-0", getPriorityColor(event.priority))} />
                        <span className={cn("text-[9px] md:text-[10px] font-black truncate tracking-tight leading-tight", styles.text)}>{event.title}</span>
                        {event.stickers?.slice(0, 3).map(s => {
                            const st = STICKERS.find(x => x.id === s);
                            return st ? <div key={s} className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[7px] bg-white border border-slate-100 shadow-sm z-10 hidden md:flex">{st.icon}</div> : null;
                        })}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 opacity-60">
                        {isMultiDay ? <CalendarIcon className="w-2 h-2" /> : <Clock className="w-2 h-2" />}
                        <span className="text-[7px] md:text-[8px] font-bold text-slate-500">{dateLabel}</span>
                    </div>
                </div>
                <div className="flex items-center -space-x-1.5 shrink-0 pl-1">
                      <div className={cn("w-4 h-4 md:w-5 md:h-5 rounded-md flex items-center justify-center text-[6px] md:text-[7px] font-black text-white shadow-sm ring-1 ring-white z-10", leader?.dept === "FOH" ? "bg-[#004F71]" : "bg-[#E51636]")}>{leader?.name.charAt(0) || '?'}</div>
                      {participant && <div className={cn("w-4 h-4 md:w-5 md:h-5 rounded-md flex items-center justify-center text-[6px] md:text-[7px] font-black text-white shadow-sm ring-1 ring-white", participant.dept === "FOH" ? "bg-[#004F71]" : "bg-[#E51636]")}>{participant.name.charAt(0)}</div>}
                </div>
            </div>
        )}

        {/* Drag Ghost Overlay */}
        <AnimatePresence>
            {isLocalDragging && (
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-white/50 backdrop-blur-[1px] pointer-events-none z-50 flex items-center justify-center"
                >
                    <div className="w-1.5 h-1.5 rounded-full bg-[#004F71] animate-pulse" />
                </motion.div>
            )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default memo(TimelineEventCard);