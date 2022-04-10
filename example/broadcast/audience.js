// 观众

const userName = document.getElementById("userName"); // 用户名输入框
const roomName = document.getElementById("roomName"); // 房间号输入框
const startConn = document.getElementById("startConn"); // 连接按钮
const joinRoom = document.getElementById("joinRoom"); // 加入房间按钮
const hangUp = document.getElementById("hangUp"); // 离开按钮
const streamVideo = document.getElementById("streamVideo"); // 视频组件

roomName.disabled = true;
joinRoom.disabled = true;
hangUp.disabled = true;

var pc; // rtc 连接
var localStream; // 本地视频流
var ws; // WebSocket 连接

// ice stun 服务器地址
var config = {
    iceServers: [
      {
        urls: [
          "stun:stun.l.google.com:19302",
          "stun:stun1.l.google.com:19302",
          "stun:stun2.l.google.com:19302",
          "stun:stun.l.google.com:19302?transport=udp",
        ],
      },
      {
        urls: "turn:xxx.com:3478", // 跨网段需要部署 turn 服务器
        credential: "xxx",
        username: "xxx",
      },
    ],
  };

// offer 配置
const offerOptions = {
  offerToReceiveVideo: 1,
  offerToReceiveAudio: 1,
};

const agreement = location.protocol === "http:" ? "ws://" : "wss://";

// 开始
startConn.onclick = function () {
  ws = new WebSocket(agreement + location.host);
  ws.onopen = (evt) => {
    console.log("connent WebSocket is ok");
    const sendJson = JSON.stringify({
      type: "conn",
      userName: userName.value,
    });
    ws.send(sendJson); // 注册用户名
  };
  ws.onmessage = (msg) => {
    const str = msg.data.toString();
    const json = JSON.parse(str);
    switch (json.type) {
      case "conn":
        console.log("连接成功");
        userName.disabled = true;
        startConn.disabled = true;
        roomName.disabled = false;
        joinRoom.disabled = false;
        hangUp.disabled = false;
        break;
      case "signalOffer":
        // 收到信令Offer
        signalOffer(json);
        break;
      case "iceOffer":
        // 收到iceOffer
        addIceCandidates(json);
        break;
      case "close":
        // 收到主播离开
        closeRoomUser();
        break;
      default:
        break;
    }
  };
};

// 加入或创建房间
joinRoom.onclick = function () {
  const str = JSON.stringify({
    type: "joinRoom",
    roomName: roomName.value,
  });
  ws.send(str);
  roomName.disabled = true;
  joinRoom.disabled = true;
};

// 接收 Offer 请求信令
function signalOffer(json) {
  const { offer, sourceName } = json;
  pc = new RTCPeerConnection(config);
  pc.setRemoteDescription(new RTCSessionDescription(offer)); // 设置远端描述
  // 创建 Answer 请求
  pc.createAnswer().then(function (answer) {
    pc.setLocalDescription(answer); // 设置本地 Answer 描述
    const str = JSON.stringify({
      type: "signalAnswer",
      answer,
      userName: sourceName,
    });
    ws.send(str); // 发送 Answer 请求信令
  });

  // 监听 ice
  pc.addEventListener("icecandidate", function (event) {
    const iceCandidate = event.candidate;
    if (iceCandidate) {
      // 发送 iceOffer 请求
      const str = JSON.stringify({
        type: "iceOffer",
        iceCandidate,
        userName: sourceName,
      });
      ws.send(str);
    }
  });

  // 监听远端视频流
  pc.addEventListener("addstream", function (event) {
    streamVideo.srcObject = event.stream; // 播放远端视频流
  });
}

// 接收ice并添加
function addIceCandidates(json) {
  if (pc) {
    const { iceCandidate } = json;
    pc.addIceCandidate(new RTCIceCandidate(iceCandidate));
  }
}

function closeRoomUser() {
  streamVideo.pause();
}

// 挂断
hangUp.onclick = function () {
  userName.disabled = false;
  startConn.disabled = false;
  roomName.disabled = true;
  joinRoom.disabled = true;
  hangUp.disabled = true;
  if (pc) {
    pc.close();
    pc = null;
  }
  if (ws) {
    ws.close();
    ws = null;
  }
};
