import { useState, useEffect } from 'react'
import { DEFAULT_DISPLAY_NAME, DEFAULT_GENDER } from '../lib/constants.js'
import { pushSupported, getPushSubscription, enablePush, disablePush } from '../lib/push.js'

const CHARACTER_OPTIONS = [
  { key: 'neutral', emoji: '🧑', label: 'Neutral' },
  { key: 'male',    emoji: '👨', label: 'Male'    },
  { key: 'female',  emoji: '👩', label: 'Female'  },
]

export default function Settings({ open, onClose, profile, userId, onSave, onSignOut }) {
  const [gender, setGender] = useState(profile?.gender || DEFAULT_GENDER)
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [saving, setSaving] = useState(false)
  const [pushOn, setPushOn] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)
  const [pushError, setPushError] = useState('')

  // Reflect current push subscription state when the sheet opens
  useEffect(() => {
    if (!open || !pushSupported()) return
    getPushSubscription().then(sub => setPushOn(!!sub)).catch(() => setPushOn(false))
  }, [open])

  // Sync when profile changes
  useEffect(() => {
    if (profile) {
      setGender(profile.gender || DEFAULT_GENDER)
      setDisplayName(profile.display_name || '')
    }
  }, [profile])

  async function handleSave() {
    if (saving) return
    setSaving(true)
    try {
      await onSave({ gender, display_name: displayName.trim() || DEFAULT_DISPLAY_NAME })
      onClose()
    } catch (err) {
      console.error('Settings save error:', err)
    } finally {
      setSaving(false)
    }
  }

  async function handleTogglePush() {
    if (pushBusy) return
    setPushBusy(true)
    setPushError('')
    try {
      if (pushOn) await disablePush()
      else await enablePush(userId)
      setPushOn(!pushOn)
    } catch (err) {
      console.error('Push toggle error:', err)
      setPushError(err.message || 'Could not update reminders')
    } finally {
      setPushBusy(false)
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
          {CHARACTER_OPTIONS.map(opt => (
            <button
              key={opt.key}
              className={`gender-opt${gender === opt.key ? ' selected' : ''}`}
              onClick={() => setGender(opt.key)}
              type="button"
            >
              <span className="gender-opt-emoji">{opt.emoji}</span>
              <span className="gender-opt-label">{opt.label}</span>
            </button>
          ))}
        </div>

        {/* Push reminders */}
        {pushSupported() && (
          <>
            <div className="sheet-label">Reminders</div>
            <div className="gender-options">
              <button
                className={`gender-opt${pushOn ? ' selected' : ''}`}
                onClick={handleTogglePush}
                disabled={pushBusy}
                type="button"
              >
                <span className="gender-opt-emoji">{pushOn ? '🔔' : '🔕'}</span>
                <span className="gender-opt-label">
                  {pushBusy ? 'Updating…' : pushOn ? 'Daily reminders on' : 'Daily reminders off'}
                </span>
              </button>
            </div>
            {pushError && <div style={{ color: '#FF3737', fontSize: 12, marginTop: 6 }}>{pushError}</div>}
          </>
        )}

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
