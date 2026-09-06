import React from 'react';

interface ToolbarProps {
  searchValue?: string;
  onSearch?: (v: string) => void;
  searchPlaceholder?: string;
  
  groupOptions?: string[];
  groupValue?: string;
  onGroup?: (v: string) => void;
  
  filterOptions?: string[];
  filterValue?: string;
  onFilter?: (v: string) => void;
  
  customFilters?: React.ReactNode;
  
  totalShown?: number;
  totalAll?: number;
  
  viewToggle?: React.ReactNode;
}

export function Toolbar({
  searchValue, onSearch, searchPlaceholder = 'Search...',
  groupOptions = [], groupValue = '', onGroup,
  filterOptions = [], filterValue = '', onFilter,
  customFilters,
  totalShown, totalAll,
  viewToggle
}: ToolbarProps) {
  return (
    <div style={{
      display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
      marginBottom: 14, padding: '10px 14px',
      background: 'var(--surface)', border: '1.5px solid var(--border)',
      borderRadius: 8,
    }}>
      {onSearch !== undefined && searchValue !== undefined && (
        <>
          <input
            className="input"
            placeholder={`🔍  ${searchPlaceholder}`}
            value={searchValue}
            onChange={(e) => onSearch(e.target.value)}
            style={{ minWidth: 180, flex: 1, maxWidth: 260, fontSize: 13, padding: '6px 10px' }}
          />
          {(filterOptions.length > 0 || groupOptions.length > 0 || viewToggle || customFilters) && (
            <div style={{ width: 1, height: 24, background: 'var(--border)' }} />
          )}
        </>
      )}
      
      {filterOptions.length > 0 && onFilter && (
        <>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>Filter:</label>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {filterOptions.map((opt) => (
              <button key={opt} onClick={() => onFilter(opt)} style={{
                padding: '4px 10px', fontSize: 12, fontWeight: 600, borderRadius: 99, cursor: 'pointer',
                border: '1.5px solid', transition: 'all 0.1s',
                borderColor: filterValue === opt ? 'var(--primary)' : 'var(--border)',
                background: filterValue === opt ? 'var(--primary)' : 'transparent',
                color: filterValue === opt ? '#fff' : 'var(--fg-muted)',
              }}>{opt}</button>
            ))}
          </div>
          {(groupOptions.length > 0 || viewToggle || customFilters) && (
            <div style={{ width: 1, height: 24, background: 'var(--border)' }} />
          )}
        </>
      )}

      {customFilters && (
        <>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {customFilters}
          </div>
          {(groupOptions.length > 0 || viewToggle) && (
            <div style={{ width: 1, height: 24, background: 'var(--border)' }} />
          )}
        </>
      )}
      
      {groupOptions.length > 0 && onGroup && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, width: 'auto' }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>Group by:</label>
          <select className="select select-inline" value={groupValue} onChange={(e) => onGroup(e.target.value)}
            style={{ fontSize: 12, padding: '5px 8px', width: 'auto', minWidth: 120, maxWidth: 180 }}>
            {groupOptions.map((o) => <option key={o}>{o}</option>)}
          </select>
        </div>
      )}
      
      {viewToggle && (
        <>
          {groupOptions.length > 0 && <div style={{ width: 1, height: 24, background: 'var(--border)' }} />}
          {viewToggle}
        </>
      )}

      {totalShown !== undefined && totalAll !== undefined && (
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--fg-muted)' }}>
          {totalShown} of {totalAll}
        </span>
      )}
    </div>
  );
}
