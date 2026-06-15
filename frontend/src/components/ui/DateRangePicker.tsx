'use client';

export function DateRangePicker({
  from,
  to,
  onChange,
}: {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>From</label>
        <input
          type="date"
          value={from}
          onChange={(e) => onChange(e.target.value, to)}
          style={{
            padding: '6px 10px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text-primary)',
            fontSize: 14,
          }}
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label style={{ fontSize: 12, color: 'var(--text-secondary)' }}>To</label>
        <input
          type="date"
          value={to}
          onChange={(e) => onChange(from, e.target.value)}
          style={{
            padding: '6px 10px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text-primary)',
            fontSize: 14,
          }}
        />
      </div>
      {(from || to) && (
        <button
          onClick={() => onChange('', '')}
          style={{
            padding: '6px 12px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'transparent',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: 13,
            alignSelf: 'flex-end',
            marginBottom: 1,
          }}
        >
          Clear
        </button>
      )}
    </div>
  );
}
