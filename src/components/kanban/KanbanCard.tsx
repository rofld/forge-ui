// KanbanCard — draggable task card for the kanban board (Sprint 35-W.1).
// Uses @dnd-kit/core useDraggable. Click triggers optional onClick callback.
'use client';

import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { TaskRecord } from '@/lib/api';

export type { TaskRecord };

interface KanbanCardProps {
  task: TaskRecord;
  onClick?: (task: TaskRecord) => void;
}

const priorityVariant: Record<string, 'default' | 'destructive' | 'secondary' | 'outline'> = {
  high: 'destructive',
  medium: 'default',
  low: 'outline',
};

function priorityLabel(task: TaskRecord): string {
  // Derive priority from task metadata or persona field as heuristic.
  if (task.persona?.toLowerCase().includes('high')) return 'high';
  if (task.persona?.toLowerCase().includes('low')) return 'low';
  return 'medium';
}

export function KanbanCard({ task, onClick }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  const style = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  const priority = priorityLabel(task);
  const idPrefix = task.id.slice(0, 8);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onClick?.(task)}
      className={cn(
        'group flex flex-col gap-1.5 rounded-lg border border-stone-700 bg-stone-800 p-3 text-sm shadow-sm',
        'hover:border-stone-500 hover:bg-stone-750 cursor-grab active:cursor-grabbing',
        'transition-colors select-none'
      )}
    >
      {/* ID + priority row */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] text-stone-500">{idPrefix}</span>
        <Badge variant={priorityVariant[priority]} className="text-[10px] h-4 px-1.5">
          {priority}
        </Badge>
      </div>

      {/* Title (prompt truncated) */}
      <p className="line-clamp-2 text-[13px] text-stone-200 leading-snug">
        {task.prompt}
      </p>

      {/* Assignee / model dot */}
      {task.model && (
        <div className="flex items-center gap-1.5 mt-0.5">
          <span
            className="size-1.5 rounded-full bg-violet-400 shrink-0"
            title={task.model}
          />
          <span className="text-[10px] text-stone-500 truncate">{task.model}</span>
        </div>
      )}
    </div>
  );
}
