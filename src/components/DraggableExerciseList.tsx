import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ExerciseRow } from './ExerciseRow';
import type { Exercise } from '../types';

interface Props {
  exercises: Exercise[];
  onTap: (exercise: Exercise) => void;
  onUpdate?: () => void | Promise<void>;
  onReorder: (activeId: string, overId: string) => void;
}

export function DraggableExerciseList({ exercises, onTap, onUpdate, onReorder }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // 200ms delay before drag starts on touch
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      onReorder(String(active.id), String(over.id));
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={exercises.map(ex => ex.id!)}
        strategy={verticalListSortingStrategy}
      >
        {exercises.map((ex) => (
          <ExerciseRow
            key={ex.id}
            exercise={ex}
            onTap={onTap}
            onUpdate={onUpdate}
            isDraggable={true}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}
