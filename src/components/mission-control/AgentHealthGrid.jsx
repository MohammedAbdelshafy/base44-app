import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Heart, AlertTriangle, Cpu, Zap } from 'lucide-react';

const AGENT_ICONS = {
  jarvis:    '🧠',
  hermes:    '📡',
  builder:   '🔨',
  qa:        '🧪',
  architect: '📐',
  devops:    '🚀',
  doc:       '📝',
  revenue:   '💰',
  outreach:  '🤝',
};

const STATUS_COLORS = {
  idle:     { dot: '#64748b', pulse: false },
  busy:     { dot: '#3b82f6', pulse: true  },
  starting: { dot: '#f59e0b', pulse: true  },
  stopping: { dot: '#8b5cf6', pulse: false },
  error:    { dot: '#ef4444', pulse: true  },
};

/**
 * Grid display of agent health statuses.
 * Shows heartbeat visualization and resource usage.
 */
export default function AgentHealthGrid({ agents = [] }) {
  if (agents.length === 0) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: '#475569',
        fontSize: '14px',
      }}>
        <Activity size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
        <p>No active agents</p>
      </div>
    );
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
      gap: '12px',
    }}>
      {agents.map((agent) => (
        <AgentHealthTile key={agent.id} agent={agent} />
      ))}
    </div>
  );
}

function AgentHealthTile({ agent }) {
  const statusConfig = STATUS_COLORS[agent.status] || STATUS_COLORS.idle;
  const icon = AGENT_ICONS[agent.type] || '🤖';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{
        background: 'rgba(15,15,25,0.8)',
        border: `1px solid ${agent.is_healthy ? 'rgba(255,255,255,0.06)' : 'rgba(239,68,68,0.3)'}`,
        borderRadius: '12px',
        padding: '16px',
        position: 'relative',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <span style={{ fontSize: '20px' }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '13px',
            fontWeight: 600,
            color: '#e2e8f0',
            textTransform: 'capitalize',
          }}>
            {agent.type}
          </div>
          <div style={{
            fontSize: '11px',
            color: '#64748b',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {agent.current_task || 'Idle'}
          </div>
        </div>

        {/* Status dot with pulse */}
        <div style={{ position: 'relative' }}>
          {statusConfig.pulse && (
            <motion.div
              style={{
                position: 'absolute',
                inset: '-4px',
                borderRadius: '50%',
                background: statusConfig.dot,
                opacity: 0.3,
              }}
              animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
          <div style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: statusConfig.dot,
            position: 'relative',
          }} />
        </div>
      </div>

      {/* Progress */}
      {agent.total_steps > 0 && (
        <div style={{ marginBottom: '10px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '10px',
            color: '#64748b',
            marginBottom: '4px',
          }}>
            <span>Step {agent.current_step}/{agent.total_steps}</span>
            <span>{Math.round((agent.current_step / agent.total_steps) * 100)}%</span>
          </div>
          <div style={{
            width: '100%',
            height: '3px',
            borderRadius: '2px',
            background: 'rgba(255,255,255,0.06)',
          }}>
            <div style={{
              width: `${(agent.current_step / agent.total_steps) * 100}%`,
              height: '100%',
              borderRadius: '2px',
              background: statusConfig.dot,
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>
      )}

      {/* Resource stats */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '10px',
        color: '#475569',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <Zap size={10} />
          {(agent.tokens_used / 1000).toFixed(1)}K
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <Heart size={10} color={agent.is_healthy ? '#10b981' : '#ef4444'} />
          {agent.is_healthy ? 'Healthy' : 'Down'}
        </span>
        {agent.restart_count > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#f59e0b' }}>
            <AlertTriangle size={10} />
            {agent.restart_count}×
          </span>
        )}
      </div>
    </motion.div>
  );
}
