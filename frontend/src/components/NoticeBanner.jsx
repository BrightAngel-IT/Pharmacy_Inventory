/**
 * Module: NoticeBanner
 * 
 * Reusable React UI component: NoticeBanner.
 */

import React from 'react'
import { CheckCircle2, AlertCircle, AlertTriangle, X } from 'lucide-react'

export function NoticeBanner({ notice, onClose }) {
  if (!notice) return null

  const iconMap = {
    success: <CheckCircle2 size={20} style={{ color: '#34d399', flexShrink: 0 }} />,
    error: <AlertCircle size={20} style={{ color: '#f87171', flexShrink: 0 }} />,
    warning: <AlertTriangle size={20} style={{ color: '#fbbf24', flexShrink: 0 }} />,
    info: <AlertCircle size={20} style={{ color: '#60a5fa', flexShrink: 0 }} />
  }

  return (
    <div className={`notice-banner ${notice.type || 'info'}`} role="alert">
      {iconMap[notice.type] || iconMap.info}
      <span style={{ flex: 1, lineHeight: 1.4 }}>{notice.text}</span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.7)',
            cursor: 'pointer',
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
            borderRadius: '4px'
          }}
          title="Dismiss"
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}
