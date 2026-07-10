import React from 'react';
import { motion } from 'framer-motion';
import {
  Rocket, Clock, CheckCircle2, XCircle, Pause,
  Zap, DollarSign, GitBranch
} from 'lucide-react';

const STATUS_CONFIG = {
  pending:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: Clock,        label: 'Pending'  },
  running:  { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)',  icon: Rocket,       label: 'Running'  },
  paused:   { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)',  icon: Pause,        label: 'Paused'   },
  done:     { color: '#10b981', bg: 'rgba(16,185,129,0.12)',  icon: CheckCircle2, label: 'Completed'},
  failed:   { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   icon: XCircle,      label: 'Failed'   },
};

/**
 * Mission summary card for the dashboard grid.
 * Shows status, progress, token usage, and agents.
 */
export default function MissionCard({ mission, onClick }) {
  const config = STATUS_CONFIG[mission.status] || STATUS_CONFIG.pending;
  const StatusIcon = config.icon;
  const elapsed = mission.started_at
    ? formatElapsed(new Date(mission.started_at))
    : '—';

  return (
    <motion.div
      className="mission-card"
      onClick={() => onClick?.(mission.id)}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        background: 'linear-gradient(135deg, rgba(15,15,25,0.9) 0%, rgba(25,25,40,0.95) 100%)',
        border: `1px solid ${config.color}22`,
        borderRadius: '16px',
        padding: '24px',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Status glow effect */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '3px',
        background: `linear-gradient(90deg, transparent, ${config.color}, transparent)`,
        opacity: mission.status === 'running' ? 1 : 0.4,
      }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: 600,
            color: '#e2e8f0',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {mission.name}
          </h3>
          <p style={{
            margin: '4px 0 0',
            fontSize: '12px',
            color: '#64748b',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {mission.description || 'No description'}
          </p>
        </div>

        {/* Status badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: '20px',
          background: config.bg,
          color: config.color,
          fontSize: '12px',
          fontWeight: 600,
          flexShrink: 0,
          marginLeft: '12px',
        }}>
          <StatusIcon size={12} />
          {config.label}
        </div>
      </div>

      {/* Progress bar (for running missions) */}
      {mission.status === 'running' && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{
            width: '100%',
            height: '4px',
            borderRadius: '2px',
            background: 'rgba(255,255,255,0.06)',
            overflow: 'hidden',
          }}>
            <motion.div
              style={{
                height: '100%',
                borderRadius: '2px',
                background: `linear-gradient(90deg, ${config.color}, ${config.color}88)`,
              }}
              animate={{
                width: ['0%', '60%', '80%', '60%'],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </div>
        </div>
      )}

      {/* Stats row */}
      <div style={{
        display: 'flex',
        gap: '16px',
        fontSize: '12px',
        color: '#94a3b8',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Clock size={12} />
          {elapsed}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Zap size={12} />
          {formatTokens(mission.total_tokens_used)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <DollarSign size={12} />
          ${mission.total_cost_usd?.toFixed(3) || '0.000'}
        </div>
        {mission.git_branch && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <GitBranch size={12} />
            {mission.git_branch}
          </div>
        )}
      </div>

      {/* Priority indicator */}
      <div style={{
        position: 'absolute',
        bottom: '12px',
        right: '12px',
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: getPriorityColor(mission.priority),
        boxShadow: `0 0 6px ${getPriorityColor(mission.priority)}`,
      }} />
    </motion.div>
  );
}

function formatElapsed(startDate) {
  const seconds = Math.floor((Date.now() - startDate.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

function formatTokens(tokens) {
  if (!tokens) return '0';
  if (tokens < 1000) return `${tokens}`;
  if (tokens < 1000000) return `${(tokens / 1000).toFixed(1)}K`;
  return `${(tokens / 1000000).toFixed(2)}M`;
}

function getPriorityColor(priority) {
  if (priority >= 9) return '#ef4444';
  if (priority >= 7) return '#f59e0b';
  if (priority >= 5) return '#3b82f6';
  return '#64748b';
}
