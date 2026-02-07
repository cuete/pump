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

function getWeekDates(): string[] {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((dow + 6) % 7));

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    return toLocalDateStr(d);
  });
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatDay(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).getDate();
}

export function WeekCalendar({ onSelectDay }: Props) {
  const dates = getWeekDates();
  const today = toLocalDateStr(new Date());

  const daysWithData = useLiveQuery(async () => {
    const routines = await db.routines.where('date').anyOf(dates).toArray();
    return new Set(routines.map((r) => r.date));
  }, [dates.join(',')]);

  return (
    <div className="week-calendar">
      <h1 className="app-title">Pump</h1>
      <div className="week-grid">
        {dates.map((date, i) => (
          <button
            key={date}
            className={`day-cell ${date === today ? 'today' : ''} ${daysWithData?.has(date) ? 'has-data' : ''}`}
            onClick={() => onSelectDay(date)}
          >
            <span className="day-label">{DAY_LABELS[i]}</span>
            <span className="day-number">{formatDay(date)}</span>
            {daysWithData?.has(date) && <span className="day-dot" />}
          </button>
        ))}
      </div>
    </div>
  );
}
