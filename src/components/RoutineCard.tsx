import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { ExerciseRow } from './ExerciseRow';
import { ExerciseForm } from './ExerciseForm';
import type { Routine, Exercise } from '../types';

interface Props {
  routine: Routine;
  onDelete: (id: number) => void;
  expanded: boolean;
  onToggle: () => void;
}

export function RoutineCard({ routine, onDelete, expanded, onToggle }: Props) {
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [renaming, setRenaming] = useState(false);

  const exercises = useLiveQuery(
    () => db.exercises.where('routineId').equals(routine.id!).sortBy('order'),
    [routine.id],
  );

  async function addExercise() {
    const order = (exercises?.length ?? 0) + 1;
    const id = await db.exercises.add({
      routineId: routine.id!,
      name: '',
      repetitions: 0,
      weight: 0,
      sets: 0,
      setsCompleted: 0,
      time: '00:00',
      order,
    });
    const created = await db.exercises.get(id);
    if (created) setEditing(created);
  }

  async function deleteExercise(id: number) {
    await db.exercisePhotos.where('exerciseId').equals(id).delete();
    await db.exercises.delete(id);
  }

  async function handleRename(newName: string) {
    setRenaming(false);
    if (newName.trim() && newName !== routine.name) {
      await db.routines.update(routine.id!, { name: newName.trim() });
    }
  }

  return (
    <div className="routine-card">
      <div className="routine-header" onClick={onToggle}>
        {renaming ? (
          <input
            className="routine-name-input"
            defaultValue={routine.name}
            autoFocus
            onClick={(e) => e.stopPropagation()}
            onBlur={(e) => handleRename(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename(e.currentTarget.value);
            }}
          />
        ) : (
          <span
            className="routine-name"
            onClick={(e) => { e.stopPropagation(); setRenaming(true); }}
          >
            {routine.name || 'Untitled Routine'}
          </span>
        )}
        <span className="routine-count">{exercises?.length ?? 0} exercises</span>
        <button
          className="btn-icon delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(routine.id!);
          }}
        >
          &times;
        </button>
      </div>
      {expanded && (
        <div className="routine-body">
          {exercises?.map((ex) => (
            <ExerciseRow key={ex.id} exercise={ex} onTap={setEditing} />
          ))}
          <button className="btn btn-small" onClick={addExercise}>
            + Exercise
          </button>
        </div>
      )}
      {editing && (
        <ExerciseForm
          exercise={editing}
          onClose={() => setEditing(null)}
          onDelete={deleteExercise}
        />
      )}
    </div>
  );
}
