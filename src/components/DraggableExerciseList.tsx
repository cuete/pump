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
  onReorder: (activeId: number, overId: number) => void;
}

export function DraggableExerciseList({ exercises, onTap, onReorder }: Props) {
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
      onReorder(Number(active.id), Number(over.id));
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
            isDraggable={true}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}
