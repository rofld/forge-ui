// KanbanColumn — droppable column for a given task status (Sprint 35-W.1).
// Uses @dnd-kit/core useDroppable. Renders a KanbanCard list in a scrollable body.
'use client';

import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { KanbanCard } from './KanbanCard';
import type { TaskRecord } from '@/lib/api';
import type { ReactNode } from 'react';

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

interface KanbanColumnProps {
  title: string;
  status: TaskStatus;
  tasks: TaskRecord[];
  onCardDrop?: (taskId: string, newStatus: TaskStatus) => void;
  header?: ReactNode;
  onCardClick?: (task: TaskRecord) => void;
}

const statusHeaderColor: Record<TaskStatus, string> = {
  pending: 'border-stone-600 text-stone-300',
  running: 'border-yellow-500/50 text-yellow-300',
  completed: 'border-green-500/50 text-green-300',
  failed: 'border-red-500/50 text-red-400',
};

const statusBodyBg: Record<TaskStatus, string> = {
  pending: 'bg-stone-900/40',
  running: 'bg-yellow-950/20',
  completed: 'bg-green-950/20',
  failed: 'bg-red-950/20',
};

export function KanbanColumn({
  title,
  status,
  tasks,
  header,
  onCardClick,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex flex-col min-w-[220px] w-[260px] shrink-0">
      {/* Column header */}
      <div
        className={cn(
          'flex items-center justify-between px-3 py-2 border-b rounded-t-xl',
          'bg-stone-900 border-stone-700',
          statusHeaderColor[status]
        )}
      >
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-widest">
            {title}
          </span>
          <span className="text-[10px] font-mono text-stone-500">
            {tasks.length}
          </span>
        </div>
        {header}
      </div>

      {/* Droppable body */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex flex-col gap-2 flex-1 min-h-[120px] p-2 rounded-b-xl border border-t-0 border-stone-700 overflow-y-auto',
          statusBodyBg[status],
          isOver && 'ring-1 ring-inset ring-violet-500/50'
        )}
      >
        {tasks.map((task) => (
          <KanbanCard key={task.id} task={task} onClick={onCardClick} />
        ))}
        {tasks.length === 0 && (
          <div className="flex items-center justify-center flex-1 py-4 text-[11px] text-stone-600 select-none">
            No tasks
          </div>
        )}
      </div>
    </div>
  );
}
