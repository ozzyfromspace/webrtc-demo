import express from 'express';
import http from 'http';
import path from 'path';
import { Server } from 'socket.io';
import events from './events';
import TestDB, { User } from './TestDB';

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = 3000;

const db = new TestDB();

const publicPath = path.join(__dirname, '../public');
console.log(publicPath);
app.use(express.json());
app.use(express.static(publicPath));

server.listen(port, () => console.log(`🚀 ${port}!`));

app.get('/', (_, res) => {
  const homePath = path.join(__dirname, '../pages', 'index.html');
  res.sendFile(homePath);
});

app.get('/users', (_, res) => {
  res.json({ data: db.getAllUsers() });
});

io.on('connection', (socket) => {
  console.log(socket.id, 'has connected');

  socket.on('new-user', (payload) => {
    const { socketId, username } = payload;

    if (typeof socketId !== 'string' || typeof username !== 'string') {
      return;
    }

    const user: User = { username, socketId };
    db.addUser(user);
  });

  socket.on('disconnect', () => {
    console.log(socket.id, 'has disconnected');
    db.removeUserBySocketId(socket.id);
  });

  events.forEach((signalEvent) => {
    socket.on(signalEvent, (payload) => {
      const { to } = payload;
      if (typeof to !== 'string') return;
      const toSocketId = db.getSocketId(to);
      if (!toSocketId) return;
      socket.broadcast.to(toSocketId).emit(signalEvent, payload);
      console.log(
        `successfully routed ${signalEvent} from ${payload.from} to ${payload.to}`
      );
    });
  });
});
