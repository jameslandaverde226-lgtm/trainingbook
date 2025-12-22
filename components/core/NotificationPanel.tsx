"use client";
import { useState, useEffect } from "react";
import { X, Bell, CheckCircle2, AlertCircle, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

// Types of notifications for the system
type Notification = {
  id: string;
  type: "success" | "alert" | "info";
  title: string;
  message: string;
  time: string;
  read: boolean;
};

// Mock Data
const NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    type: "success",
    title: "Goal Completed",
    message: "Sarah Jenkins completed 'Speed of Service' training.",
    time: "10 min ago",
    read: false,
  },
  {
    id: "2",
    type: "alert",
    title: "Shift Coverage Needed",
    message: "BOH closing shift for Friday is open.",
    time: "1 hour ago",
    read: false,
  },
  {
    id: "3",
    type: "info",
    title: "New Policy Update",
    message: "Uniform guidelines have been updated for Winter.",
    time: "2 hours ago",
    read: true,
  },
];

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationPanel({ isOpen, onClose }: NotificationPanelProps) {
  const [isVisible, setIsVisible] = useState(false);

  // Handle animation timing
  useEffect(() => {
    if (isOpen) setIsVisible(true);
    else setTimeout(() => setIsVisible(false), 300); // Wait for slide out
  }, [isOpen]);

  if (!isVisible && !isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />

      {/* Slide-over Panel */}
      <div 
        className={cn(
          "relative z-50 w-full max-w-sm bg-slate-50 h-full shadow-2xl transition-transform duration-300 ease-in-out transform border-l border-slate-200",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-5 bg-white border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-[#004F71]" />
              <h2 className="font-bold text-slate-800">Notifications</h2>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {NOTIFICATIONS.map((note) => (
              <div 
                key={note.id}
                className={cn(
                  "p-4 rounded-xl border transition-all hover:shadow-sm bg-white relative overflow-hidden",
                  note.read ? "border-slate-200 opacity-75" : "border-blue-100 shadow-sm ring-1 ring-blue-50"
                )}
              >
                {!note.read && (
                  <div className="absolute top-4 right-4 h-2 w-2 bg-[#E51636] rounded-full" />
                )}
                
                <div className="flex gap-3">
                  <div className={cn(
                    "mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0",
                    note.type === "success" && "bg-emerald-100 text-emerald-600",
                    note.type === "alert" && "bg-amber-100 text-amber-600",
                    note.type === "info" && "bg-blue-100 text-blue-600",
                  )}>
                    {note.type === "success" && <CheckCircle2 className="h-4 w-4" />}
                    {note.type === "alert" && <AlertCircle className="h-4 w-4" />}
                    {note.type === "info" && <Calendar className="h-4 w-4" />}
                  </div>
                  <div>
                    <h3 className={cn("text-sm font-bold", note.read ? "text-slate-600" : "text-slate-900")}>
                      {note.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {note.message}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-2">
                      {note.time}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200 bg-white">
            <button className="w-full py-3 text-xs font-bold text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors">
              Mark all as read
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}