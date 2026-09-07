// Shared cluster geometry — used by SvgFloorMap, MapEditorPage, and api.js
// No React imports so it's safe to import from anywhere.

export const CHAIR_R = 7
const SPACING = 26  // px between chair centers

export function getClusterDef(clusterType) {
  if (!clusterType) return getClusterDef('4')

  // Round tables
  if (clusterType === 'round2') return { tableR: 15, chairs: [[0, -27], [0, 27]] }
  if (clusterType === 'round4') return { tableR: 18, chairs: [[0, -31], [31, 0], [0, 31], [-31, 0]] }

  // 1s-N: single-sided, N seats on top
  const oneM = clusterType.match(/^1s-(\d+)$/)
  if (oneM) {
    const n = parseInt(oneM[1])
    const tableW = Math.max(40, SPACING * (n - 1) + 26)
    const chairs = Array.from({ length: n }, (_, i) => [(i - (n - 1) / 2) * SPACING, -19])
    return { tableW, tableH: 22, tableRx: 4, chairs }
  }

  // 2s-N: two-sided, N seats per side facing each other
  const twoM = clusterType.match(/^2s-(\d+)$/)
  if (twoM) {
    const n = parseInt(twoM[1])
    const tableW = Math.max(40, SPACING * (n - 1) + 26)
    const top    = Array.from({ length: n }, (_, i) => [(i - (n - 1) / 2) * SPACING, -20])
    const bottom = Array.from({ length: n }, (_, i) => [(i - (n - 1) / 2) * SPACING,  20])
    return { tableW, tableH: 26, tableRx: 4, chairs: [...top, ...bottom] }
  }

  // Legacy fixed types (kept for backwards compat)
  const FIXED = {
    '2h': { tableW: 54,  tableH: 24, tableRx: 4, chairs: [[-14, -20], [14, -20]] },
    '2v': { tableW: 24,  tableH: 54, tableRx: 4, chairs: [[-20, -14], [-20, 14]] },
    '4':  { tableW: 72,  tableH: 28, tableRx: 4, chairs: [[-18, -21], [18, -21], [-18, 21], [18, 21]] },
    '6':  { tableW: 106, tableH: 28, tableRx: 4, chairs: [[-36, -21], [0, -21], [36, -21], [-36, 21], [0, 21], [36, 21]] },
    '8':  { tableW: 140, tableH: 28, tableRx: 4, chairs: [[-52, -21], [-18, -21], [18, -21], [52, -21], [-52, 21], [-18, 21], [18, 21], [52, 21]] },
  }
  return FIXED[clusterType] || FIXED['4']
}

export function clusterSeatCount(clusterType) {
  return getClusterDef(clusterType).chairs.length
}

export function clusterLabel(clusterType) {
  if (!clusterType) return 'Table'
  if (clusterType === 'round2') return 'Round 2-seat'
  if (clusterType === 'round4') return 'Round 4-seat'
  const o = clusterType.match(/^1s-(\d+)$/)
  if (o) return `${o[1]}-seat (single-sided)`
  const t = clusterType.match(/^2s-(\d+)$/)
  if (t) return `${t[1]}+${t[1]}-seat (double-sided)`
  const FIXED = { '2h':'2-seat', '2v':'2-seat vertical', '4':'4-seat', '6':'6-seat', '8':'8-seat' }
  return FIXED[clusterType] || clusterType
}
