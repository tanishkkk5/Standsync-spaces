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
