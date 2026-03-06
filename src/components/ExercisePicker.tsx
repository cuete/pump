import { useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  onSelect: (exerciseName: string) => void;
  onClose: () => void;
}

export function ExercisePicker({ onSelect, onClose }: Props) {
  const [name, setName] = useState('');

  function handleSubmit() {
    if (name.trim()) {
      onSelect(name.trim());
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      handleSubmit();
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
              placeholder="Exercise name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={!name.trim()}>
            Add
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
