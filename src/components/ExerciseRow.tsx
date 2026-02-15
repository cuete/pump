import { usePhotos, useUpdateExercise } from '../hooks/useApi';
import type { ExerciseResponse } from '../api/client';

interface Props {
  exercise: ExerciseResponse;
  onTap: (exercise: ExerciseResponse) => void;
}

export function ExerciseRow({ exercise, onTap }: Props) {
  const { photoCount } = usePhotos(exercise.id);
  const updateExerciseMutation = useUpdateExercise();

  const details = [
    exercise.repetitions ? `x${exercise.repetitions}` : null,
    exercise.weight ? `${exercise.weight}lb` : null,
    exercise.time && exercise.time !== '00:00' ? exercise.time : null,
  ]
    .filter(Boolean)
    .join(' / ');

  async function addSet(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await updateExerciseMutation(exercise.id, exercise.routineId, {
        sets: exercise.sets + 1,
        setsCompleted: exercise.setsCompleted + 1,
      });
    } catch (error) {
      console.error('Failed to add set:', error);
    }
  }

  async function toggleSet(index: number, e: React.MouseEvent) {
    e.stopPropagation();
    const newCompleted = index < exercise.setsCompleted
      ? index
      : index + 1;
    try {
      await updateExerciseMutation(exercise.id, exercise.routineId, { setsCompleted: newCompleted });
    } catch (error) {
      console.error('Failed to toggle set:', error);
    }
  }

  return (
    <div className="exercise-row" onClick={() => onTap(exercise)}>
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
