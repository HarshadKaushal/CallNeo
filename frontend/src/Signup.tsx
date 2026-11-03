import { useState } from 'react'
import { api, errorText } from './api'
import type { User } from './types'

type SignupProps = {
  onSuccess: (user: User) => void
  onGoToLogin: () => void
}

export default function Signup({ onSuccess, onGoToLogin }: SignupProps) {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [email, setEmail] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')

  async function submit() {
    if(password.length < 8) {
      setMessage('Password must be of atleast 8 characters')
      return
    }
    
    if (password !== confirmPassword) {
      setMessage('Passwords do not match')
      return
    }

    try {
      const data = await api<{user: User }>('/auth/signup',{name,email,password})
      onSuccess(data.user)
    } catch (error){
      setMessage(errorText(error))
    }
  }

  return (
    <main className="page">
      <h1>CallNeo</h1>
      <p className="hint">Create an account</p>

      <label>
        name
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="alex"
        />
      </label>

      <label>
        Email
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="alex@gmail.com"
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

      <label>
        Confirm password
        <input
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
        />
      </label>

      {message && <p className="error">{message}</p>}

      <button type="button" onClick={submit}>
        Sign up
      </button>
      <button type="button" className="link" onClick={onGoToLogin}>
        Have an account? Log in
      </button>
    </main>
  )
}