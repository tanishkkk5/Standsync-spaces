import * as XLSX from 'xlsx'

const SHEET_COLUMNS = ['Seat Number', 'Name', 'Email', 'Phone', 'Organisation', 'Collab']

export function downloadSheet(officeName, seats) {
  const rows = seats.map(s => ({
    'Seat Number': s.seat_number,
    Name: s.name || '',
    Email: s.email || '',
    Phone: s.phone || '',
    Organisation: s.org || '',
    Collab: s.collab || '',
  }))
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: SHEET_COLUMNS })
  worksheet['!cols'] = [{ wch: 12 }, { wch: 22 }, { wch: 28 }, { wch: 14 }, { wch: 20 }, { wch: 14 }]
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Seating')
  const safeName = officeName.replace(/[^\w]+/g, '_')
  XLSX.writeFile(workbook, `${safeName}_seating.xlsx`)
}

export function parseSheetFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const workbook = XLSX.read(e.target.result, { type: 'array' })
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        resolve(XLSX.utils.sheet_to_json(worksheet, { defval: '' }))
      } catch (err) {
        reject(new Error("Couldn't read that file — make sure it's the downloaded seating sheet."))
      }
    }
    reader.onerror = () => reject(new Error("Couldn't read that file."))
    reader.readAsArrayBuffer(file)
  })
}
