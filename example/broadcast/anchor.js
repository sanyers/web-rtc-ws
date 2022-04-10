// 主播

const userName = document.getElementById("userName"); // 用户名输入框
const roomName = document.getElementById("roomName"); // 房间号输入框
const startConn = document.getElementById("startConn"); // 连接按钮
const createRoom = document.getElementById("createRoom"); // 创建房间按钮
const hangUp = document.getElementById("hangUp"); // 离开按钮
const streamVideo = document.getElementById("streamVideo"); // 视频组件

const anchorType = document.getElementById("anchorType"); // 直播类型

let anchorTypeValue = "1";
anchorType.onchange = function (e) {
  document.getElementById("titleType").innerHTML = e.target.value;
  if (e.target.value === "视频直播") {
    anchorTypeValue = "1";
  } else {
    anchorTypeValue = "2";
  }
};

roomName.disabled = true;
createRoom.disabled = true;
hangUp.disabled = true;

var pcList = []; // rtc 连接
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
        createRoom.disabled = false;
        hangUp.disabled = false;
        break;
      case "addUser":
        // 添加用户
        addUser(json);
        break;
      case "addUserList":
        // 添加多个用户
        addUserList(json);
        break;
      case "signalAnswer":
        // 收到信令Answer
        signalAnswer(json);
        break;
      case "iceOffer":
        // 收到iceOffer
        addIceCandidates(json);
        break;
      case "close":
        // 收到房间内用户离开
        closeRoomUser(json);
        break;
      default:
        break;
    }
  };
};

// 加入或创建房间
createRoom.onclick = function () {
  // 调取摄像头
  const userConstraints = {
    video: true,
    audio: true,
  };
  // 调取屏幕
  const displayConstraints = {
    audio: true,
    video: {
      mandatory: {
        chromeMediaSource: "desktop",
      },
    },
  };
  const medias =
    anchorTypeValue === "1"
      ? navigator.mediaDevices.getUserMedia(userConstraints)
      : navigator.mediaDevices.getDisplayMedia(userConstraints);

  medias
    .then(function (mediastream) {
      localStream = mediastream; // 本地视频流
      streamVideo.srcObject = localStream;
      const str = JSON.stringify({
        type: "createRoom",
        roomName: roomName.value,
      });
      ws.send(str);
      roomName.disabled = true;
      createRoom.disabled = true;
    })
    .catch(function (e) {
      console.log(e);
    });
};

function addUser(json) {
  createWebRTC(json.userName);
}

function addUserList(json) {
  const { userList } = json;
  if (userList.length) {
    userList.forEach((element) => {
      createWebRTC(element);
    });
  }
}

// 创建WebRTC
function createWebRTC(userName) {
  const pc = new RTCPeerConnection(config); // 创建 RTC 连接
  pcList.push({ userName, pc });
  localStream.getTracks().forEach((track) => pc.addTrack(track, localStream)); // 添加本地视频流 track
  // 创建 Offer 请求
  pc.createOffer(offerOptions).then(function (offer) {
    pc.setLocalDescription(offer); // 设置本地 Offer 描述，（设置描述之后会触发ice事件）
    const str = JSON.stringify({ type: "signalOffer", offer, userName });
    ws.send(str); // 发送 Offer 请求信令
  });
  // 监听 ice
  pc.addEventListener("icecandidate", function (event) {
    const iceCandidate = event.candidate;
    if (iceCandidate) {
      // 发送 iceOffer 请求
      const str = JSON.stringify({ type: "iceOffer", iceCandidate, userName });
      ws.send(str);
    }
  });
}

// 接收 Answer 请求信令
function signalAnswer(json) {
  const { answer, sourceName } = json;
  const item = pcList.find((i) => i.userName === sourceName);
  if (item) {
    const { pc } = item;
    pc.setRemoteDescription(new RTCSessionDescription(answer)); // 设置远端描述
  }
}

// 房间内用户离开
function closeRoomUser(json) {
  const { userName } = json;
  const index = pcList.findIndex((i) => i.userName === userName);
  if (index > -1) {
    pcList.splice(index, 1);
  }
}

// 接收ice并添加
function addIceCandidates(json) {
  const { iceCandidate, sourceName } = json;
  const item = pcList.find((i) => i.userName === sourceName);
  if (item) {
    const { pc } = item;
    pc.addIceCandidate(new RTCIceCandidate(iceCandidate));
  }
}

// 挂断
hangUp.onclick = function () {
  userName.disabled = false;
  startConn.disabled = false;
  roomName.disabled = true;
  createRoom.disabled = true;
  hangUp.disabled = true;
  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
    localStream = null;
  }
  pcList.forEach((element) => {
    element.pc.close();
    element.pc = null;
  });
  pcList.length = 0;
  if (ws) {
    ws.close();
    ws = null;
  }
};
