import React from 'react';
import { motion } from 'framer-motion';
import { GitBranch, GitPullRequest, GitCommit, Rocket, Clock } from 'lucide-react';

/**
 * Git status panel showing commits, PRs, and deployment status.
 */
export default function GitPanel({ gitStatus }) {
  const status = gitStatus || {
    pending_commits: 0,
    open_prs: [],
    last_commit: null,
    deployment_status: 'idle',
  };

  const deployColor = {
    idle:      '#64748b',
    deploying: '#f59e0b',
    deployed:  '#10b981',
    failed:    '#ef4444',
  }[status.deployment_status] || '#64748b';

  return (
    <div style={{
      background: 'rgba(15,15,25,0.8)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '12px',
      padding: '20px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '16px',
      }}>
        <GitBranch size={16} style={{ color: '#8b5cf6' }} />
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>
          Git & Deploy
        </span>
      </div>

      {/* Stats grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '10px',
        marginBottom: '16px',
      }}>
        <StatBox
          icon={<GitCommit size={14} />}
          label="Pending"
          value={status.pending_commits}
          color="#f59e0b"
        />
        <StatBox
          icon={<GitPullRequest size={14} />}
          label="Open PRs"
          value={status.open_prs?.length || 0}
          color="#8b5cf6"
        />
      </div>

      {/* Deployment status */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        borderRadius: '8px',
        padding: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '12px',
      }}>
        <div style={{ position: 'relative' }}>
          {status.deployment_status === 'deploying' && (
            <motion.div
              style={{
                position: 'absolute',
                inset: '-3px',
                borderRadius: '50%',
                background: deployColor,
                opacity: 0.3,
              }}
              animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
          <Rocket size={14} style={{ color: deployColor, position: 'relative' }} />
        </div>
        <div>
          <div style={{
            fontSize: '12px',
            fontWeight: 600,
            color: deployColor,
            textTransform: 'capitalize',
          }}>
            {status.deployment_status}
          </div>
          <div style={{ fontSize: '10px', color: '#475569' }}>
            Deploy status
          </div>
        </div>
      </div>

      {/* Last commit */}
      {status.last_commit && (
        <div style={{
          fontSize: '11px',
          color: '#475569',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <Clock size={10} />
          Last: {status.last_commit.message?.slice(0, 40)}
          {status.last_commit.message?.length > 40 ? '…' : ''}
        </div>
      )}

      {/* Open PRs list */}
      {status.open_prs?.length > 0 && (
        <div style={{ marginTop: '12px' }}>
          <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px' }}>
            Open Pull Requests
          </div>
          {status.open_prs.slice(0, 3).map((pr, idx) => (
            <div key={idx} style={{
              fontSize: '11px',
              color: '#94a3b8',
              padding: '4px 0',
              borderBottom: '1px solid rgba(255,255,255,0.03)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <GitPullRequest size={10} style={{ color: '#8b5cf6' }} />
              {pr.title || `PR #${pr.number}`}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatBox({ icon, label, value, color }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      borderRadius: '8px',
      padding: '10px 12px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    }}>
      <div style={{ color }}>{icon}</div>
      <div>
        <div style={{
          fontSize: '18px',
          fontWeight: 700,
          color: '#e2e8f0',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {value}
        </div>
        <div style={{ fontSize: '10px', color: '#64748b' }}>{label}</div>
      </div>
    </div>
  );
}
