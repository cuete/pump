import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { db } from '../db';

interface Props {
  onSelect: (exerciseName: string) => void;
  onClose: () => void;
}

export function ExercisePicker({ onSelect, onClose }: Props) {
  const [name, setName] = useState('');
  const [recentExercises, setRecentExercises] = useState<string[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<string[]>([]);

  useEffect(() => {
    // Load recent unique exercise names
    async function loadRecent() {
      const allExercises = await db.exercises.toArray();
      const uniqueNames = Array.from(new Set(allExercises.map(e => e.name)))
        .filter(Boolean)
        .sort();
      setRecentExercises(uniqueNames);
      setFilteredExercises(uniqueNames);
    }
    loadRecent();
  }, []);

  useEffect(() => {
    // Filter exercises based on input
    if (!name.trim()) {
      setFilteredExercises(recentExercises);
    } else {
      const filtered = recentExercises.filter(ex =>
        ex.toLowerCase().includes(name.toLowerCase())
      );
      setFilteredExercises(filtered);
    }
  }, [name, recentExercises]);

  function handleSubmit() {
    if (name.trim()) {
      onSelect(name.trim());
    }
  }

  function handleSelect(exerciseName: string) {
    onSelect(exerciseName);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      if (filteredExercises.length > 0 && !name.trim()) {
        // If no input and there are suggestions, select first one
        handleSelect(filteredExercises[0]);
      } else {
        handleSubmit();
      }
    }
  }

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
              placeholder="Exercise name or search..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>

          {filteredExercises.length > 0 && (
            <div className="exercise-suggestions">
              <div className="suggestions-label">Recent exercises:</div>
              {filteredExercises.map((ex) => (
                <div
                  key={ex}
                  className="suggestion-item"
                  onClick={() => handleSelect(ex)}
                >
                  {ex}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={!name.trim()}>
            Add New
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
