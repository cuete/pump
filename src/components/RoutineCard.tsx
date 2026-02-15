import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useExercises, useCreateExercise, useDeleteExercise, useUpdateRoutine, useRoutines, useCreateRoutine } from '../hooks/useApi';
import { ExerciseRow } from './ExerciseRow';
import { ExerciseForm } from './ExerciseForm';
import type { RoutineResponse } from '../api/client';

interface Props {
  routine: RoutineResponse;
  onDelete: (id: string) => void;
  expanded: boolean;
  onToggle: () => void;
}

export function RoutineCard({ routine, onDelete, expanded, onToggle }: Props) {
  const [editing, setEditing] = useState<any | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [copyDate, setCopyDate] = useState('');

  const { exercises, isLoading } = useExercises(expanded ? routine.id : null);
  const createExerciseMutation = useCreateExercise();
  const deleteExerciseMutation = useDeleteExercise();
  const updateRoutineMutation = useUpdateRoutine();
  const { routines: targetRoutines } = useRoutines(copyDate);
  const createRoutineMutation = useCreateRoutine();

  async function addExercise() {
    try {
      const order = (exercises?.length ?? 0) + 1;
      const created = await createExerciseMutation({
        routineId: routine.id,
        name: '',
        repetitions: 0,
        weight: 0,
        sets: 0,
        setsCompleted: 0,
        time: '00:00',
        distance: 0,
        order,
      });
      setEditing(created);
    } catch (error) {
      console.error('Failed to create exercise:', error);
      alert('Failed to create exercise. Please try again.');
    }
  }

  async function deleteExercise(id: string) {
    try {
      await deleteExerciseMutation(id, routine.id);
    } catch (error) {
      console.error('Failed to delete exercise:', error);
      alert('Failed to delete exercise. Please try again.');
    }
  }

  async function handleRename(newName: string) {
    setRenaming(false);
    if (newName.trim() && newName !== routine.name) {
      try {
        await updateRoutineMutation(routine.id, { name: newName.trim() }, routine.date);
      } catch (error) {
        console.error('Failed to rename routine:', error);
        alert('Failed to rename routine. Please try again.');
      }
    }
  }

  async function handleCopy() {
    if (!copyDate) return;

    try {
      // Get the highest order for the target date
      const maxOrder = targetRoutines?.reduce((max, r) => Math.max(max, r.order), 0) ?? 0;

      // Copy the routine
      const newRoutine = await createRoutineMutation({
        date: copyDate,
        name: routine.name,
        order: maxOrder + 1,
      });

      // Copy all exercises with setsCompleted reset to 0
      if (exercises) {
        for (const ex of exercises) {
          await createExerciseMutation({
            routineId: newRoutine.id,
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
      alert(`Routine copied to ${copyDate}`);
    } catch (error) {
      console.error('Failed to copy routine:', error);
      alert('Failed to copy routine. Please try again.');
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
            onDelete(routine.id);
          }}
        >
          &times;
        </button>
      </div>
      {expanded && (
        <div className="routine-body">
          {isLoading ? (
            <div>Loading exercises...</div>
          ) : (
            <>
              {exercises?.map((ex) => (
                <ExerciseRow key={ex.id} exercise={ex} onTap={setEditing} />
              ))}
              <button className="btn btn-small" onClick={addExercise}>
                + Exercise
              </button>
            </>
          )}
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
