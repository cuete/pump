import { useLiveQuery } from 'dexie-react-hooks';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { db } from '../db';
import type { Exercise } from '../types';

interface Props {
  exercise: Exercise;
  onTap: (exercise: Exercise) => void;
  isDraggable?: boolean;
}

export function ExerciseRow({ exercise, onTap, isDraggable = false }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: exercise.id!,
    disabled: !isDraggable,
  });
  const photoCount = useLiveQuery(
    () => db.exercisePhotos.where('exerciseId').equals(exercise.id!).count(),
    [exercise.id],
  );

  const details = [
    exercise.repetitions ? `x${exercise.repetitions}` : null,
    exercise.weight ? `${exercise.weight}lb` : null,
    exercise.time && exercise.time !== '00:00' ? exercise.time : null,
  ]
    .filter(Boolean)
    .join(' / ');

  async function addSet(e: React.MouseEvent) {
    e.stopPropagation();
    await db.exercises.update(exercise.id!, {
      sets: exercise.sets + 1,
      setsCompleted: exercise.setsCompleted + 1,
    });
  }

  async function toggleSet(index: number, e: React.MouseEvent) {
    e.stopPropagation();
    const newCompleted = index < exercise.setsCompleted
      ? index
      : index + 1;
    await db.exercises.update(exercise.id!, { setsCompleted: newCompleted });
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`exercise-row ${isDragging ? 'dragging' : ''}`}
      onClick={() => onTap(exercise)}
    >
      {isDraggable && (
        <span className="drag-handle" {...attributes} {...listeners}>
          ⋮⋮
        </span>
      )}
      <span className="exercise-row-name">
        {exercise.name || 'Untitled'}
        {(photoCount ?? 0) > 0 && <span className="photo-indicator"> 📷</span>}
      </span>
      {details && <span className="exercise-row-details">{details}</span>}
      <span className="exercise-row-sets">
        {Array.from({ length: exercise.sets }, (_, i) => (
          <span
            key={i}
            className="set-icon"
            onClick={(e) => toggleSet(i, e)}
          >
            {i < exercise.setsCompleted ? '\u274C' : '\u2B55'}
          </span>
        ))}
        <span className="set-icon set-add" onClick={addSet}>+</span>
      </span>
    </div>
  );
}
