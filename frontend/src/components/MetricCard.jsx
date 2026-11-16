/**
 * Module: MetricCard
 * 
 * Reusable React UI component: MetricCard.
 */

import React from 'react'

export function MetricCard({ icon: Icon, title, value, helper, accent, actionIcon: ActionIcon, onActionClick, badgeText }) {
  const cardAccent = accent || 'var(--accent)';
  return (
    <article className="metric-card panel animate-fade" style={{ borderTop: `4px solid ${cardAccent}`, position: 'relative' }}>
      <div className="between align-center">
        <div className="metric-icon" style={{ background: `${cardAccent}20`, color: cardAccent }}>
          <Icon size={24} />
        </div>
        <div className="cluster gap-2 align-center">
          {ActionIcon && (
            <button
              type="button"
              className="btn small cluster gap-1 align-center glow-on-hover"
              onClick={(e) => {
                e.stopPropagation();
                if (onActionClick) onActionClick(e);
              }}
              style={{
                background: 'var(--accent)',
                color: '#ffffff',
                padding: '4px 8px',
                borderRadius: '8px',
                fontSize: '0.65rem',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-sm)'
              }}
              title="View full audit & breakdown"
            >
              <ActionIcon size={12} />
              <span>View</span>
            </button>
          )}
          <div className="pill" style={{ background: 'var(--bg-soft)', color: 'var(--text-soft)', fontSize: '0.6rem', border: '1px solid var(--border)' }}>
            {badgeText || 'LIVE'}
          </div>
        </div>
      </div>
      <div className="stack gap-1 mt-4">
        <span className="eyebrow muted uppercase" style={{ fontSize: '0.6rem', letterSpacing: '0.05em' }}>{title}</span>
        <strong className="metric-value" style={{ fontSize: '1.6rem', letterSpacing: '-0.02em' }}>{value}</strong>
        <p className="muted small mt-2 pt-2" style={{ borderTop: '1px dashed var(--border)' }}>{helper}</p>
      </div>
    </article>
  )
}
