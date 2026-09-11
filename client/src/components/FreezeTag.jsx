import React from 'react';
import { SnowflakeIcon } from './icons';

export default function FreezeTag({ count = 0 }) {
  return (
    <div className="glass flex items-center gap-1.5 rounded-full border-frost/25 bg-frost/10 px-3 py-1.5 text-sm font-bold text-frost">
      <SnowflakeIcon width={16} height={16} />
      <span>{count}</span>
      <span className="font-mono text-xs font-semibold text-frost/80">freeze{count === 1 ? '' : 's'}</span>
    </div>
  );
}
