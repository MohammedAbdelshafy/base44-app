import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, BookOpen, Code, MessageSquare,
  Rocket, Hash
} from 'lucide-react';

import { useChronicleSearch } from '../hooks/useMissionControl';

const TYPE_CONFIG = {
  decision:     { icon: BookOpen,       color: '#8b5cf6', label: 'Decision'     },
  conversation: { icon: MessageSquare,  color: '#3b82f6', label: 'Conversation' },
  log:          { icon: Hash,           color: '#64748b', label: 'Log'          },
  code_change:  { icon: Code,           color: '#10b981', label: 'Code Change'  },
  deployment:   { icon: Rocket,         color: '#f59e0b', label: 'Deployment'   },
};

/**
 * Chronicle search — semantic search across the knowledge layer.
 */
export default function ChronicleSearch() {
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState([]);
  const [results, setResults] = useState(null);

  const searchMutation = useChronicleSearch();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    const data = {
      query: query.trim(),
      entry_types: typeFilter.length > 0 ? typeFilter : undefined,
      limit: 30,
    };

    const result = await searchMutation.mutateAsync(data);
    setResults(result);
  };

  const toggleType = (type) => {
    setTypeFilter(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a1a 0%, #0f0f2e 50%, #0a0a1a 100%)',
      color: '#e2e8f0',
      fontFamily: '"Inter", -apple-system, sans-serif',
      padding: '40px 32px',
    }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <BookOpen size={36} style={{ color: '#8b5cf6', marginBottom: '12px' }} />
          </motion.div>
          <h1 style={{ margin: '0 0 8px', fontSize: '28px', fontWeight: 700, letterSpacing: '-0.03em' }}>
            Chronicle
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#475569' }}>
            Search across decisions, conversations, code changes, and deployments
          </p>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} style={{ marginBottom: '24px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'rgba(15,15,25,0.9)',
            border: '1px solid rgba(139,92,246,0.2)',
            borderRadius: '16px',
            padding: '4px 4px 4px 20px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}>
            <Search size={18} style={{ color: '#64748b', flexShrink: 0 }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the knowledge base..."
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#e2e8f0',
                fontSize: '15px',
                padding: '12px 0',
              }}
            />
            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={searchMutation.isPending || !query.trim()}
              style={{
                background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                border: 'none',
                borderRadius: '12px',
                padding: '10px 24px',
                color: '#fff',
                cursor: !query.trim() ? 'default' : 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                opacity: !query.trim() ? 0.4 : 1,
              }}
            >
              {searchMutation.isPending ? 'Searching...' : 'Search'}
            </motion.button>
          </div>
        </form>

        {/* Type filters */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '28px',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}>
          {Object.entries(TYPE_CONFIG).map(([type, cfg]) => {
            const Icon = cfg.icon;
            const active = typeFilter.includes(type);
            return (
              <motion.button
                key={type}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleType(type)}
                style={{
                  background: active ? `${cfg.color}20` : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${active ? `${cfg.color}40` : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: '20px',
                  padding: '6px 14px',
                  cursor: 'pointer',
                  color: active ? cfg.color : '#94a3b8',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Icon size={12} />
                {cfg.label}
              </motion.button>
            );
          })}
        </div>

        {/* Results */}
        <AnimatePresence>
          {results && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div style={{
                fontSize: '12px',
                color: '#475569',
                marginBottom: '16px',
              }}>
                {results.total} results for "{results.query}"
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {results.entries?.map((entry) => {
                  const cfg = TYPE_CONFIG[entry.entry_type] || TYPE_CONFIG.log;
                  const Icon = cfg.icon;

                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      style={{
                        background: 'rgba(15,15,25,0.8)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '12px',
                        padding: '16px 20px',
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '8px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Icon size={14} style={{ color: cfg.color }} />
                          <span style={{
                            fontSize: '10px',
                            color: cfg.color,
                            fontWeight: 600,
                            textTransform: 'uppercase',
                          }}>
                            {cfg.label}
                          </span>
                        </div>
                        <span style={{ fontSize: '10px', color: '#475569' }}>
                          {formatDate(entry.created_at)}
                        </span>
                      </div>

                      {entry.title && (
                        <h3 style={{
                          margin: '0 0 6px',
                          fontSize: '14px',
                          fontWeight: 600,
                          color: '#e2e8f0',
                        }}>
                          {entry.title}
                        </h3>
                      )}

                      <p style={{
                        margin: 0,
                        fontSize: '13px',
                        color: '#94a3b8',
                        lineHeight: 1.6,
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>
                        {entry.summary || entry.content}
                      </p>

                      {entry.tags && entry.tags.length > 0 && (
                        <div style={{
                          display: 'flex',
                          gap: '4px',
                          marginTop: '8px',
                          flexWrap: 'wrap',
                        }}>
                          {entry.tags.map((tag, i) => (
                            <span key={i} style={{
                              fontSize: '10px',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              background: 'rgba(255,255,255,0.05)',
                              color: '#64748b',
                            }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  );
                })}

                {results.entries?.length === 0 && (
                  <div style={{
                    padding: '40px',
                    textAlign: 'center',
                    color: '#334155',
                    fontSize: '14px',
                  }}>
                    No results found
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function formatDate(isoStr) {
  if (!isoStr) return '';
  return new Date(isoStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
