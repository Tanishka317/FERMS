import { Search, X } from 'lucide-react';

export default function SearchBar({ value, onChange, placeholder = 'Search…', onClear }) {
  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <Search
        size={16}
        style={{ position: 'absolute', left: '12px', color: '#9ca3af', pointerEvents: 'none' }}
      />
      <input
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        style={{
          width: '100%',
          paddingLeft: '36px',
          paddingRight: value ? '36px' : '12px',
          paddingTop: '8px',
          paddingBottom: '8px',
          border: '1px solid #d1d5db',
          borderRadius: '8px',
          fontSize: '13px',
          color: '#111827',
          background: '#fff',
          outline: 'none',
          transition: 'border-color 0.15s',
        }}
        onFocus={e => (e.target.style.borderColor = '#2563eb')}
        onBlur={e => (e.target.style.borderColor = '#d1d5db')}
      />
      {value && (
        <button
          onClick={() => { onChange(''); onClear?.(); }}
          aria-label="Clear search"
          style={{
            position: 'absolute', right: '10px', background: 'none', border: 'none',
            cursor: 'pointer', color: '#9ca3af', display: 'flex', padding: '2px',
          }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
