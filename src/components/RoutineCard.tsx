import { useState } from 'react';
import { createPortal } from 'react-dom';
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
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [copyDate, setCopyDate] = useState('');

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
      distance: 0,
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

  async function handleCopy() {
    if (!copyDate) return;

    // Get the highest order for the target date
    const existingRoutines = await db.routines.where('date').equals(copyDate).toArray();
    const maxOrder = existingRoutines.reduce((max, r) => Math.max(max, r.order), 0);

    // Copy the routine
    const newRoutineId = await db.routines.add({
      date: copyDate,
      name: routine.name,
      order: maxOrder + 1,
    });

    // Copy all exercises with setsCompleted reset to 0
    if (exercises) {
      for (const ex of exercises) {
        await db.exercises.add({
          routineId: newRoutineId as number,
          name: ex.name,
          repetitions: ex.repetitions,
          weight: ex.weight,
          sets: ex.sets,
          setsCompleted: 0, // Reset completed sets
          time: ex.time,
          distance: ex.distance,
          order: ex.order,
        });
      }
    }

    setShowCopyDialog(false);
    setCopyDate('');
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
          className="btn-icon copy"
          onClick={(e) => {
            e.stopPropagation();
            setShowCopyDialog(true);
          }}
          title="Copy to another day"
        >
          📋
        </button>
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
      {showCopyDialog && createPortal(
        <div className="modal-overlay" onClick={() => setShowCopyDialog(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Copy Routine</h3>
              <button className="btn-icon" onClick={() => setShowCopyDialog(false)}>&times;</button>
            </div>
            <div className="form-group">
              <label>Select Date</label>
              <input
                type="date"
                value={copyDate}
                onChange={(e) => setCopyDate(e.target.value)}
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button
                className="btn btn-danger btn-small"
                onClick={() => setShowCopyDialog(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCopy}
                disabled={!copyDate}
              >
                Copy
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
