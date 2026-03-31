const socket = io();

let room = "";

// 🔊 sound
function play(id) {
  const s = document.getElementById(id);
  if (s) {
    s.currentTime = 0;
    s.play();
  }
}

// 📳 getar HP (opsional)
function vibrate(ms = 100) {
  if (navigator.vibrate) navigator.vibrate(ms);
}

// 🎮 pindah ke game
function goGame(r) {
  document.getElementById("menu").classList.add("hidden");
  document.getElementById("game").classList.remove("hidden");
  document.getElementById("roomTitle").innerText = "Room: " + r;
}

// 🔑 create
function createRoom() {
  const name = document.getElementById("name").value;
  const roomName = document.getElementById("createRoom").value;

  if (!name || !roomName) {
    alert("Nama & Room wajib diisi!");
    return;
  }

  socket.emit("createRoom", {
    name,
    roomName,
    password: document.getElementById("createPass").value
  });
}

// 🔑 join
function joinRoom() {
  const name = document.getElementById("name").value;
  const roomName = document.getElementById("joinRoom").value;

  if (!name || !roomName) {
    alert("Nama & Room wajib diisi!");
    return;
  }

  socket.emit("joinRoom", {
    name,
    roomName,
    password: document.getElementById("joinPass").value
  });
}

socket.on("successJoin", (r) => {
  room = r;
  goGame(r);
});

socket.on("errorMsg", (msg) => {
  vibrate(200);
  alert(msg);
});

// 🎯 set angka
function setNumber() {
  const num = document.getElementById("number").value;

  if (!num) {
    alert("Masukkan angka dulu!");
    return;
  }

  socket.emit("setNumber", {
    roomName: room,
    number: num
  });

  play("click");
}

// 🎲 pilih giliran pertama
function setFirstTurn() {
  socket.emit("setFirstTurn", {
    roomName: room,
    playerId: socket.id
  });

  play("click");
}

// 🎯 tebak
function guess() {
  const val = document.getElementById("guess").value;

  if (!val) {
    alert("Isi tebakan dulu!");
    return;
  }

  play("click");

  socket.emit("guess", {
    roomName: room,
    guess: val
  });
}

// 🔄 giliran
function updateTurn(t) {
  const myTurn = t === socket.id;

  document.getElementById("turn").innerText =
    myTurn ? "🔥 Giliran Kamu" : "⏳ Tunggu Lawan...";

  document.getElementById("guessBtn").disabled = !myTurn;

  if (myTurn) {
    play("turnSound");
    vibrate(100);
  }
}

socket.on("startGame", updateTurn);
socket.on("turn", updateTurn);

// ⏱️ timer
socket.on("timer", (t) => {
  document.getElementById("timer").innerText = "⏱️ " + t;

  if (t <= 3) vibrate(50); // 🔥 detik kritis
});

// 📢 hasil
socket.on("result", (msg) => {
  document.getElementById("result").innerText = msg;

  if (msg.includes("BENAR")) {
    play("win");
    vibrate(300);
  } else {
    play("click");
  }
});

// 🏆 selesai
socket.on("gameOver", (winner) => {
  if (winner !== socket.id) {
    document.getElementById("result").innerText = "😢 Kamu kalah!";
    play("lose");
    vibrate(400);
  }

  document.getElementById("guessBtn").disabled = true;
});

// 🔔 lawan main
socket.on("opponentPlayed", () => {
  play("turnSound");
});

// 😈 CHEAT STEALTH MODE (TIDAK KETAHUAN)
function cheat() {
  socket.emit("cheat", room);
}

// 👀 hasil cheat (TANPA POPUP)
socket.on("cheatResult", (num) => {
  document.getElementById("guess").value = num;
});

// 🕵️ GESTURE RAHASIA (HP: tap 5x)
let tap = 0;

document.body.addEventListener("click", () => {
  tap++;

  if (tap >= 5) {
    cheat();
    tap = 0;
  }

  setTimeout(() => {
    tap = 0;
  }, 2000);
});

// 💻 shortcut keyboard (C)
document.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "c") {
    cheat();
  }
});