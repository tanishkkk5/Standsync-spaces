import { supabase } from '../../foundation/lib/supabase'

export async function fetchOffices() {
  const { data, error } = await supabase
    .from('spaces_offices')
    .select('*')
    .order('sort_order')
  if (error) throw error
  return data
}

export async function fetchSeats(officeId) {
  const { data, error } = await supabase
    .from('spaces_seats')
    .select('*')
    .eq('office_id', officeId)
    .order('section')
    .order('pod_index')
    .order('row_index')
    .order('col_index')
  if (error) throw error
  return data
}

export async function fetchAllSeatsGroupedByOffice() {
  const offices = await fetchOffices()
  const result = {}
  for (const office of offices) {
    result[office.name] = await fetchSeats(office.id)
  }
  return result
}

export async function saveSeat(seat) {
  const payload = seat.occupied
    ? {
        occupied: true,
        name: seat.name || null,
        email: seat.email || null,
        phone: seat.phone || null,
        org: seat.org || null,
        collab: seat.collab || null,
        updated_at: new Date().toISOString(),
      }
    : {
        occupied: false,
        name: null,
        email: null,
        phone: null,
        org: null,
        collab: null,
        updated_at: new Date().toISOString(),
      }
  const { error } = await supabase.from('spaces_seats').update(payload).eq('id', seat.id)
  if (error) throw error
}

// Applies parsed sheet rows (keyed by "Seat Number") to an office's seats.
// A row with a Name fills the seat; a row with a blank Name clears it.
// Rows for seat numbers not found in this office are ignored.
export async function applySheetRows(officeId, rows) {
  const seats = await fetchSeats(officeId)
  const bySeatNumber = new Map(seats.map(s => [s.seat_number, s]))
  let updated = 0

  for (const row of rows) {
    const seatNumber = String(row['Seat Number'] || '').trim()
    const seat = bySeatNumber.get(seatNumber)
    if (!seat) continue

    const name = String(row['Name'] || '').trim()
    const payload = name
      ? {
          occupied: true,
          name,
          email: String(row['Email'] || '').trim() || null,
          phone: String(row['Phone'] || '').trim() || null,
          org: String(row['Organisation'] || '').trim() || null,
          collab: String(row['Collab'] || '').trim() || null,
          updated_at: new Date().toISOString(),
        }
      : {
          occupied: false,
          name: null,
          email: null,
          phone: null,
          org: null,
          collab: null,
          updated_at: new Date().toISOString(),
        }

    const { error } = await supabase.from('spaces_seats').update(payload).eq('id', seat.id)
    if (error) throw error
    updated += 1
  }

  return updated
}

// ── Layout editor ──────────────────────────────────────────────────────

export async function fetchLayoutBlocks(officeId) {
  const { data, error } = await supabase
    .from('spaces_layout_blocks')
    .select('*')
    .eq('office_id', officeId)
  if (error) throw error
  return data
}

export async function createLayoutBlock(block) {
  const { data, error } = await supabase.from('spaces_layout_blocks').insert(block).select().single()
  if (error) throw error
  return data
}

export async function deleteLayoutBlock(id) {
  const { error } = await supabase.from('spaces_layout_blocks').delete().eq('id', id)
  if (error) throw error
}

export async function createSeat(officeId, x, y, seatNumber) {
  const { data, error } = await supabase
    .from('spaces_seats')
    .insert({ office_id: officeId, seat_number: seatNumber, x, y, col_index: 0, occupied: false })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteSeat(id) {
  const { error } = await supabase.from('spaces_seats').delete().eq('id', id)
  if (error) throw error
}

export async function updateOfficeGrid(officeId, gridCols, gridRows) {
  const { error } = await supabase
    .from('spaces_offices')
    .update({ grid_cols: gridCols, grid_rows: gridRows })
    .eq('id', officeId)
  if (error) throw error
}

export async function updateLayoutBlock(id, updates) {
  const { error } = await supabase.from('spaces_layout_blocks').update(updates).eq('id', id)
  if (error) throw error
}

export async function moveSeat(id, x, y) {
  const { error } = await supabase.from('spaces_seats').update({ x, y }).eq('id', id)
  if (error) throw error
}

// ── Photo floor plan ─────────────────────────────────────────────────────

export async function uploadFloorPlanImage(officeId, file) {
  const ext = file.name.split('.').pop()
  const path = `${officeId}/${Date.now()}.${ext}`
  const { error: uploadError } = await supabase.storage.from('floorplans').upload(path, file, { upsert: true })
  if (uploadError) throw uploadError
  const { data } = supabase.storage.from('floorplans').getPublicUrl(path)
  const { error } = await supabase.from('spaces_offices').update({ floor_plan_url: data.publicUrl }).eq('id', officeId)
  if (error) throw error
  return data.publicUrl
}

export async function createPinSeat(officeId, pinX, pinY, seatNumber) {
  const { data, error } = await supabase
    .from('spaces_seats')
    .insert({ office_id: officeId, seat_number: seatNumber, pin_x: pinX, pin_y: pinY, occupied: false })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateSeatPin(id, pinX, pinY) {
  const { error } = await supabase.from('spaces_seats').update({ pin_x: pinX, pin_y: pinY }).eq('id', id)
  if (error) throw error
}

// ── Zones ────────────────────────────────────────────────────────────────
export async function fetchZones(officeId) {
  const { data, error } = await supabase.from('spaces_zones').select('*').eq('office_id', officeId)
  if (error) throw error
  return data
}
export async function createZone(zone) {
  const { data, error } = await supabase.from('spaces_zones').insert(zone).select().single()
  if (error) throw error
  return data
}
export async function updateZone(id, updates) {
  const { error } = await supabase.from('spaces_zones').update(updates).eq('id', id)
  if (error) throw error
}
export async function deleteZone(id) {
  const { error } = await supabase.from('spaces_zones').delete().eq('id', id)
  if (error) throw error
}

// ── Desks (canvas-based cx/cy) ────────────────────────────────────────────
export async function createDesk(officeId, cx, cy, seatNumber, zoneId) {
  const { data, error } = await supabase
    .from('spaces_seats')
    .insert({ office_id: officeId, cx, cy, seat_number: seatNumber, zone_id: zoneId || null, occupied: false })
    .select().single()
  if (error) throw error
  return data
}
export async function updateDeskPos(id, cx, cy) {
  const { error } = await supabase.from('spaces_seats').update({ cx, cy }).eq('id', id)
  if (error) throw error
}
