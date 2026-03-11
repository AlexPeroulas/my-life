import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

export default function Auth() {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'login') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (signInError) throw signInError
      } else {
        // Signup
        if (!displayName.trim()) {
          throw new Error('Please enter your display name.')
        }
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        })
        if (signUpError) throw signUpError

        if (data?.user) {
          // Insert profile row
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              display_name: displayName.trim(),
              gender: 'male',
            })
          if (profileError && profileError.code !== '23505') {
            // Ignore duplicate key errors (profile may already exist)
            console.error('Profile insert error:', profileError)
          }
        }
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-title">🎮 My Life</div>
        <div className="auth-subtitle">Track every dimension of your life.</div>

        {/* TEMPORARY DEBUG — remove after fixing */}
        <div style={{fontSize:'10px',color:'#aaa',wordBreak:'break-all',marginBottom:'8px',padding:'6px',background:'#f5f5f5',borderRadius:'6px'}}>
          DB: {supabaseUrl || '⚠️ NOT SET'}
        </div>

        {error && (
          <div className="auth-error">{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <>
              <label className="auth-field-label" htmlFor="displayName">
                Display Name
              </label>
              <input
                id="displayName"
                className="auth-input"
                type="text"
                placeholder="Your character name"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                required
                autoComplete="name"
              />
            </>
          )}

          <label className="auth-field-label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            className="auth-input"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <label className="auth-field-label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            className="auth-input"
            type="password"
            placeholder={mode === 'signup' ? 'Min. 6 characters' : 'Your password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={mode === 'signup' ? 6 : undefined}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          />

          <button className="auth-btn" type="submit" disabled={loading}>
            {loading
              ? (mode === 'login' ? 'Signing in…' : 'Creating account…')
              : (mode === 'login' ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div className="auth-toggle">
          {mode === 'login' ? (
            <>
              No account?{' '}
              <span
                className="auth-toggle-link"
                onClick={() => { setMode('signup'); setError('') }}
              >
                Sign up free
              </span>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <span
                className="auth-toggle-link"
                onClick={() => { setMode('login'); setError('') }}
              >
                Sign in
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
