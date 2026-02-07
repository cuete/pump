import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { RoutineCard } from './RoutineCard';

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
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const routines = useLiveQuery(
    () => db.routines.where('date').equals(date).sortBy('order'),
    [date],
  );

  // Auto-expand newest (last in order, first after reverse) on initial load
  const reversed = routines?.slice().reverse();
  const newestId = reversed?.[0]?.id ?? null;
  const activeId = expandedId !== undefined ? expandedId : newestId;

  async function addRoutine() {
    const order = (routines?.length ?? 0) + 1;
    const id = await db.routines.add({ date, name: `Routine ${order}`, order });
    setExpandedId(id as number);
  }

  async function deleteRoutine(id: number) {
    const exercises = await db.exercises.where('routineId').equals(id).toArray();
    for (const ex of exercises) {
      await db.exercisePhotos.where('exerciseId').equals(ex.id!).delete();
    }
    await db.exercises.where('routineId').equals(id).delete();
    await db.routines.delete(id);
    if (activeId === id) setExpandedId(null);
  }

  function handleToggle(id: number) {
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
