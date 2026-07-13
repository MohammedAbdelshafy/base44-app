import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Rocket, Activity, Zap,
  Plus, Clock, CheckCircle2, XCircle
} from 'lucide-react';

import MissionCard from '../components/mission-control/MissionCard';
import AgentHealthGrid from '../components/mission-control/AgentHealthGrid';
import TokenMeter from '../components/mission-control/TokenMeter';
import GitPanel from '../components/mission-control/GitPanel';
import {
  useDashboardSummary,
  useMissions,
  useAgents,
  useGitStatus,
  useCreateMission,
  useHealthCheck,
} from '../hooks/useMissionControl';
import { useSystemWebSocket } from '../hooks/useWebSocket';

/**
 * Main Mission Control Dashboard.
 * 
 * Real-time overview of all missions, agents, costs, and system health.
 */
export default function MissionControlDashboard() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Data hooks
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary();
  const { data: missionsData } = useMissions({ status: statusFilter });
  const { data: agentsData } = useAgents();
  const { data: gitStatus } = useGitStatus();
  const { data: health } = useHealthCheck();
  const createMission = useCreateMission();

  // WebSocket for live updates
  const { isConnected, lastEvent } = useSystemWebSocket({
    onMessage: (event) => {
      // Events auto-trigger React Query refetches via invalidation
    },
  });

  const missions = missionsData?.missions || [];
  const agents = agentsData?.agents || [];
  const s = summary || {};

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a1a 0%, #0f0f2e 50%, #0a0a1a 100%)',
      color: '#e2e8f0',
      fontFamily: '"Inter", "SF Pro Display", -apple-system, sans-serif',
    }}>
      {/* Header */}
      <header style={{
        padding: '20px 32px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(10,10,26,0.8)',
        backdropFilter: 'blur(20px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Rocket size={24} style={{ color: '#8b5cf6' }} />
          </motion.div>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em' }}>
              Mission Control
            </h1>
            <p style={{ margin: 0, fontSize: '11px', color: '#475569' }}>
              Antigravity Remote Operations
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Connection status */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '20px',
            background: isConnected ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
            fontSize: '11px',
            color: isConnected ? '#10b981' : '#ef4444',
          }}>
            <motion.div
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: isConnected ? '#10b981' : '#ef4444',
              }}
              animate={isConnected ? { opacity: [1, 0.3, 1] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            />
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>

          {/* Create mission button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCreateModal(true)}
            style={{
              background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
              border: 'none',
              borderRadius: '10px',
              padding: '8px 16px',
              cursor: 'pointer',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 15px rgba(139,92,246,0.3)',
            }}
          >
            <Plus size={14} />
            New Mission
          </motion.button>
        </div>
      </header>

      <div style={{ padding: '24px 32px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Summary stat cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}>
          <SummaryCard
            icon={<Rocket size={18} />}
            label="Active Missions"
            value={s.active_missions || 0}
            color="#3b82f6"
            onClick={() => setStatusFilter('running')}
          />
          <SummaryCard
            icon={<Clock size={18} />}
            label="Queue"
            value={s.queue_length || 0}
            color="#f59e0b"
            onClick={() => setStatusFilter('pending')}
          />
          <SummaryCard
            icon={<CheckCircle2 size={18} />}
            label="Completed"
            value={s.completed_missions || 0}
            color="#10b981"
            onClick={() => setStatusFilter('done')}
          />
          <SummaryCard
            icon={<XCircle size={18} />}
            label="Failed"
            value={s.failed_missions || 0}
            color="#ef4444"
            onClick={() => setStatusFilter('failed')}
          />
          <SummaryCard
            icon={<Activity size={18} />}
            label="Agents"
            value={`${s.healthy_agents || 0}/${s.active_agents || 0}`}
            color="#8b5cf6"
            subtitle="healthy"
          />
          <SummaryCard
            icon={<Zap size={18} />}
            label="Tokens"
            value={formatLargeNumber(s.total_tokens_used || 0)}
            color="#06b6d4"
          />
        </div>

        {/* Main grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 320px',
          gap: '24px',
        }}>
          {/* Left column: Missions */}
          <div>
            {/* Section header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
            }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                Missions
                {statusFilter && (
                  <span style={{
                    marginLeft: '8px',
                    fontSize: '12px',
                    color: '#64748b',
                    fontWeight: 400,
                  }}>
                    ({statusFilter})
                    <button
                      onClick={() => setStatusFilter(null)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#3b82f6',
                        cursor: 'pointer',
                        fontSize: '12px',
                        marginLeft: '4px',
                      }}
                    >
                      clear
                    </button>
                  </span>
                )}
              </h2>
            </div>

            {/* Mission cards grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '16px',
              marginBottom: '28px',
            }}>
              <AnimatePresence>
                {missions.map((mission) => (
                  <MissionCard
                    key={mission.id}
                    mission={mission}
                    onClick={(id) => navigate(`/mission-control/${id}`)}
                  />
                ))}
              </AnimatePresence>

              {missions.length === 0 && (
                <div style={{
                  gridColumn: '1 / -1',
                  padding: '60px',
                  textAlign: 'center',
                  color: '#334155',
                }}>
                  <Rocket size={40} style={{ opacity: 0.2, marginBottom: '12px' }} />
                  <p style={{ fontSize: '14px', margin: 0 }}>
                    {statusFilter ? `No ${statusFilter} missions` : 'No missions yet'}
                  </p>
                  <p style={{ fontSize: '12px', margin: '4px 0 0', color: '#1e293b' }}>
                    Create a mission to get started
                  </p>
                </div>
              )}
            </div>

            {/* Agent Health */}
            <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
              Agent Health
            </h2>
            <AgentHealthGrid agents={agents} />
          </div>

          {/* Right sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <TokenMeter
              tokensUsed={s.total_tokens_used || 0}
              costUsd={s.total_cost_usd || 0}
            />
            <GitPanel gitStatus={gitStatus} />
          </div>
        </div>
      </div>

      {/* Create Mission Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateMissionModal
            onClose={() => setShowCreateModal(false)}
            onCreate={async (data) => {
              await createMission.mutateAsync(data);
              setShowCreateModal(false);
            }}
            isLoading={createMission.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function SummaryCard({ icon, label, value, color, subtitle, onClick }) {
  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -2 }}
      onClick={onClick}
      style={{
        background: 'rgba(15,15,25,0.8)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '12px',
        padding: '16px 20px',
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: '60px',
        height: '60px',
        borderRadius: '0 0 0 100%',
        background: `${color}08`,
      }} />
      <div style={{ color, marginBottom: '8px' }}>{icon}</div>
      <div style={{
        fontSize: '24px',
        fontWeight: 700,
        color: '#e2e8f0',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {value}
      </div>
      <div style={{ fontSize: '11px', color: '#64748b' }}>
        {label}
        {subtitle && <span style={{ marginLeft: '4px', color: '#475569' }}>({subtitle})</span>}
      </div>
    </motion.div>
  );
}

function CreateMissionModal({ onClose, onCreate, isLoading }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState(5);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({ name, description, priority });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <motion.form
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        style={{
          background: 'linear-gradient(135deg, rgba(15,15,30,0.98), rgba(25,25,50,0.98))',
          border: '1px solid rgba(139,92,246,0.2)',
          borderRadius: '20px',
          padding: '32px',
          width: '480px',
          maxWidth: '90vw',
        }}
      >
        <h2 style={{ margin: '0 0 24px', fontSize: '20px', fontWeight: 700 }}>
          New Mission
        </h2>

        <label style={{ display: 'block', marginBottom: '16px' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
            Mission Name *
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Build authentication module"
            required
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              padding: '10px 14px',
              color: '#e2e8f0',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </label>

        <label style={{ display: 'block', marginBottom: '16px' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
            Description
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the goal in detail..."
            rows={3}
            style={{
              width: '100%',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              padding: '10px 14px',
              color: '#e2e8f0',
              fontSize: '14px',
              outline: 'none',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
        </label>

        <label style={{ display: 'block', marginBottom: '24px' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '6px' }}>
            Priority: {priority}
          </span>
          <input
            type="range"
            min="1"
            max="10"
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#8b5cf6' }}
          />
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '10px',
            color: '#475569',
          }}>
            <span>Low</span>
            <span>Critical</span>
          </div>
        </label>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              padding: '10px 20px',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            Cancel
          </button>
          <motion.button
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={isLoading || !name.trim()}
            style={{
              background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
              border: 'none',
              borderRadius: '10px',
              padding: '10px 24px',
              color: '#fff',
              cursor: isLoading ? 'wait' : 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              boxShadow: '0 4px 15px rgba(139,92,246,0.3)',
              opacity: isLoading || !name.trim() ? 0.5 : 1,
            }}
          >
            {isLoading ? 'Creating...' : 'Launch Mission'}
          </motion.button>
        </div>
      </motion.form>
    </motion.div>
  );
}

function formatLargeNumber(n) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toString();
}
