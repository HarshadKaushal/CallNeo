import { useState } from 'react'
import { errorText } from './api'

type HomeProps = {
  currentUser: string
  onStartCall: () => Promise<void>
  onJoinCall: (code: string) => Promise<void>
  onLogout: () => void
}
export default function Home({
  currentUser,
  onStartCall,
  onJoinCall,
  onLogout,
}: HomeProps) {
  const [roomCode, setRoomCode] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function start() {
    await run(() => onStartCall())
  }

  async function join() {
    if (roomCode.trim() === '') {
      setMessage('Type a room code')
      return
    }
    await run(() => onJoinCall(roomCode))
  }

  async function run(action: () => Promise<void>) {
    setMessage('')
    setBusy(true)
    try {
      await action()
    } catch (error) {
      setMessage(errorText(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="page">
      <h1>CallNeo</h1>
      <p className="hint">Hi {currentUser}. Start a room, or join one with a code.</p>
      <button type="button" onClick={start} disabled={busy}>
        New call
      </button>
      <p className="or">or join a room</p>
      {message && <p className="error">{message}</p>}
      <label>
        Room code
        <input
          value={roomCode}
          onChange={(event) => setRoomCode(event.target.value)}
          placeholder="AB12CD"
        />
      </label>
      <button type="button" onClick={join} disabled={busy}>
        Join
      </button>
      <button type="button" className="link" onClick={onLogout}>
        Log out
      </button>
    </main>
  )
}