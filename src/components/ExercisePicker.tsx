import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { SavedExercise } from '../types';

interface Props {
  onSelect: (saved: SavedExercise | null, filterText: string) => void;
  onClose: () => void;
}

export function ExercisePicker({ onSelect, onClose }: Props) {
  const [filter, setFilter] = useState('');

  const saved = useLiveQuery(
    () => db.savedExercises.orderBy('lastUsed').reverse().toArray(),
    [],
  );

  const filtered = saved?.filter(
    (s) => s.name.toLowerCase().includes(filter.toLowerCase()),
  );

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Add Exercise</h3>
          <button className="btn-icon" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-scrollable">
          <div className="form-group">
            <input
              type="text"
              placeholder="Search or type new name..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              autoFocus
            />
          </div>

          <div className="exercise-picker-list">
            <button
              className="exercise-picker-item new"
              onClick={() => onSelect(null, filter)}
            >
              + New exercise{filter ? `: ${filter}` : ''}
            </button>

            {filtered?.map((s) => (
              <button
                key={s.id}
                className="exercise-picker-item"
                onClick={() => onSelect(s, '')}
              >
                <span className="exercise-picker-name">{s.name}</span>
                <span className="exercise-picker-details">
                  {[
                    s.weight > 0 && `${s.weight}lbs`,
                    s.repetitions > 0 && `${s.repetitions}r`,
                    s.sets > 0 && `${s.sets}s`,
                    s.time !== '00:00' && s.time,
                    s.distance > 0 && `${s.distance}mi`,
                  ].filter(Boolean).join(' · ')}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
