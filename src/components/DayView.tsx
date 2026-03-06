import { useState } from 'react';
import { db } from '../db';
import { RoutineCard } from './RoutineCard';
import { useRoutines } from '../hooks/useRoutines';

interface Props {
  date: string;
  onBack: () => void;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return `${DAY_NAMES[date.getDay()]}, ${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`;
}

export function DayView({ date, onBack }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { routines, refresh } = useRoutines(date);

  // Auto-expand newest (last in order, first after reverse) on initial load
  const reversed = routines?.slice().reverse();
  const newestId = reversed?.[0]?.id ?? null;
  const activeId = expandedId !== undefined ? expandedId : newestId;

  async function addRoutine() {
    const order = (routines?.length ?? 0) + 1;
    const id = await db.routines.add({ date, name: `Routine ${order}`, order });
    await refresh(); // Refresh to show new routine
    setExpandedId(id);
  }

  async function deleteRoutine(id: string) {
    const exercises = await db.exercises.where('routineId').equals(id).toArray();
    for (const ex of exercises) {
      await db.exercises.delete(ex.id!);
    }
    await db.routines.delete(id);
    if (activeId === id) setExpandedId(null);
    await refresh(); // Refresh after delete
  }

  function handleToggle(id: string) {
    setExpandedId(activeId === id ? null : id);
  }

  return (
    <div className="day-view">
      <div className="day-header">
        <button className="btn-back" onClick={onBack}>
          ← Back
        </button>
        <h2>{formatDate(date)}</h2>
      </div>
      <div className="day-body">
        {reversed?.map((r) => (
          <RoutineCard
            key={r.id}
            routine={r}
            onDelete={deleteRoutine}
            expanded={activeId === r.id}
            onToggle={() => handleToggle(r.id!)}
          />
        ))}
        <button className="btn btn-primary" onClick={addRoutine}>
          + Add Routine
        </button>
      </div>
    </div>
  );
}
