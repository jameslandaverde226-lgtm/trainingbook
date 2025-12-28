// lib/hooks/useTaskMap.ts
import { useMemo } from "react";
import { useAppStore } from "@/lib/store/useStore";

export function useTaskMap() {
  const { curriculum } = useAppStore();

  const taskMap = useMemo(() => {
    const map: Record<string, string> = {};
    
    if (!curriculum) return map;

    curriculum.forEach((section) => {
      if (section.tasks) {
        section.tasks.forEach((task: any) => {
          map[task.id] = task.title;
        });
      }
    });
    
    return map;
  }, [curriculum]);

  return taskMap;
}