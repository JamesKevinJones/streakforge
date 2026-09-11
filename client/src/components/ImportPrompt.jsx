import React, { useState } from 'react';
import { importLocalData } from '../lib/localImport';

export default function ImportPrompt({ userId, onDone, onDismiss }) {
  const [status, setStatus] = useState('idle'); // idle | importing | done | error
  const [result, setResult] = useState(null);

  const handleImport = async () => {
    setStatus('importing');
    try {
      const r = await importLocalData(userId);
      setResult(r);
      setStatus('done');
      onDone();
    } catch (err) {
      setStatus('error');
      setResult({ error: err.message });
    }
  };

  return (
    <>
      {status === 'idle' && (
        <>
          <p className="text-sm text-white/85">We found a streak history saved in this browser. Import it into your account?</p>
          <div className="flex flex-wrap gap-3">
            <button className="glass btn-glass btn-flame" onClick={handleImport}>Import my streak history</button>
            <button className="glass btn-glass" onClick={onDismiss}>Start fresh instead</button>
          </div>
        </>
      )}
      {status === 'importing' && <p className="text-sm text-white/70">Importing your history...</p>}
      {status === 'done' && (
        <p className="text-sm text-white/85">
          Imported {result.imported} of {result.totalDays} days{result.failed ? ` (${result.failed} skipped)` : ''}.
        </p>
      )}
      {status === 'error' && <p className="text-sm text-red-300">Import failed: {result.error}</p>}
    </>
  );
}
