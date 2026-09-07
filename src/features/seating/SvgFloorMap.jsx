import { useRef, useState } from 'react'

const W = 900
const H = 520
const CHAIR_R = 7

// Table geometry + chair offsets (SVG px from cluster center)
const CLUSTER_DEFS = {
  '2h':    { tableW: 54,  tableH: 24, tableRx: 4, chairs: [[-14,-20],[14,-20]] },
  '2v':    { tableW: 24,  tableH: 54, tableRx: 4, chairs: [[-20,-14],[-20,14]] },
  '4':     { tableW: 72,  tableH: 28, tableRx: 4, chairs: [[-18,-21],[18,-21],[-18,21],[18,21]] },
  '6':     { tableW: 106, tableH: 28, tableRx: 4, chairs: [[-36,-21],[0,-21],[36,-21],[-36,21],[0,21],[36,21]] },
  '8':     { tableW: 140, tableH: 28, tableRx: 4, chairs: [[-52,-21],[-18,-21],[18,-21],[52,-21],[-52,21],[-18,21],[18,21],[52,21]] },
  'round2':{ tableR: 15, chairs: [[0,-27],[0,27]] },
  'round4':{ tableR: 18, chairs: [[0,-31],[31,0],[0,31],[-31,0]] },
}

// Small backrest rect on the outer side of each chair
function backrest(ox, oy, fill, stroke) {
  const vert = Math.abs(oy) >= Math.abs(ox)
  const s = vert ? Math.sign(oy) : Math.sign(ox)
  const d = CHAIR_R + 1.5
  if (vert) {
    return <rect key="b" x={ox - 6} y={oy + s * d - 2} width={12} height={4} rx={2}
      fill={fill} stroke={stroke} strokeWidth={1} />
  }
  return <rect key="b" x={ox + s * d - 2} y={oy - 6} width={4} height={12} rx={2}
    fill={fill} stroke={stroke} strokeWidth={1} />
}

export function SvgFloorMap({
  seats, blocks, zones, clusters,
  isAdmin, editable,
  selectedId,
  onSelectDesk, onSelectBlock, onSelectZone, onSelectCluster,
  onClusterDrop, onBlockDrop, onZoneDrop,
  onCanvasClick,
}) {
  const svgRef = useRef(null)
  const [dragging, setDragging] = useState(null)
  const [ghostPos, setGhostPos] = useState(null)
  const [tooltip, setTooltip] = useState(null) // { seat, ax, ay }

  function toSvgPt(e) {
    const svg = svgRef.current
    const pt = svg.createSVGPoint()
    pt.x = e.clientX; pt.y = e.clientY
    const p = pt.matrixTransform(svg.getScreenCTM().inverse())
    return {
      cx: Math.min(100, Math.max(0, (p.x / W) * 100)),
      cy: Math.min(100, Math.max(0, (p.y / H) * 100)),
      px: p.x, py: p.y,
    }
  }

  function handleMouseMove(e) {
    if (!dragging) return
    setGhostPos(toSvgPt(e))
  }

  function handleMouseUp(e) {
    if (!dragging) return
    const pos = toSvgPt(e)
    if (dragging.type === 'cluster') onClusterDrop?.(dragging.id, pos.cx, pos.cy)
    else if (dragging.type === 'block') onBlockDrop?.(dragging.id, pos.cx, pos.cy)
    else if (dragging.type === 'zone') onZoneDrop?.(dragging.id, pos.cx, pos.cy)
    setDragging(null); setGhostPos(null)
  }

  function handleSvgClick(e) {
    if (dragging) return
    if (e.target === svgRef.current || e.target.dataset.bg) {
      onCanvasClick?.(toSvgPt(e))
    }
  }

  // Build seat lookup: clusterId → { pos → seat }
  const byClusters = {}
  const loneSeats = []
  seats.forEach(s => {
    if (s.cluster_id && s.cluster_pos != null) {
      if (!byClusters[s.cluster_id]) byClusters[s.cluster_id] = {}
      byClusters[s.cluster_id][s.cluster_pos] = s
    } else if (s.cx != null && s.cy != null) {
      loneSeats.push(s)
    }
  })

  const BLOCK_FILL = {
    wall: '#B8C4CE', sitting: '#DDE8EF', entrance: '#3E6E8E', room: '#DDE4EC',
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', display: 'block', borderRadius: 12, background: '#EDF1F5',
        cursor: editable ? 'crosshair' : 'default', userSelect: 'none' }}
      onClick={handleSvgClick}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => { setDragging(null); setGhostPos(null); setTooltip(null) }}
    >
      {/* Room */}
      <rect x={10} y={10} width={W-20} height={H-20} rx={10}
        fill="#F3F6F9" stroke="#C0CDD8" strokeWidth={2} data-bg="1" />

      {/* Blocks */}
      {(blocks || []).map(b => {
        const bx = (b.x/100)*W, by = (b.y/100)*H, bw = (b.w/100)*W, bh = (b.h/100)*H
        const fill = BLOCK_FILL[b.block_type] || '#B8C4CE'
        const isSel = selectedId === b.id
        return (
          <g key={b.id}
            style={{ cursor: editable ? 'grab' : 'default' }}
            onMouseDown={editable ? e => { e.stopPropagation(); setDragging({ type:'block', id:b.id }); onSelectBlock?.(b) } : undefined}
            onClick={e => { e.stopPropagation(); onSelectBlock?.(b) }}
          >
            <rect x={bx} y={by} width={bw} height={bh} rx={4}
              fill={fill}
              stroke={isSel ? '#0070F3' : b.block_type === 'entrance' ? '#2B5F80' : '#B8C4CE'}
              strokeWidth={isSel ? 2 : 1} />
            {b.label && (
              <text x={bx+bw/2} y={by+bh/2+4} textAnchor="middle"
                fontSize={b.block_type==='entrance' ? 9 : 8}
                fontWeight={b.block_type==='entrance' ? 700 : 400}
                letterSpacing={b.block_type==='entrance' ? 1 : 0}
                fill={b.block_type==='entrance' ? '#fff' : '#6B7A8A'}
                fontFamily="Inter,sans-serif">
                {b.block_type==='entrance' ? (b.label||'ENTRY').toUpperCase() : b.label}
              </text>
            )}
          </g>
        )
      })}

      {/* Zones */}
      {(zones || []).map(z => {
        const zx=(z.x/100)*W, zy=(z.y/100)*H, zw=(z.w/100)*W, zh=(z.h/100)*H
        const isSel = selectedId === z.id
        return (
          <g key={z.id}
            style={{ cursor: editable ? 'grab' : 'default' }}
            onMouseDown={editable ? e => { e.stopPropagation(); setDragging({ type:'zone', id:z.id }); onSelectZone?.(z) } : undefined}
            onClick={e => { e.stopPropagation(); onSelectZone?.(z) }}
          >
            <rect x={zx} y={zy} width={zw} height={zh} rx={6}
              fill={z.color || 'rgba(99,102,241,0.06)'}
              stroke={isSel ? '#0070F3' : 'rgba(99,102,241,0.25)'}
              strokeWidth={isSel ? 2 : 1} strokeDasharray={isSel ? '0' : '5 3'} />
            <text x={zx+10} y={zy+14} fontSize={9} fontWeight={700} letterSpacing={1.5}
              fill="#5B6B7A" fontFamily="Inter,sans-serif">
              {z.label.toUpperCase()}
            </text>
          </g>
        )
      })}

      {/* Clusters: table + chairs */}
      {(clusters || []).map(cluster => {
        const def = CLUSTER_DEFS[cluster.cluster_type] || CLUSTER_DEFS['4']
        const clusterSeats = byClusters[cluster.id] || {}
        const isDrag = dragging?.id === cluster.id
        const ccx = isDrag && ghostPos ? (ghostPos.cx/100)*W : (cluster.cx/100)*W
        const ccy = isDrag && ghostPos ? (ghostPos.cy/100)*H : (cluster.cy/100)*H
        const isSel = selectedId === cluster.id

        return (
          <g key={cluster.id} transform={`translate(${ccx},${ccy})`}>
            {/* Table */}
            <g
              style={{ cursor: editable ? 'grab' : 'default' }}
              onMouseDown={editable ? e => { e.stopPropagation(); setDragging({ type:'cluster', id:cluster.id }); onSelectCluster?.(cluster) } : undefined}
              onClick={e => { e.stopPropagation(); onSelectCluster?.(cluster) }}
            >
              {def.tableR ? (
                <circle r={def.tableR}
                  fill="#E2E8F0" stroke={isSel ? '#0070F3' : '#B4C2CC'} strokeWidth={isSel ? 2 : 1.5} />
              ) : (
                <rect x={-def.tableW/2} y={-def.tableH/2} width={def.tableW} height={def.tableH}
                  rx={def.tableRx ?? 4}
                  fill="#E2E8F0" stroke={isSel ? '#0070F3' : '#B4C2CC'} strokeWidth={isSel ? 2 : 1.5} />
              )}
            </g>

            {/* Chairs */}
            {def.chairs.map(([ox, oy], i) => {
              const seat = clusterSeats[i]
              const fill  = !seat ? '#F0F4F8' : seat.occupied ? '#FFFFFF' : '#3DD68C'
              const strk  = !seat ? '#D0D8E4' : seat.occupied ? '#B8C6D4' : '#1DB370'
              const isHot = tooltip?.seat?.id === seat?.id
              const isSeatSel = selectedId === seat?.id

              return (
                <g key={i}
                  style={{ cursor: seat ? 'pointer' : 'default' }}
                  onMouseEnter={() => {
                    if (!seat) return
                    setTooltip({ seat, ax: ccx + ox, ay: ccy + oy })
                  }}
                  onMouseLeave={() => setTooltip(t => t?.seat?.id === seat?.id ? null : t)}
                  onClick={e => { e.stopPropagation(); if (seat) onSelectDesk?.(seat) }}
                >
                  {backrest(ox, oy, fill, strk)}
                  <circle cx={ox} cy={oy} r={CHAIR_R}
                    fill={fill}
                    stroke={isSeatSel || isHot ? '#0070F3' : strk}
                    strokeWidth={isSeatSel || isHot ? 2 : 1.5} />
                </g>
              )
            })}
          </g>
        )
      })}

      {/* Lone seats (no cluster) */}
      {loneSeats.map(seat => {
        const sx=(seat.cx/100)*W, sy=(seat.cy/100)*H
        const fill  = seat.occupied ? '#FFFFFF' : '#3DD68C'
        const strk  = seat.occupied ? '#B8C6D4' : '#1DB370'
        const isHot = tooltip?.seat?.id === seat.id
        return (
          <g key={seat.id} style={{ cursor: 'pointer' }}
            onMouseEnter={() => setTooltip({ seat, ax:sx, ay:sy })}
            onMouseLeave={() => setTooltip(t => t?.seat?.id === seat.id ? null : t)}
            onClick={e => { e.stopPropagation(); onSelectDesk?.(seat) }}
          >
            <circle cx={sx} cy={sy} r={CHAIR_R} fill={fill}
              stroke={isHot ? '#0070F3' : strk} strokeWidth={isHot ? 2 : 1.5} />
          </g>
        )
      })}

      {/* Hover tooltip — rendered last so it's always on top */}
      {tooltip && (() => {
        const { seat, ax, ay } = tooltip
        const name  = seat.occupied ? (seat.name || '—')  : seat.seat_number
        const line2 = seat.occupied ? (seat.org   || '')  : 'Vacant'
        const line3 = seat.occupied ? (seat.collab || '') : ''
        const maxLen = Math.max(name.length, line2.length, line3.length)
        const bw = Math.max(maxLen * 6.4, 80)
        const bh = 16 + (line2 ? 14 : 0) + (line3 ? 14 : 0) + 8
        const tx = Math.min(W - bw/2 - 14, Math.max(bw/2 + 14, ax))
        const ty = ay - CHAIR_R - bh - 6
        const ttop = ty > 14 ? ty : ay + CHAIR_R + 6

        return (
          <g pointerEvents="none">
            <rect x={tx-bw/2} y={ttop} width={bw} height={bh} rx={5}
              fill="rgba(15,20,30,0.88)" />
            <text x={tx} y={ttop+13} textAnchor="middle" fontSize={11}
              fill="#fff" fontFamily="Inter,sans-serif" fontWeight={600}>{name}</text>
            {line2 && <text x={tx} y={ttop+26} textAnchor="middle" fontSize={9}
              fill="rgba(255,255,255,0.75)" fontFamily="Inter,sans-serif">{line2}</text>}
            {line3 && <text x={tx} y={ttop+38} textAnchor="middle" fontSize={9}
              fill="rgba(255,255,255,0.60)" fontFamily="Inter,sans-serif">{line3}</text>}
            {/* Caret */}
            {ty > 14 ? (
              <polygon points={`${tx-5},${ttop+bh} ${tx+5},${ttop+bh} ${tx},${ttop+bh+6}`}
                fill="rgba(15,20,30,0.88)" />
            ) : (
              <polygon points={`${tx-5},${ttop} ${tx+5},${ttop} ${tx},${ttop-6}`}
                fill="rgba(15,20,30,0.88)" />
            )}
          </g>
        )
      })()}
    </svg>
  )
}
