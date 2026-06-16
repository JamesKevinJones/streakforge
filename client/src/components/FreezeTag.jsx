import React from 'react';

export default function FreezeTag({ count = 0 }) {
  return (
    <div className="freeze-tag">
      <span className="freeze-icon">❄️</span>
      <span className="freeze-count">{count}</span>
      <span className="freeze-label">freezes</span>
    </div>
  );
}
