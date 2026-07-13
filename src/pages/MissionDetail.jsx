import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Pause, Play, RefreshCw,
  Clock, Zap, DollarSign, GitBranch, Activity
} from 'lucide-react';

import AgentHealthGrid from '../components/mission-control/AgentHealthGrid';
import LogStream from '../components/mission-control/LogStream';
import {
  useMission,
  useMissionLogs,
  useAgents,
  usePauseMission,
  useResumeMission,
  useRetryMission,
} from '../hooks/useMissionControl';
import { useMissionWebSocket } from '../hooks/useWebSocket';

const STATUS_CONFIG = {
  pending:  { color: '#f59e0b', label: 'Pending'   },
  running:  { color: '#3b82f6', label: 'Running'   },
  paused:   { color: '#8b5cf6', label: 'Paused'    },
  done:     { color: '#10b981', label: 'Completed' },
  failed:   { color: '#ef4444', label: 'Failed'    },
};

/**
 * Mission detail page — deep dive into a single mission.
 * Real-time logs, agent activity, and controls.
 */
export default function MissionDetail() {
  const { missionId } = useParams();
  const navigate = useNavigate();

  const { data: mission, isLoading } = useMission(missionId);
  const { data: logsData } = useMissionLogs(missionId);
  const { data: agentsData } = useAgents({ missionId });

  const pauseMission = usePauseMission();
  const resumeMission = useResumeMission();
  const retryMission = useRetryMission();

  // WebSocket for live logs
  const { isConnected } = useMissionWebSocket(missionId);

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a1a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#475569',
      }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <RefreshCw size={24} />
        </motion.div>
      </div>
    );
  }

  if (!mission) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a1a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#64748b',
        fontSize: '16px',
      }}>
        Mission not found
      </div>
    );
  }

  const config = STATUS_CONFIG[mission.status] || STATUS_CONFIG.pending;
  const logs = logsData?.logs || [];
  const agents = agentsData?.agents || [];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a1a 0%, #0f0f2e 50%, #0a0a1a 100%)',
      color: '#e2e8f0',
      fontFamily: '"Inter", -apple-system, sans-serif',
    }}>
      {/* Header */}
      <header style={{
        padding: '16px 32px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(10,10,26,0.8)',
        backdropFilter: 'blur(20px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate('/mission-control')}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: 'none',
                borderRadius: '8px',
                padding: '8px',
                cursor: 'pointer',
                color: '#94a3b8',
              }}
            >
              <ArrowLeft size={18} />
            </motion.button>

            <div>
              <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
                {mission.name}
              </h1>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#475569' }}>
                {mission.description || 'No description'}
              </p>
            </div>

            <div style={{
              padding: '4px 12px',
              borderRadius: '20px',
              background: `${config.color}15`,
              color: config.color,
              fontSize: '12px',
              fontWeight: 600,
            }}>
              {config.label}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {mission.status === 'running' && (
              <ActionButton
                icon={<Pause size={14} />}
                label="Pause"
                onClick={() => pauseMission.mutate(missionId)}
                color="#f59e0b"
              />
            )}
            {mission.status === 'paused' && (
              <ActionButton
                icon={<Play size={14} />}
                label="Resume"
                onClick={() => resumeMission.mutate(missionId)}
                color="#10b981"
              />
            )}
            {mission.status === 'failed' && (
              <ActionButton
                icon={<RefreshCw size={14} />}
                label="Retry"
                onClick={() => retryMission.mutate(missionId)}
                color="#3b82f6"
              />
            )}
          </div>
        </div>
      </header>

      <div style={{ padding: '24px 32px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Stats row */}
        <div style={{
          display: 'flex',
          gap: '20px',
          marginBottom: '24px',
          flexWrap: 'wrap',
        }}>
          <MiniStat icon={<Clock size={14} />} label="Started" value={formatDate(mission.started_at)} />
          <MiniStat icon={<Zap size={14} />} label="Tokens" value={formatNumber(mission.total_tokens_used)} />
          <MiniStat icon={<DollarSign size={14} />} label="Cost" value={`$${mission.total_cost_usd?.toFixed(3)}`} />
          <MiniStat icon={<Activity size={14} />} label="Agents" value={agents.length} />
          {mission.git_branch && (
            <MiniStat icon={<GitBranch size={14} />} label="Branch" value={mission.git_branch} />
          )}
        </div>

        {/* Main content: Logs + Agents */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 320px',
          gap: '24px',
          minHeight: '500px',
        }}>
          {/* Log stream */}
          <div style={{ position: 'relative' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#94a3b8' }}>
              Live Logs
            </h2>
            <LogStream
              logs={logs}
              isLive={mission.status === 'running' && isConnected}
            />
          </div>

          {/* Sidebar: Agents */}
          <div>
            <h2 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#94a3b8' }}>
              Agents ({agents.length})
            </h2>
            <AgentHealthGrid agents={agents} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionButton({ icon, label, onClick, color }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      style={{
        background: `${color}15`,
        border: `1px solid ${color}30`,
        borderRadius: '8px',
        padding: '6px 14px',
        cursor: 'pointer',
        color,
        fontSize: '12px',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}
    >
      {icon}
      {label}
    </motion.button>
  );
}

function MiniStat({ icon, label, value }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 14px',
      background: 'rgba(15,15,25,0.8)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '8px',
    }}>
      <span style={{ color: '#64748b' }}>{icon}</span>
      <span style={{ fontSize: '11px', color: '#475569' }}>{label}</span>
      <span style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>{value}</span>
    </div>
  );
}

function formatDate(isoStr) {
  if (!isoStr) return '—';
  return new Date(isoStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function formatNumber(n) {
  if (!n) return '0';
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toString();
}
