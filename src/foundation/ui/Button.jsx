import { forwardRef } from 'react'

const VARIANTS = {
  primary: {
    background: 'var(--accent)',
    color: 'var(--text-on-accent)',
    border: 'none',
    hover: 'var(--accent-hover)',
  },
  secondary: {
    background: 'var(--surface-2)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border)',
    hover: 'var(--border)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-secondary)',
    border: 'none',
    hover: 'var(--surface-2)',
  },
  danger: {
    background: 'var(--danger)',
    color: '#fff',
    border: 'none',
    hover: '#DC2626',
  },
  outline: {
    background: 'transparent',
    color: 'var(--accent)',
    border: '1px solid var(--accent)',
    hover: 'var(--accent-dim)',
  },
}

const SIZES = {
  sm: { padding: '6px 12px', fontSize: 13, height: 32 },
  md: { padding: '8px 16px', fontSize: 14, height: 38 },
  lg: { padding: '10px 20px', fontSize: 15, height: 44 },
}

export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', children, style, loading, iconOnly, ...props },
  ref
) {
  const v = VARIANTS[variant] || VARIANTS.primary
  const s = SIZES[size] || SIZES.md

  return (
    <button
      ref={ref}
      disabled={loading || props.disabled}
      {...props}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        height: iconOnly ? s.height : s.height,
        width: iconOnly ? s.height : undefined,
        padding: iconOnly ? 0 : s.padding,
        fontSize: s.fontSize,
        fontFamily: 'var(--font-body)',
        fontWeight: 500,
        borderRadius: 'var(--radius-sm)',
        background: v.background,
        color: v.color,
        border: v.border || 'none',
        cursor: loading || props.disabled ? 'not-allowed' : 'pointer',
        opacity: props.disabled ? 0.5 : 1,
        transition: 'all var(--transition)',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        ...style,
      }}
      onMouseEnter={e => {
        if (!props.disabled && !loading) {
          e.currentTarget.style.background = v.hover
        }
      }}
      onMouseLeave={e => {
        if (!props.disabled && !loading) {
          e.currentTarget.style.background = v.background
        }
      }}
    >
      {loading ? <Spinner size={s.fontSize} /> : children}
    </button>
  )
})

function Spinner({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={{ animation: 'spin 0.7s linear infinite' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}
