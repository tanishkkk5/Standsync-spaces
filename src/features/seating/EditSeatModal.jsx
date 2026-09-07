import { useState } from 'react'
import { Modal } from '../../foundation/ui/Modal'
import { Input, Select } from '../../foundation/ui/Input'
import { Button } from '../../foundation/ui/Button'

const COLLABS = ['Chi', 'Alpha', 'Beta', 'Delta', 'QA Reviewer', 'Team']

export function EditSeatModal({ seat, orgs, onSave, onClose }) {
  const [occupied, setOccupied] = useState(seat.occupied)
  const [name, setName] = useState(seat.name || '')
  const [email, setEmail] = useState(seat.email || '')
  const [phone, setPhone] = useState(seat.phone || '')
  const [org, setOrg] = useState(seat.org || orgs[0])
  const [collab, setCollab] = useState(seat.collab || COLLABS[0])
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    await onSave({
      ...seat,
      occupied,
      name: occupied ? name : '',
      email: occupied ? email : '',
      phone: occupied ? phone : '',
      org: occupied ? org : '',
      collab: occupied ? collab : '',
    })
    setSaving(false)
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={seat.seat_number}
      width={380}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={saving}>
            Save
          </Button>
        </>
      }
    >
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 16 }}>
        <input type="checkbox" checked={occupied} onChange={e => setOccupied(e.target.checked)} />
        Occupied
      </label>

      {occupied && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Name" value={name} onChange={e => setName(e.target.value)} />
          <Input label="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <Input label="Phone" value={phone} onChange={e => setPhone(e.target.value)} />
          <Select label="Organisation" value={org} onChange={e => setOrg(e.target.value)}>
            {orgs.map(o => (
              <option key={o}>{o}</option>
            ))}
          </Select>
          <Select label="Collab" value={collab} onChange={e => setCollab(e.target.value)}>
            {COLLABS.map(c => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </div>
      )}
    </Modal>
  )
}

export { COLLABS }
