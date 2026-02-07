import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { MonthCalendar } from './components/MonthCalendar';
import { DayView } from './components/DayView';

type View = { type: 'calendar' } | { type: 'day'; date: string };

export default function App() {
  const { user, loading } = useAuth();
  const [view, setView] = useState<View>({ type: 'calendar' });

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="login-screen">
        <span className="login-logo">💪</span>
        <h1>Pump</h1>
        <p>Workout Tracker</p>
        <a href="/.auth/login/aad" className="btn btn-primary">
          Sign in with Microsoft
        </a>
      </div>
    );
  }

  return (
    <div className="app">
      {view.type === 'calendar' && (
        <MonthCalendar onSelectDay={(date) => setView({ type: 'day', date })} />
      )}
      {view.type === 'day' && (
        <DayView date={view.date} onBack={() => setView({ type: 'calendar' })} />
      )}
    </div>
  );
}
