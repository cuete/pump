import { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { MonthCalendar } from './components/MonthCalendar';
import { DayView } from './components/DayView';
import { DataMigration } from './components/DataMigration';
import { db } from './db';

type View = { type: 'calendar' } | { type: 'day'; date: string };

export default function App() {
  const { user, loading } = useAuth();
  const [view, setView] = useState<View>({ type: 'calendar' });
  const [showMigration, setShowMigration] = useState(false);
  const [checkingMigration, setCheckingMigration] = useState(true);

  // Check if IndexedDB has data that needs migration
  useEffect(() => {
    async function checkForLocalData() {
      try {
        const routineCount = await db.routines.count();
        setShowMigration(routineCount > 0);
      } catch (error) {
        console.error('Error checking for local data:', error);
      } finally {
        setCheckingMigration(false);
      }
    }

    if (user) {
      checkForLocalData();
    }
  }, [user]);

  if (loading || checkingMigration) {
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
      {showMigration && <DataMigration />}
      {view.type === 'calendar' && (
        <MonthCalendar onSelectDay={(date) => setView({ type: 'day', date })} />
      )}
      {view.type === 'day' && (
        <DayView date={view.date} onBack={() => setView({ type: 'calendar' })} />
      )}
    </div>
  );
}
