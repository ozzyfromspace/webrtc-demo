import { io } from "https://cdn.socket.io/4.4.1/socket.io.esm.min.js";

const configuration = {
  iceServers: [{
    urls: ["stun:stun1.l.google.com:19302",
      "stun:stun2.l.google.com:19302"]
  }]
}
const pc = new RTCPeerConnection(configuration);

const getRemoteUsername = () => {
  return document.getElementById("remote-username").value ?? "";
};

const localUsername = `user-${Math.floor(Math.random() * 10 ** 6)}`;
const localVideo = document.getElementById("local-video");
const remoteVideo = document.getElementById("remote-video");
const callButton = document.getElementById("call-button");
document.getElementById("local-username").textContent = localUsername;

const socket = io();

async function main() {
  const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  const remoteStream = new MediaStream();

  localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

  pc.ontrack = (trackEvent) => {
    const incomingStream = trackEvent.streams[0]
    console.log("got a stream!", incomingStream);
    if (!incomingStream) return;

    incomingStream.getTracks().forEach(track => remoteStream.addTrack(track));
  }

  localVideo.srcObject = localStream;
  remoteVideo.srcObject = remoteStream;

  callButton.addEventListener("click", (e) => {
    e.stopPropagation();
    e.preventDefault();
    console.log("call button clicked.");
    callRemoteUser();
  })
}

async function callRemoteUser() {
  console.log("local description:", pc.localDescription);
  if (pc.localDescription) return;

  const offer = await pc.createOffer();

  pc.onicecandidate = (ev) => {
    console.log("new ice candidate!");
    socket.emit("ice-candidate", { to: getRemoteUsername(), from: localUsername, candidate: ev.candidate });
  }

  await pc.setLocalDescription(offer);
  console.log("new offer for", getRemoteUsername(), "!", pc.localDescription);
  socket.emit("offer", { to: getRemoteUsername(), from: localUsername, offer: pc.localDescription });
}

async function answerLocalUser(payload) {
  await pc.setRemoteDescription(payload.offer);
  const answer = await pc.createAnswer();

  pc.onicecandidate = (ev) => {
    socket.emit("ice-candidate", { to: payload.from, from: payload.to, candidate: ev.candidate });
  };

  await pc.setLocalDescription(answer);
  socket.emit("answer", { to: payload.from, from: payload.to, answer });
}

socket.on("connect", () => {
  socket.emit("new-user", { username: localUsername, socketId: socket.id });
  socket.on("ice-candidate", payload => {
    console.log("new ice candidate!");
    pc.addIceCandidate(payload.candidate);
  });
  socket.on("offer", payload => {
    answerLocalUser(payload);
  });
  socket.on("answer", payload => {
    console.log("received answer!");
    (async function () { await pc.setRemoteDescription(payload.answer) })();
  });
  socket.on("disconnect", () => {
    socket.removeEventListeners();
  })
})

main();