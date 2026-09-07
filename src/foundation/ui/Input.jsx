import { forwardRef } from 'react'

const baseInputStyle = {
  width: '100%',
  height: 40,
  padding: '0 12px',
  fontSize: 14,
  background: 'var(--surface)',
  color: 'var(--text-primary)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  outline: 'none',
  transition: 'border-color var(--transition), box-shadow var(--transition)',
}

export const Input = forwardRef(function Input(
  { label, error, hint, style, containerStyle, prefix, suffix, ...props },
  ref
) {
  return (
    <Field label={label} error={error} hint={hint} style={containerStyle}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {prefix && (
          <span style={{
            position: 'absolute', left: 12, color: 'var(--text-tertiary)',
            fontSize: 14, pointerEvents: 'none', display: 'flex',
          }}>{prefix}</span>
        )}
        <input
          ref={ref}
          {...props}
          style={{
            ...baseInputStyle,
            paddingLeft: prefix ? 36 : 12,
            paddingRight: suffix ? 36 : 12,
            borderColor: error ? 'var(--danger)' : 'var(--border)',
            ...style,
          }}
          onFocus={e => {
            e.target.style.borderColor = error ? 'var(--danger)' : 'var(--accent)'
            e.target.style.boxShadow = `0 0 0 3px ${error ? 'rgba(239,68,68,0.12)' : 'rgba(99,102,241,0.12)'}`
          }}
          onBlur={e => {
            e.target.style.borderColor = error ? 'var(--danger)' : 'var(--border)'
            e.target.style.boxShadow = 'none'
          }}
        />
        {suffix && (
          <span style={{
            position: 'absolute', right: 12, color: 'var(--text-tertiary)',
            fontSize: 14, pointerEvents: 'none', display: 'flex',
          }}>{suffix}</span>
        )}
      </div>
    </Field>
  )
})

export const Select = forwardRef(function Select(
  { label, error, hint, style, containerStyle, children, ...props },
  ref
) {
  return (
    <Field label={label} error={error} hint={hint} style={containerStyle}>
      <div style={{ position: 'relative' }}>
        <select
          ref={ref}
          {...props}
          style={{
            ...baseInputStyle,
            paddingRight: 36,
            appearance: 'none',
            cursor: 'pointer',
            borderColor: error ? 'var(--danger)' : 'var(--border)',
            ...style,
          }}
          onFocus={e => {
            e.target.style.borderColor = 'var(--accent)'
            e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'
          }}
          onBlur={e => {
            e.target.style.borderColor = error ? 'var(--danger)' : 'var(--border)'
            e.target.style.boxShadow = 'none'
          }}
        >
          {children}
        </select>
        <svg
          style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-tertiary)' }}
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </Field>
  )
})

export const Textarea = forwardRef(function Textarea(
  { label, error, hint, style, containerStyle, rows = 4, ...props },
  ref
) {
  return (
    <Field label={label} error={error} hint={hint} style={containerStyle}>
      <textarea
        ref={ref}
        rows={rows}
        {...props}
        style={{
          ...baseInputStyle,
          height: 'auto',
          padding: '10px 12px',
          resize: 'vertical',
          borderColor: error ? 'var(--danger)' : 'var(--border)',
          ...style,
        }}
        onFocus={e => {
          e.target.style.borderColor = 'var(--accent)'
          e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'
        }}
        onBlur={e => {
          e.target.style.borderColor = error ? 'var(--danger)' : 'var(--border)'
          e.target.style.boxShadow = 'none'
        }}
      />
    </Field>
  )
})

function Field({ label, error, hint, style, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      {label && (
        <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
          {label}
        </label>
      )}
      {children}
      {error && <span style={{ fontSize: 12, color: 'var(--danger)' }}>{error}</span>}
      {!error && hint && <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{hint}</span>}
    </div>
  )
}
