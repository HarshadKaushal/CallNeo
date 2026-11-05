import { useState } from 'react'
import { api, errorText } from './api'
import type { User } from './types'

type LoginProps = {
  onSuccess: (user: User) => void
  onGoToSignup: () => void
}

export default function Login({ onSuccess, onGoToSignup }: LoginProps) {
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  async function submit() {
    try {
      const data = await api<{ user: User }>('/auth/login', { email, password })
      onSuccess(data.user)
    } catch (error) {
      setMessage(errorText(error))
    }
  }

  return (
    <main className="page">
      <h1>CallNeo</h1>
      <p className="hint">Log in</p>

      <label>
        Email
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="example@gmail.com"
        />
      </label>

      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>

      {message && <p className="error">{message}</p>}

      <button type="button" onClick={submit}>
        Log in
      </button>
      <button type="button" className="link" onClick={onGoToSignup}>
        Need an account? Sign up
      </button>
    </main>
  )
}