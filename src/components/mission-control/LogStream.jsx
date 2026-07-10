import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Search, Filter, ArrowDown } from 'lucide-react';

const LEVEL_COLORS = {
  debug: '#64748b',
  info:  '#3b82f6',
  warn:  '#f59e0b',
  warning: '#f59e0b',
  error: '#ef4444',
  critical: '#dc2626',
};

/**
 * Real-time log viewer with auto-scroll, search, and level filtering.
 */
export default function LogStream({ logs = [], isLive = true, maxLines = 500 }) {
  const containerRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  // Auto-scroll to bottom on new logs
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Detect manual scroll
  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
    setAutoScroll(isAtBottom);
  };

  // Filter logs
  const filteredLogs = logs.filter(log => {
    if (levelFilter && log.level !== levelFilter) return false;
    if (search && !log.message.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).slice(-maxLines);

  return (
    <div style={{
      background: 'rgba(5,5,15,0.95)',
      borderRadius: '12px',
      border: '1px solid rgba(255,255,255,0.06)',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: '300px',
    }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(15,15,25,0.5)',
      }}>
        <Terminal size={14} style={{ color: '#64748b' }} />
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8' }}>
          Log Stream
        </span>

        {/* Live indicator */}
        {isLive && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            marginLeft: '8px',
          }}>
            <motion.div
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#10b981',
              }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span style={{ fontSize: '10px', color: '#10b981' }}>LIVE</span>
          </div>
        )}

        <div style={{ flex: 1 }} />

        {/* Search */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: '6px',
          padding: '4px 8px',
        }}>
          <Search size={12} style={{ color: '#475569' }} />
          <input
            type="text"
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#e2e8f0',
              fontSize: '11px',
              width: '120px',
            }}
          />
        </div>

        {/* Level filter */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              background: levelFilter ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.04)',
              border: 'none',
              borderRadius: '6px',
              padding: '4px 8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: '#94a3b8',
              fontSize: '11px',
            }}
          >
            <Filter size={12} />
            {levelFilter || 'All'}
          </button>

          {showFilters && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '4px',
              background: 'rgba(20,20,35,0.98)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '4px',
              zIndex: 10,
              minWidth: '100px',
            }}>
              <FilterOption label="All" active={!levelFilter} onClick={() => { setLevelFilter(null); setShowFilters(false); }} />
              {Object.keys(LEVEL_COLORS).map(level => (
                <FilterOption
                  key={level}
                  label={level}
                  color={LEVEL_COLORS[level]}
                  active={levelFilter === level}
                  onClick={() => { setLevelFilter(level); setShowFilters(false); }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Line count */}
        <span style={{ fontSize: '10px', color: '#475569' }}>
          {filteredLogs.length} lines
        </span>
      </div>

      {/* Log lines */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '8px 0',
          fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
          fontSize: '12px',
          lineHeight: '20px',
        }}
      >
        <AnimatePresence>
          {filteredLogs.map((log, idx) => (
            <motion.div
              key={log.id || idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.15 }}
              style={{
                padding: '2px 16px',
                display: 'flex',
                gap: '8px',
                color: '#94a3b8',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.02)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {/* Timestamp */}
              <span style={{ color: '#475569', flexShrink: 0, width: '75px' }}>
                {formatTime(log.created_at)}
              </span>

              {/* Level badge */}
              <span style={{
                color: LEVEL_COLORS[log.level] || '#64748b',
                fontWeight: 600,
                width: '48px',
                flexShrink: 0,
                textTransform: 'uppercase',
                fontSize: '10px',
                lineHeight: '20px',
              }}>
                {log.level}
              </span>

              {/* Message */}
              <span style={{
                color: log.level === 'error' || log.level === 'critical'
                  ? '#fca5a5'
                  : '#cbd5e1',
                flex: 1,
                wordBreak: 'break-word',
              }}>
                {log.message}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredLogs.length === 0 && (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            color: '#334155',
            fontSize: '12px',
          }}>
            {search ? 'No matching log entries' : 'Waiting for logs...'}
          </div>
        )}
      </div>

      {/* Scroll-to-bottom button */}
      {!autoScroll && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            setAutoScroll(true);
            containerRef.current?.scrollTo({
              top: containerRef.current.scrollHeight,
              behavior: 'smooth',
            });
          }}
          style={{
            position: 'absolute',
            bottom: '16px',
            right: '16px',
            background: 'rgba(59,130,246,0.9)',
            border: 'none',
            borderRadius: '20px',
            padding: '6px 12px',
            cursor: 'pointer',
            color: '#fff',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            boxShadow: '0 4px 12px rgba(59,130,246,0.4)',
          }}
        >
          <ArrowDown size={12} />
          Follow
        </motion.button>
      )}
    </div>
  );
}

function FilterOption({ label, color, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        width: '100%',
        padding: '6px 10px',
        background: active ? 'rgba(59,130,246,0.15)' : 'transparent',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        color: active ? '#93c5fd' : '#94a3b8',
        fontSize: '11px',
        textTransform: 'capitalize',
      }}
    >
      {color && (
        <div style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          background: color,
        }} />
      )}
      {label}
    </button>
  );
}

function formatTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleTimeString('en-US', { hour12: false });
}
