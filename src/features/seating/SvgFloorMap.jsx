import { useRef, useState } from 'react'

const W = 900
const H = 520
const DOT_R = 9      // outer radius — was 16, now 9
const INNER_R = 5    // inner radius — was 9, now 5

const BLOCK_FILL = {
  wall:     '#B0B8C4',
  sitting:  '#E8EDF3',
  entrance: '#3E6E8E',
  room:     '#DDE4EC',
}

export function SvgFloorMap({
  office, seats, blocks, zones,
  isAdmin, editable,
  selectedId, onSelectDesk, onSelectBlock, onSelectZone,
  onDeskDrop, onBlockDrop, onZoneDrop,
  onCanvasClick,
}) {
  const svgRef = useRef(null)
  const [dragging, setDragging] = useState(null)
  const [ghostPos, setGhostPos] = useState(null)
  const [tooltip, setTooltip] = useState(null) // { seat, px, py }

  function svgPoint(e) {
    const svg = svgRef.current
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const p = pt.matrixTransform(svg.getScreenCTM().inverse())
    return {
      cx: Math.min(100, Math.max(0, (p.x / W) * 100)),
      cy: Math.min(100, Math.max(0, (p.y / H) * 100)),
      x:  Math.min(100, Math.max(0, (p.x / W) * 100)),
      y:  Math.min(100, Math.max(0, (p.y / H) * 100)),
      px: p.x,
      py: p.y,
    }
  }

  function handleSvgClick(e) {
    if (dragging) return
    if (e.target === svgRef.current || e.target.dataset.bg) {
      onCanvasClick?.(svgPoint(e))
      setTooltip(null)
    }
  }

  function handleMouseMove(e) {
    if (!dragging) return
    setGhostPos(svgPoint(e))
  }

  function handleMouseUp(e) {
    if (!dragging) return
    const pos = svgPoint(e)
    if (dragging.type === 'desk')  onDeskDrop?.(dragging.id, pos.cx, pos.cy)
    if (dragging.type === 'block') onBlockDrop?.(dragging.id, pos.x, pos.y, dragging.w, dragging.h)
    if (dragging.type === 'zone')  onZoneDrop?.(dragging.id, pos.x, pos.y, dragging.w, dragging.h)
    setDragging(null)
    setGhostPos(null)
  }

  const visibleSeats = seats.filter(s => s.cx != null && s.cy != null)

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', borderRadius: 12, display: 'block', cursor: editable ? 'crosshair' : 'default', background: '#EDF1F5' }}
      onClick={handleSvgClick}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => { setDragging(null); setGhostPos(null) }}
    >
      {/* Outer room */}
      <rect x={10} y={10} width={W-20} height={H-20} rx={8} fill="#F3F6F9" stroke="#B0B8C4" strokeWidth={2} data-bg="1" />

      {/* Structural blocks */}
      {blocks.map(b => {
        const bx = (b.x / 100) * W
        const by = (b.y / 100) * H
        const bw = (b.w / 100) * W
        const bh = (b.h / 100) * H
        const fill = BLOCK_FILL[b.block_type] || '#B0B8C4'
        const isSel = selectedId === b.id
        return (
          <g key={b.id}
            style={{ cursor: editable ? 'grab' : 'default' }}
            onMouseDown={editable ? e => { e.stopPropagation(); setDragging({ type:'block', id:b.id, w:b.w, h:b.h }); onSelectBlock?.(b) } : undefined}
            onClick={e => { e.stopPropagation(); onSelectBlock?.(b) }}
          >
            <rect x={bx} y={by} width={bw} height={bh} rx={b.rx ?? 4}
              fill={fill} stroke={isSel ? '#0070F3' : '#B0B8C4'} strokeWidth={isSel ? 2 : 1} opacity={b.opacity ?? 1} />
            {b.block_type === 'entrance' && (
              <text x={bx+bw/2} y={by+bh/2+4} textAnchor="middle" fontSize={10} fontWeight={700} fill="#fff" fontFamily="Inter,sans-serif">
                {b.label || 'ENTRY'}
              </text>
            )}
            {b.block_type !== 'entrance' && b.label && (
              <text x={bx+bw/2} y={by+bh/2+4} textAnchor="middle" fontSize={9} fill="#6B7A8A" fontFamily="Inter,sans-serif">
                {b.label}
              </text>
            )}
          </g>
        )
      })}

      {/* Zone shading */}
      {zones.map(z => {
        const zx = (z.x / 100) * W
        const zy = (z.y / 100) * H
        const zw = (z.w / 100) * W
        const zh = (z.h / 100) * H
        const isSel = selectedId === z.id
        return (
          <g key={z.id}
            style={{ cursor: editable ? 'grab' : 'default' }}
            onMouseDown={editable ? e => { e.stopPropagation(); setDragging({ type:'zone', id:z.id, w:z.w, h:z.h }); onSelectZone?.(z) } : undefined}
            onClick={e => { e.stopPropagation(); onSelectZone?.(z) }}
          >
            <rect x={zx} y={zy} width={zw} height={zh} rx={6}
              fill={z.color || 'rgba(99,102,241,0.06)'}
              stroke={isSel ? '#0070F3' : 'rgba(99,102,241,0.2)'}
              strokeWidth={isSel ? 2 : 1} strokeDasharray={isSel ? '0' : '4 3'} />
            <text x={zx+8} y={zy+14} fontSize={9} fontWeight={700} letterSpacing={1.4}
              fill="#5B6B7A" fontFamily="Inter,sans-serif">
              {z.label.toUpperCase()}
            </text>
          </g>
        )
      })}

      {/* Desk dots */}
      {visibleSeats.map(seat => {
        const dx = (seat.cx / 100) * W
        const dy = (seat.cy / 100) * H
        const isDragging = dragging?.id === seat.id
        const px = isDragging && ghostPos ? (ghostPos.cx / 100) * W : dx
        const py = isDragging && ghostPos ? (ghostPos.cy / 100) * H : dy
        const isSel = selectedId === seat.id
        const isHovered = tooltip?.seat?.id === seat.id
        const fill   = seat.occupied ? '#FFFFFF' : '#3DD68C'
        const stroke = seat.occupied ? '#B0B8C4' : '#1A9F5A'

        return (
          <g key={seat.id}
            style={{ cursor: editable ? 'grab' : isAdmin ? 'pointer' : 'default' }}
            onMouseDown={editable ? e => { e.stopPropagation(); setDragging({ type:'desk', id:seat.id }); onSelectDesk?.(seat) } : undefined}
            onMouseEnter={() => !editable && setTooltip({ seat, px: dx, py: dy })}
            onMouseLeave={() => setTooltip(t => t?.seat?.id === seat.id ? null : t)}
            onClick={e => { e.stopPropagation(); onSelectDesk?.(seat) }}
          >
            <circle cx={px} cy={py} r={DOT_R}
              fill={fill}
              stroke={isSel ? '#0070F3' : stroke}
              strokeWidth={isSel ? 2.5 : 1.5} />
            <circle cx={px} cy={py} r={INNER_R}
              fill={seat.occupied ? '#CBD3DC' : '#22C773'} />
          </g>
        )
      })}

      {/* Tooltip on hover */}
      {tooltip && (() => {
        const { seat, px, py } = tooltip
        const label = seat.occupied ? seat.name : seat.seat_number
        const sub   = seat.occupied ? (seat.org || '') : 'Vacant'
        const bw = Math.max(label?.length * 6.5, 80)
        const tx = Math.min(W - bw/2 - 10, Math.max(bw/2 + 10, px))
        const ty = py - DOT_R - 28
        return (
          <g pointerEvents="none">
            <rect x={tx - bw/2} y={ty - 18} width={bw} height={sub ? 36 : 22} rx={5}
              fill="rgba(10,10,20,0.82)" />
            <text x={tx} y={ty - 3} textAnchor="middle" fontSize={11} fill="#fff"
              fontFamily="Inter,sans-serif" fontWeight={600}>{label}</text>
            {sub && <text x={tx} y={ty + 13} textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.7)"
              fontFamily="Inter,sans-serif">{sub}</text>}
            {/* caret */}
            <polygon points={`${tx-5},${ty+18} ${tx+5},${ty+18} ${tx},${ty+24}`} fill="rgba(10,10,20,0.82)" />
          </g>
        )
      })()}

      {/* Ghost dot while dragging */}
      {dragging?.type === 'desk' && ghostPos && (
        <circle cx={(ghostPos.cx/100)*W} cy={(ghostPos.cy/100)*H} r={DOT_R}
          fill="#3DD68C" opacity={0.4} stroke="#1A9F5A" strokeWidth={1.5} />
      )}
    </svg>
  )
}
