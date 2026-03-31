const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let rooms = {};

io.on("connection", (socket) => {

  socket.on("createRoom", ({ roomName, password, name }) => {
    if (!roomName) return socket.emit("errorMsg", "Nama room wajib!");

    if (rooms[roomName]) return socket.emit("errorMsg", "Room sudah ada!");

    rooms[roomName] = {
      password: password || null,
      players: [{ id: socket.id, name, number: null }],
      turn: null,
      timer: null
    };

    socket.join(roomName);
    socket.emit("successJoin", roomName);
  });

  socket.on("joinRoom", ({ roomName, password, name }) => {
    let room = rooms[roomName];

    if (!room) return socket.emit("errorMsg", "Room tidak ditemukan!");
    if (room.players.length >= 2) return socket.emit("errorMsg", "Room penuh!");
    if (room.password && room.password !== password)
      return socket.emit("errorMsg", "Password salah!");

    room.players.push({ id: socket.id, name, number: null });
    socket.join(roomName);

    io.to(roomName).emit("players", room.players);
    socket.emit("successJoin", roomName);
  });

  // 🎲 pilih siapa mulai dulu
  socket.on("setFirstTurn", ({ roomName, playerId }) => {
    let room = rooms[roomName];
    if (!room) return;

    room.turn = playerId;
    io.to(roomName).emit("startGame", room.turn);
    startTimer(roomName);
  });

  socket.on("setNumber", ({ roomName, number }) => {
    let room = rooms[roomName];
    if (!room) return;

    let player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    player.number = Number(number);
  });

  socket.on("guess", ({ roomName, guess }) => {
    let room = rooms[roomName];
    if (!room) return;

    if (room.turn !== socket.id) {
      return socket.emit("errorMsg", "Bukan giliran kamu!");
    }

    let opponent = room.players.find(p => p.id !== socket.id);
    if (!opponent) return;

    let g = Number(guess);
    let t = Number(opponent.number);

    let result = "";

    if (g === t) {
      result = "🎉 BENAR! Kamu menang!";
      io.to(roomName).emit("gameOver", socket.id);
      clearInterval(room.timer);
    } else if (g < t) {
      result = "⬆️ Lebih besar";
    } else {
      result = "⬇️ Lebih kecil";
    }

    socket.emit("result", result);
    io.to(opponent.id).emit("opponentPlayed");

    if (g !== t) {
      room.turn = opponent.id;
      io.to(roomName).emit("turn", room.turn);
      startTimer(roomName);
    }
  });

  // 👀 cheat lihat angka lawan
  socket.on("cheat", (roomName) => {
    let room = rooms[roomName];
    if (!room) return;

    let opponent = room.players.find(p => p.id !== socket.id);
    if (opponent) {
      socket.emit("cheatResult", opponent.number);
    }
  });

  function startTimer(roomName) {
    let room = rooms[roomName];
    if (!room) return;

    let time = 10; // detik

    clearInterval(room.timer);

    room.timer = setInterval(() => {
      io.to(roomName).emit("timer", time);
      time--;

      if (time < 0) {
        clearInterval(room.timer);

        // auto pindah giliran
        let opponent = room.players.find(p => p.id !== room.turn);
        room.turn = opponent.id;

        io.to(roomName).emit("turn", room.turn);
        startTimer(roomName);
      }
    }, 1000);
  }

});

server.listen(3000);