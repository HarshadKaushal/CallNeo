# References

Sources used while designing and building CallNeo.

## WebRTC and SFU concepts

- [mediasoup documentation — overview](https://mediasoup.org/documentation/overview/) — tech stack research
- [Creating a video call app using WebRTC](https://medium.com/@gbenleseun2016/creating-a-video-call-app-using-webrtc-ab75052f71ac)
- [WebRTC](https://webrtc.org/)
- [Understanding WebRTC and mediasoup — building scalable video streaming applications](https://medium.com/@sanathshetty444/understanding-webrtc-and-mediasoup-building-scalable-video-streaming-applications-dc2b9282ce47) — WebRTC and mediasoup SFU
- [NAT traversal: how it works](https://medium.com/@jamesbordane57/nat-traversal-how-it-works-90cfe7a2ec97)
- [What is a TURN server?](https://medium.com/@jamesbordane57/what-is-a-turn-server-7e19631031db)
- [Peer-to-peer video conferencing](https://getstream.io/blog/peer-to-peer-video-conferencing/)

## mediasoup

- [versatica/mediasoup](https://github.com/versatica/mediasoup)
- [mediasoup v3 Node source](https://github.com/versatica/mediasoup/tree/v3/node/src)
- [Client–server communication (v3)](https://mediasoup.org/documentation/v3/communication-between-client-and-server/)
- [How to set the transport for new mediasoup users](https://mediasoup.discourse.group/t/how-to-set-the-transport-for-new-mediasoup-users/3250)
- [WebRtcTransport (Rust docs, same object model)](https://docs.rs/mediasoup/latest/mediasoup/webrtc_transport/struct.WebRtcTransport.html)
- [mediasoup essentials — creating robust WebRTC applications](https://medium.com/@kimaswaemma36/mediasoup-essentials-creating-robust-webrtc-applications-a6c2ca4aafd1) — starter setup
- [medansoftware/mediasoup-nest](https://github.com/medansoftware/mediasoup-nest)
- [Dirvann/mediasoup-sfu-webrtc-video-rooms — Room.js](https://github.com/Dirvann/mediasoup-sfu-webrtc-video-rooms/blob/master/src/Room.js)
- [jamalag/mediasoup — example1/app.js](https://github.com/jamalag/mediasoup/blob/main/example1/app.js)

## Related sample apps

- [IK-Akmal/webrtc](https://github.com/IK-Akmal/webrtc)

## Browser media

- [streamverse (npm) — `srcObject` on `HTMLMediaElement`](https://www.npmjs.com/package/streamverse) — `srcObject` is the media source for a video/audio element, or `null` if none is assigned

## NestJS, Postgres, Sequelize

- [How to connect Sequelize to Postgres in NestJS](https://stackoverflow.com/questions/67977439/how-to-connect-sequelize-to-postgres-in-nestjs)
- [NestJS, Sequelize, and Postgres — mastering migrations](https://medium.com/@kupendra.dev/nestjs-sequelize-and-postgres-mastering-migrations-898e0723c938)
- [Sequelize v6 migrations](https://sequelize.org/docs/v6/other-topics/migrations/)
- [Sequelize database migrations](https://jazimabbas.medium.com/sequelize-database-migrations-7da5fac20541)

## Auth

- [karanparmar1/user-auth-app — auth.controller.ts](https://github.com/karanparmar1/user-auth-app/blob/main/server/src/auth/auth.controller.ts) — login pattern
- [bcrypt](https://www.npmjs.com/package/bcrypt)
- [bezkoder/spring-boot-security-postgresql](https://github.com/bezkoder/spring-boot-security-postgresql)

## Refining
- [getTrackById()](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream/getTrackById) -get track by id instead of index