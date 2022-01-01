'use strict'

var localVideo = document.getElementById('local_video');
var remoteVideo = document.getElementById('remote_video');

var startButton = document.getElementById('startButton');
var hangupButton = document.getElementById('hangupButton');

var pc;
var localStream;
var socket = io.connect();

var config = {
    'iceServers': [{
        'urls': 'stun:stun.l.google.com:19302'
    }]
};

const offerOptions = {
    offerToReceiveVideo: 1,
    offerToReceiveAudio: 1
};

hangupButton.disabled = true;

startButton.addEventListener('click', startAction);
hangupButton.addEventListener('click', hangupAction);

// 打开摄像头
function startAction () {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(function (mediastream) {
        localStream = mediastream; // 本地视频流
        localVideo.srcObject = mediastream; // 播放本地视频流
        startButton.disabled = true;
        socket.emit('conn', 'room'); // 连接 socket
    }).catch(function (e) {
        console.log(JSON.stringify(e));
    });
}

// socket 连接成功
socket.on('conn', function (room, id) {
    hangupButton.disabled = false;
    pc = new RTCPeerConnection(config); // 创建 RTC 连接
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream)); // 添加本地视频流 track
    // 创建 Offer 请求
    pc.createOffer(offerOptions).then(function (offer) {
        pc.setLocalDescription(offer); // 设置本地 Offer 描述，（设置描述之后会触发ice事件）
        socket.emit('signalOffer', offer); // 发送 Offer 请求信令
    });
    // 监听 ice
    pc.addEventListener('icecandidate', function (event) {
        var iceCandidate = event.candidate;
        if (iceCandidate) {
            // 发送 iceOffer 请求
            socket.emit('iceOffer', iceCandidate);
        }
    });
});

// 接收 Offer 请求信令
socket.on('signalOffer', function (message) {
    pc.setRemoteDescription(new RTCSessionDescription(message)); // 设置远端描述
    // 创建 Answer 请求
    pc.createAnswer().then(function (answer) {
        pc.setLocalDescription(answer); // 设置本地 Answer 描述
        socket.emit('signalAnswer', answer); // 发送 Answer 请求信令
    })

    // 监听远端视频流
    pc.addEventListener('addstream', function (event) {
        remoteVideo.srcObject = event.stream; // 播放远端视频流
    });
});

// 接收 Answer 请求信令
socket.on('signalAnswer', function (message) {
    pc.setRemoteDescription(new RTCSessionDescription(message)); // 设置远端描述
    console.log('remote answer');

    // 监听远端视频流
    pc.addEventListener('addstream', function (event) {
        remoteVideo.srcObject = event.stream;
    });
});

// 接收 iceOffer
socket.on('iceOffer', function (message) {
    addIceCandidates(message)
});

// 接收 iceAnswer
// socket.on('iceAnswer', function (message) {
//     addIceCandidates(message)
// });

function addIceCandidates (message) {
    if (pc !== 'undefined') {
        pc.addIceCandidate(new RTCIceCandidate(message));
    }
}

// 挂断
function hangupAction () {
    localStream.getTracks().forEach(track => track.stop());
    pc.close();
    pc = null;
    hangupButton.disabled = true;
    startButton.disabled = false;
}