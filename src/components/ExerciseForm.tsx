import { useState } from 'react';
import { createPortal } from 'react-dom';
import { db } from '../db';
import type { Exercise } from '../types';

interface Props {
  exercise: Exercise;
  onClose: () => void;
  onDelete: (id: string) => void;
  onSave?: () => void | Promise<void>;
}

export function ExerciseForm({ exercise, onClose, onDelete, onSave }: Props) {
  const [name, setName] = useState(exercise.name);
  // Store as string to allow empty fields without forcing 0
  const [repetitions, setRepetitions] = useState<string>(exercise.repetitions === 0 ? '' : String(exercise.repetitions));
  const [weight, setWeight] = useState<string>(exercise.weight === 0 ? '' : String(exercise.weight));
  const [sets, setSets] = useState<string>(exercise.sets === 0 ? '' : String(exercise.sets));
  const [time, setTime] = useState(exercise.time);
  const [distance, setDistance] = useState<string>(exercise.distance === 0 ? '' : String(exercise.distance));

  async function handleSave() {
    await db.exercises.update(exercise.id!, {
      name,
      repetitions: repetitions === '' ? 0 : Number(repetitions),
      weight: weight === '' ? 0 : Number(weight),
      sets: sets === '' ? 0 : Number(sets),
      time,
      distance: distance === '' ? 0 : Number(distance),
    });
    if (onSave) await onSave();
    onClose();
  }

  // Helper function to increment/decrement numeric fields
  const adjustValue = (value: string, delta: number): string => {
    const num = value === '' ? 0 : Number(value);
    const newNum = Math.max(0, num + delta); // Don't go below 0
    return String(newNum);
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{exercise.name || 'New Exercise'}</h3>
          <button className="btn-icon" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-scrollable">
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={name}
              placeholder="Exercise name"
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Reps</label>
              <div className="numeric-input-group">
                <button
                  type="button"
                  className="btn-numeric"
                  onClick={() => setRepetitions(adjustValue(repetitions, -1))}
                >
                  −
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  value={repetitions}
                  placeholder="0"
                  onChange={(e) => setRepetitions(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-numeric"
                  onClick={() => setRepetitions(adjustValue(repetitions, 1))}
                >
                  +
                </button>
              </div>
            </div>
            <div className="form-group">
              <label>Weight (lbs)</label>
              <div className="numeric-input-group">
                <button
                  type="button"
                  className="btn-numeric"
                  onClick={() => setWeight(adjustValue(weight, -1))}
                >
                  −
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  value={weight}
                  placeholder="0"
                  onChange={(e) => setWeight(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-numeric"
                  onClick={() => setWeight(adjustValue(weight, 1))}
                >
                  +
                </button>
              </div>
            </div>
            <div className="form-group">
              <label>Sets</label>
              <div className="numeric-input-group">
                <button
                  type="button"
                  className="btn-numeric"
                  onClick={() => setSets(adjustValue(sets, -1))}
                >
                  −
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  value={sets}
                  placeholder="0"
                  onChange={(e) => setSets(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-numeric"
                  onClick={() => setSets(adjustValue(sets, 1))}
                >
                  +
                </button>
              </div>
            </div>
            <div className="form-group">
              <label>Time</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="mm:ss"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Distance (mi)</label>
              <div className="numeric-input-group">
                <button
                  type="button"
                  className="btn-numeric"
                  onClick={() => setDistance(adjustValue(distance, -1))}
                >
                  −
                </button>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={distance}
                  placeholder="0"
                  onChange={(e) => setDistance(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-numeric"
                  onClick={() => setDistance(adjustValue(distance, 1))}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button
            className="btn btn-danger btn-small"
            onClick={() => { onDelete(exercise.id!); onClose(); }}
          >
            Delete
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
