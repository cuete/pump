import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { exportDatabase, importDatabase, downloadJSON, clearAllData } from '../utils/export';
import type { ExportData } from '../types';

interface Props {
  onClose: () => void;
}

export function SettingsMenu({ onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleExport() {
    try {
      setLoading(true);
      setMessage(null);
      const data = await exportDatabase();
      downloadJSON(data);
      setMessage({ type: 'success', text: 'Data exported successfully!' });
    } catch (error) {
      console.error('Export error:', error);
      setMessage({ type: 'error', text: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}` });
    } finally {
      setLoading(false);
    }
  }

  async function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      setMessage(null);

      const text = await file.text();
      let data: ExportData;

      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('Invalid JSON file');
      }

      await importDatabase(data);
      setMessage({ type: 'success', text: 'Data imported successfully!' });

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Import error:', error);
      setMessage({ type: 'error', text: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}` });
    } finally {
      setLoading(false);
    }
  }

  async function handleClearAll() {
    if (!confirm('Are you sure you want to delete ALL workout data? This cannot be undone!')) {
      return;
    }

    if (!confirm('This will permanently delete all routines, exercises, and photos. Are you absolutely sure?')) {
      return;
    }

    try {
      setLoading(true);
      setMessage(null);
      await clearAllData();
      setMessage({ type: 'success', text: 'All data cleared successfully!' });
    } catch (error) {
      console.error('Clear error:', error);
      setMessage({ type: 'error', text: `Clear failed: ${error instanceof Error ? error.message : 'Unknown error'}` });
    } finally {
      setLoading(false);
    }
  }

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Settings</h3>
          <button className="btn-icon" onClick={onClose}>&times;</button>
        </div>

        {message && (
          <div className={`settings-message ${message.type}`}>
            {message.text}
          </div>
        )}

        <div className="modal-scrollable">
          <div className="settings-section">
            <button
              className="btn"
              onClick={handleExport}
              disabled={loading}
            >
              {loading ? 'Exporting...' : 'Export Data'}
            </button>
            <p className="settings-help">
              Download all workout data as JSON
            </p>

            <button
              className="btn"
              onClick={handleImportClick}
              disabled={loading}
            >
              {loading ? 'Importing...' : 'Import Data'}
            </button>
            <p className="settings-help">
              Restore from backup (merges with existing)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />

            <button
              className="btn btn-danger"
              onClick={handleClearAll}
              disabled={loading}
            >
              Clear All Data
            </button>
            <p className="settings-help">
              Permanently delete all workout data
            </p>
          </div>

          <div className="settings-section">
            <p className="settings-about">
              <strong>Pump</strong> - Workout Tracker<br />
              All data stored locally in your browser
            </p>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
