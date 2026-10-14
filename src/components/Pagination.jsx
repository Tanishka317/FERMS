import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        style={btnStyle(currentPage === 1)}
        aria-label="Previous page"
      >
        <ChevronLeft size={16} />
      </button>

      {pages.map(p => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          style={{
            width: '32px', height: '32px', borderRadius: '6px', border: '1px solid',
            fontSize: '13px', fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
            background: p === currentPage ? '#2563eb' : '#fff',
            color: p === currentPage ? '#fff' : '#374151',
            borderColor: p === currentPage ? '#2563eb' : '#d1d5db',
          }}
          aria-label={`Page ${p}`}
          aria-current={p === currentPage ? 'page' : undefined}
        >
          {p}
        </button>
      ))}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        style={btnStyle(currentPage === totalPages)}
        aria-label="Next page"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

function btnStyle(disabled) {
  return {
    width: '32px', height: '32px', borderRadius: '6px',
    border: '1px solid #d1d5db', background: '#fff',
    color: disabled ? '#d1d5db' : '#374151',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };
}
