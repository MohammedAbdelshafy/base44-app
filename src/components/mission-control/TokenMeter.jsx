import React from 'react';
import { motion } from 'framer-motion';
import { Zap, DollarSign, AlertTriangle } from 'lucide-react';

/**
 * Token usage gauge with cost estimation and threshold alerts.
 */
export default function TokenMeter({ tokensUsed = 0, costUsd = 0, limit = 100000 }) {
  const percent = Math.min((tokensUsed / limit) * 100, 100);
  const isWarning = percent > 75;
  const isCritical = percent > 90;

  const gaugeColor = isCritical
    ? '#ef4444'
    : isWarning
      ? '#f59e0b'
      : '#3b82f6';

  return (
    <div style={{
      background: 'rgba(15,15,25,0.8)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '12px',
      padding: '20px',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={16} style={{ color: gaugeColor }} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0' }}>
            Token Usage
          </span>
        </div>
        {(isWarning || isCritical) && (
          <motion.div
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              color: gaugeColor,
              fontSize: '11px',
              fontWeight: 600,
            }}
          >
            <AlertTriangle size={12} />
            {isCritical ? 'CRITICAL' : 'WARNING'}
          </motion.div>
        )}
      </div>

      {/* Circular gauge */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '16px',
      }}>
        <div style={{ position: 'relative', width: '120px', height: '120px' }}>
          <svg width="120" height="120" viewBox="0 0 120 120">
            {/* Background circle */}
            <circle
              cx="60" cy="60" r="52"
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth="8"
            />
            {/* Progress arc */}
            <motion.circle
              cx="60" cy="60" r="52"
              fill="none"
              stroke={gaugeColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 52}`}
              initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
              animate={{
                strokeDashoffset: 2 * Math.PI * 52 * (1 - percent / 100),
              }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              transform="rotate(-90 60 60)"
              style={{ filter: `drop-shadow(0 0 6px ${gaugeColor}40)` }}
            />
          </svg>
          {/* Center text */}
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <span style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#e2e8f0',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {percent.toFixed(0)}%
            </span>
            <span style={{ fontSize: '10px', color: '#64748b' }}>
              of limit
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '8px',
          padding: '12px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>
            Tokens Used
          </div>
          <div style={{
            fontSize: '16px',
            fontWeight: 700,
            color: '#e2e8f0',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {formatNumber(tokensUsed)}
          </div>
        </div>
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '8px',
          padding: '12px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>
            Estimated Cost
          </div>
          <div style={{
            fontSize: '16px',
            fontWeight: 700,
            color: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2px',
          }}>
            <DollarSign size={14} />
            {costUsd.toFixed(3)}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatNumber(n) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toString();
}
