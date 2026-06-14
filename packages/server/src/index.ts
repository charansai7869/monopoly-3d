import { createServer } from 'node:http';
import { Server } from 'socket.io';
import type { Action, ClientToServer, ServerToClient } from '@monopoly/shared';
import { createRoom, getRoom } from './room.js';

const PORT = Number(process.env.PORT ?? 3001);

const http = createServer((_req, res) => {
  res.writeHead(200, { 'content-type': 'text/plain' });
  res.end('Monopoly server up');
});

const io = new Server<ClientToServer, ServerToClient>(http, {
  cors: { origin: '*' },
});

io.on('connection', (socket) => {
  // Which room this socket currently belongs to.
  let roomId: string | null = null;
  let playerId: string | null = null;

  const broadcast = (id: string, events: { type: string }[]) => {
    const room = getRoom(id);
    if (!room) return;
    io.to(id).emit('state', room.state);
    if (events.length) io.to(id).emit('events', events as never);
  };

  socket.on('createRoom', ({ name, playerId: pid, piece }, ack) => {
    const room = createRoom();
    roomId = room.id;
    playerId = pid;
    socket.join(room.id);
    room.sockets.set(socket.id, pid);
    room.dispatch({ type: 'JOIN', playerId: pid, name, piece });
    ack({ roomId: room.id });
    socket.emit('joined', { roomId: room.id, playerId: pid });
    broadcast(room.id, []);
  });

  socket.on('joinRoom', ({ roomId: rid, name, playerId: pid, piece }, ack) => {
    const room = getRoom(rid);
    if (!room) { ack({ error: 'Room not found' }); return; }
    if (room.state.phase !== 'lobby' && !room.state.players.some((p) => p.id === pid)) {
      ack({ error: 'Game already started' }); return;
    }
    roomId = room.id;
    playerId = pid;
    socket.join(room.id);
    room.sockets.set(socket.id, pid);
    const { events } = room.dispatch({ type: 'JOIN', playerId: pid, name, piece });
    ack({ ok: true });
    socket.emit('joined', { roomId: room.id, playerId: pid });
    broadcast(room.id, events);
  });

  socket.on('action', (action: Action) => {
    if (!roomId) return;
    const room = getRoom(roomId);
    if (!room) return;
    const { events } = room.dispatch(action);
    broadcast(roomId, events);
  });

  socket.on('disconnect', () => {
    if (!roomId || !playerId) return;
    const room = getRoom(roomId);
    if (!room) return;
    room.sockets.delete(socket.id);
    // Only mark disconnected if no other socket holds this player (multi-tab).
    const stillHere = [...room.sockets.values()].includes(playerId);
    if (!stillHere) {
      room.setConnected(playerId, false);
      broadcast(roomId, []);
    }
  });
});

http.listen(PORT, () => {
  console.log(`🎲 Monopoly server listening on http://localhost:${PORT}`);
});
