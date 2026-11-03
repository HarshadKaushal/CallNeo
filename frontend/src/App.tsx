import { useState } from 'react'
import Login from './Login'
import Signup from './Signup'
import Home from './Home'
import './App.css'
import type { Room, User } from './types'
import { api } from './api'
import Call from './Call'

type Screen = 'login' | 'signup' | 'home' | 'call'

function App() {
  const [screen, setScreen] = useState<Screen>('login')
  const [user, setUser] = useState<User | null>(null)
  const [message, setMessage] = useState('')
  const [room, setRoom] = useState<Room | null>(null);

  function handleAuthSuccess(loggedIn: User) {
    setUser(loggedIn)
    setMessage('')
    setScreen('home')
  }

  function logout() {
    setUser(null)
    setRoom(null)
    setMessage('')
    setScreen('login')
  }

  function leaveCall(){
    setRoom(null)
    setScreen('home')
  }

  async function startCall() {
    if(!user){
      return
    }

    let lastError: unknown  
    for (let attempt = 0; attempt<3; attempt++){
      const roomCode = Math.random().toString(36).slice(2,8).toUpperCase()
      try{
        const data = await api<{room: Room}>('/rooms', {hostId:user.id,roomCode})
        setRoom(data.room)  
        setScreen('call')
        return
      } catch (error){
        lastError = error
      }
    }
    throw lastError
  }

  async function joinCall(code: string) {
    if(!user){
      return
    }

    const found = await api<{ room: Room }>(`/rooms/code/${encodeURIComponent(code.trim())}`)
    await api(`/rooms/${found.room.id}/join`, { userId: user.id })

    setRoom(found.room)
    setScreen('call')
  }

  if (screen === 'login') {
    return (
      <Login
        onSuccess={handleAuthSuccess}
        onGoToSignup={() => setScreen('signup')}
      />
    )
  }

  if (screen === 'signup') {
    return (
      <Signup
        onSuccess={handleAuthSuccess}
        onGoToLogin={() => setScreen('login')}
      />
    )
  }

  if (screen === 'call' && room && user) {
    return (
      <Call
      room={room}
      user={user}
      onLeave={leaveCall}
      />
    )
  }

  return (
    <Home
      currentUser={user?.name ?? ' '}
      onStartCall={startCall}
      onJoinCall={joinCall}
      onLogout={logout}
    />
  )
}

export default App