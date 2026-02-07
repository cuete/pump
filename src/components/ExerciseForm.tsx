import { useState } from 'react';
import { createPortal } from 'react-dom';
import { db } from '../db';
import { PhotoManager } from './PhotoManager';
import type { Exercise } from '../types';

interface Props {
  exercise: Exercise;
  onClose: () => void;
  onDelete: (id: number) => void;
}

export function ExerciseForm({ exercise, onClose, onDelete }: Props) {
  const [name, setName] = useState(exercise.name);
  const [repetitions, setRepetitions] = useState(exercise.repetitions);
  const [weight, setWeight] = useState(exercise.weight);
  const [sets, setSets] = useState(exercise.sets);
  const [time, setTime] = useState(exercise.time);

  async function handleSave() {
    await db.exercises.update(exercise.id!, { name, repetitions, weight, sets, time });
    onClose();
  }

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{exercise.name || 'New Exercise'}</h3>
          <button className="btn-icon" onClick={onClose}>&times;</button>
        </div>

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
            <input
              type="number"
              inputMode="numeric"
              value={repetitions}
              onChange={(e) => setRepetitions(Number(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label>Weight</label>
            <input
              type="number"
              inputMode="numeric"
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
            />
          </div>
          <div className="form-group">
            <label>Sets</label>
            <input
              type="number"
              inputMode="numeric"
              value={sets}
              onChange={(e) => setSets(Number(e.target.value))}
            />
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
        </div>

        <PhotoManager exerciseId={exercise.id!} />

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
