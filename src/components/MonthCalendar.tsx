import { useState, useMemo, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { SettingsMenu } from './SettingsMenu';
import type { Routine } from '../types';

interface Props {
  onSelectDay: (date: string) => void;
}

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getMonthGrid(year: number, month: number): (string | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = (firstDay.getDay() + 6) % 7; // Mon=0

  const cells: (string | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    cells.push(toLocalDateStr(new Date(year, month, d)));
  }
  return cells;
}

export function MonthCalendar({ onSelectDay }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [previewDate, setPreviewDate] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const today = toLocalDateStr(now);

  const lastTapRef = useRef<{ date: string; time: number } | null>(null);

  const cells = useMemo(() => getMonthGrid(year, month), [year, month]);

  const allDates = useMemo(() => cells.filter(Boolean) as string[], [cells]);

  const daysWithData = useLiveQuery(async () => {
    if (allDates.length === 0) return new Set<string>();
    const routines = await db.routines.where('date').anyOf(allDates).toArray();
    return new Set(routines.map((r) => r.date));
  }, [allDates.join(',')]);

  const previewRoutines = useLiveQuery<Routine[]>(
    () => previewDate ? db.routines.where('date').equals(previewDate).sortBy('order') : Promise.resolve([]),
    [previewDate],
  );

  function handleDayClick(date: string) {
    const now = Date.now();
    const lastTap = lastTapRef.current;

    // Double tap detection: same date within 300ms
    if (lastTap && lastTap.date === date && now - lastTap.time < 300) {
      lastTapRef.current = null;
      setPreviewDate(null);
      onSelectDay(date);
    } else {
      // Single tap: show preview
      lastTapRef.current = { date, time: now };
      setPreviewDate(date);
    }
  }

  function prevMonth() {
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else setMonth(month - 1);
    setPreviewDate(null);
  }

  function nextMonth() {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else setMonth(month + 1);
    setPreviewDate(null);
  }

  return (
    <div className="month-calendar">
      <div className="month-header">
        <button className="btn-nav" onClick={prevMonth}>&lsaquo;</button>
        <h1 className="app-title">💪 Pump</h1>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button className="btn-nav" onClick={nextMonth}>&rsaquo;</button>
          <button className="btn-icon" onClick={() => setShowSettings(true)}>⚙</button>
        </div>
      </div>
      <div className="month-label">{MONTH_NAMES[month]} {year}</div>
      <div className="month-grid">
        {DAY_LABELS.map((l) => (
          <span key={l} className="month-day-label">{l}</span>
        ))}
        {cells.map((date, i) =>
          date ? (
            <button
              key={date}
              className={`day-cell ${date === today ? 'today' : ''} ${date === previewDate ? 'selected' : ''} ${daysWithData?.has(date) ? 'has-data' : ''}`}
              onClick={() => handleDayClick(date)}
            >
              <span className="day-number">{new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10))).getDate()}</span>
              {daysWithData?.has(date) && <span className="day-dot" />}
            </button>
          ) : (
            <span key={`empty-${i}`} className="day-cell empty" />
          ),
        )}
      </div>
      {previewDate && (
        <div className="day-preview">
          <div className="preview-header">
            <h3>{formatPreviewDate(previewDate)}</h3>
            <button className="btn-small btn-primary" onClick={() => onSelectDay(previewDate)}>
              View Full Day
            </button>
          </div>
          {previewRoutines && previewRoutines.length > 0 ? (
            <div className="preview-routines">
              {previewRoutines.map((routine) => (
                <PreviewRoutine key={routine.id} routineId={routine.id!} routineName={routine.name} />
              ))}
            </div>
          ) : (
            <div className="preview-empty">No workouts for this day</div>
          )}
        </div>
      )}
      {showSettings && <SettingsMenu onClose={() => setShowSettings(false)} />}
    </div>
  );
}

function formatPreviewDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${dayNames[date.getDay()]}, ${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`;
}

interface PreviewRoutineProps {
  routineId: number;
  routineName: string;
}

function PreviewRoutine({ routineId, routineName }: PreviewRoutineProps) {
  const exercises = useLiveQuery(
    () => db.exercises.where('routineId').equals(routineId).sortBy('order'),
    [routineId],
  );

  if (!exercises) return null;

  const totalSets = exercises.reduce((sum, ex) => sum + (ex.sets || 0), 0);
  const completedSets = exercises.reduce((sum, ex) => sum + (ex.setsCompleted || 0), 0);

  return (
    <div className="preview-routine">
      <div className="preview-routine-header">
        <span className="preview-routine-name">{routineName}</span>
        <span className="preview-routine-progress">
          {completedSets}/{totalSets} sets
        </span>
      </div>
      {exercises.length > 0 && (
        <div className="preview-exercises">
          {exercises.map((ex) => (
            <div key={ex.id} className="preview-exercise">
              <span className="preview-exercise-name">{ex.name}</span>
              <span className="preview-exercise-details">
                {ex.sets} × {ex.repetitions} {ex.weight ? `@ ${ex.weight}lbs` : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
