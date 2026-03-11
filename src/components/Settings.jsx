import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

export default function Settings({ open, onClose, profile, onSave, onSignOut }) {
  const [gender, setGender] = useState(profile?.gender || 'male')
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [saving, setSaving] = useState(false)

  // Sync when profile changes
  useEffect(() => {
    if (profile) {
      setGender(profile.gender || 'male')
      setDisplayName(profile.display_name || '')
    }
  }, [profile])

  async function handleSave() {
    if (saving) return
    setSaving(true)
    try {
      await onSave({ gender, display_name: displayName.trim() || 'Alex' })
      onClose()
    } catch (err) {
      console.error('Settings save error:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleSignOut() {
    try {
      await onSignOut()
    } catch (err) {
      console.error('Sign out error:', err)
    }
  }

  return (
    <div className={`overlay${open ? ' open' : ''}`}>
      <div className="overlay-backdrop" onClick={onClose} />
      <div className="overlay-sheet">
        <div className="sheet-handle" />
        <div className="sheet-title">Settings</div>

        {/* Display name */}
        <div className="sheet-label">Display Name</div>
        <input
          className="sheet-input"
          type="text"
          value={displayName}
          onChange={e => setDisplayName(e.target.value)}
          placeholder="Your character name"
          maxLength={32}
        />

        {/* Gender picker */}
        <div className="sheet-label">Character</div>
        <div className="gender-options">
          <button
            className={`gender-opt${gender === 'male' ? ' selected' : ''}`}
            onClick={() => setGender('male')}
            type="button"
          >
            <span className="gender-opt-emoji">🧑</span>
            <span className="gender-opt-label">Male</span>
          </button>
          <button
            className={`gender-opt${gender === 'female' ? ' selected' : ''}`}
            onClick={() => setGender('female')}
            type="button"
          >
            <span className="gender-opt-emoji">👩</span>
            <span className="gender-opt-label">Female</span>
          </button>
        </div>

        {/* Save */}
        <button className="sheet-save-btn" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>

        {/* Sign out */}
        <button className="sheet-signout-btn" onClick={handleSignOut}>
          Sign Out
        </button>
      </div>
    </div>
  )
}
