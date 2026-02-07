import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

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
  const today = toLocalDateStr(now);

  const cells = useMemo(() => getMonthGrid(year, month), [year, month]);

  const allDates = useMemo(() => cells.filter(Boolean) as string[], [cells]);

  const daysWithData = useLiveQuery(async () => {
    if (allDates.length === 0) return new Set<string>();
    const routines = await db.routines.where('date').anyOf(allDates).toArray();
    return new Set(routines.map((r) => r.date));
  }, [allDates.join(',')]);

  function prevMonth() {
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else setMonth(month - 1);
  }

  function nextMonth() {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else setMonth(month + 1);
  }

  return (
    <div className="month-calendar">
      <div className="month-header">
        <button className="btn-nav" onClick={prevMonth}>&lsaquo;</button>
        <h1 className="app-title">💪 Pump</h1>
        <button className="btn-nav" onClick={nextMonth}>&rsaquo;</button>
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
              className={`day-cell ${date === today ? 'today' : ''} ${daysWithData?.has(date) ? 'has-data' : ''}`}
              onClick={() => onSelectDay(date)}
            >
              <span className="day-number">{new Date(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10))).getDate()}</span>
              {daysWithData?.has(date) && <span className="day-dot" />}
            </button>
          ) : (
            <span key={`empty-${i}`} className="day-cell empty" />
          ),
        )}
      </div>
    </div>
  );
}
