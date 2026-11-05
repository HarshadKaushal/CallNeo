# CallNeo

CallNeo is a multi-party video call app. Users sign up, start or join a room by code, then send camera and microphone streams through a mediasoup SFU instead of a full mesh of peer-to-peer connections.

The browser talks to a NestJS API over HTTP for auth and rooms, and over Socket.IO for WebRTC signaling. mediasoup on the server owns one router per room, plus send/recv WebRTC transports, producers, and consumers.

## Features

- Email/password signup and login (passwords hashed with bcrypt)
- Create a room with a short shareable code, or join an existing room
- Live audio and video in the room via mediasoup (Opus + VP8)
- Late joiners consume producers that already exist
- Camera and mic are stopped when you leave the call


Each participant opens two transports: **send** (local mic/camera) and **recv** (everyone else). 

Signaling is request/reply with Socket.IO . Typical join order:

1. `join` — prove you are a participant, get RTP capabilities, current peers and producers
2. Load `mediasoup-client` `Device`
3. `create-transport` (recv) → `connect-transport` → `consume` existing producers → `resume-consumer`
4. `create-transport` (send) → `connect-transport` → `getUserMedia` → `produce` audio and video
5. Listen for `new-producer` and consume those as they appear

## Repository layout

```
CallNeo/
  backend/     NestJS API, Socket.IO gateway, mediasoup service
  frontend/    Vite + React client
  database/    Sequelize models and migrations (@callneo/database)
```

`backend` and `database` are an npm workspace. The frontend is a separate package.

## Tech stack

| Layer | Stack |
| --- | --- |
| Client | React 19, TypeScript, Vite, mediasoup-client, Socket.IO client |
| API | NestJS 12, Socket.IO, class-validator |
| Media | mediasoup 3 worker, WebRtcTransport |
| Data | PostgreSQL, Sequelize 6, sequelize-typescript |
| Auth | bcrypt (no JWT yet; user id is sent on REST and join) |

## Prerequisites

- Node.js (current LTS is fine)
- PostgreSQL running locally


## Setup

### 1. Database

Create a Postgres database, then copy `.env.example` to `.env` at the repo root and set `DATABASE_URL`:

```
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/callneo"
```

The Nest app also reads `backend/.env` if you keep env files next to the server.

### 2. Install and migrate

From the repo root:

```bash
npm install
npm run build:db
npm run migrate
```

Then install frontend deps:

```bash
cd frontend
npm install
```

### 3. Run

Terminal 1 — API on port **5000**:

```bash
cd backend
npm run start:dev
```

Terminal 2 — UI on port **3000**:

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up, start a call, share the room code with another account (use a second browser or an incognito window).

Health check for the worker: `GET http://localhost:5000/mediasoup/health`.

## HTTP API

Base URL: `http://localhost:5000`

| Method | Path | Body | Purpose |
| --- | --- | --- | --- |
| POST | `/auth/signup` | `{ name, email, password }` | Create user |
| POST | `/auth/login` | `{ email, password }` | Log in |
| POST | `/rooms` | `{ hostId, roomCode, name? }` | Create room and add host as participant |
| GET | `/rooms/code/:roomCode` | — | Look up room by code |
| POST | `/rooms/:id/join` | `{ userId }` | Add participant |
| GET | `/mediasoup/health` | — | Worker / router / transport counts |

CORS is limited to `http://localhost:3000`.

## Socket.IO events

**Client → server:**

| Event | Role |
| --- | --- |
| `join` | `{ roomId, userId }` — enter the Socket.IO room, return RTP caps, peers, producers |
| `create-transport` | `{ direction: "send" \| "recv" }` |
| `connect-transport` | `{ transportId, dtlsParameters }` |
| `produce` | `{ transportId, kind, rtpParameters }` |
| `consume` | `{ transportId, producerId, rtpCapabilities }` |
| `resume-consumer` | `{ consumerId }` |
| `leave` | Leave the room (disconnect also leaves) |

**Server → client:**

| Event | Role |
| --- | --- |
| `peer-joined` / `peer-left` | `{ socketId, userId }` |
| `new-producer` | `{ producerId, socketId, userId, kind }` |
| `consumer-closed` | `{ consumerId, producerId }` when the producer goes away |

## Current limits

- Auth is not JWT-protected. The socket `join` handler notes where a token check should go.
- mediasoup `announcedAddress` is hardcoded to localhost, so this is a same-machine / local-network setup until ICE/TURN and a public announce IP are configured.
- Session lives in React state only; refresh logs you out.

## References

Research and implementation notes are listed in [REFERENCES.md](./REFERENCES.md).
