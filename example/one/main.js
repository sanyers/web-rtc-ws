const host = location.host;
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

const userName = document.getElementById('userName');
const roomName = document.getElementById('roomName');

const startConn = document.getElementById('startConn');
const joinRoon = document.getElementById('joinRoon');
const hangUp = document.getElementById('hangUp');

const localStreamId = document.getElementById('localStreamId');
const remoteStreamId = document.getElementById('remoteStreamId');

joinRoon.disabled = true;
hangUp.disabled = true;

var pc;
var localStream;
var ws;

var config = {
    'iceServers': [{
        'urls': 'stun:stun.l.google.com:19302'
    }]
};

const offerOptions = {
    offerToReceiveVideo: 1,
    offerToReceiveAudio: 1
};

// 开始
startConn.onclick = function () {
    ws = new WebSocket('wss://' + host);
    ws.onopen = evt => {
        console.log('connent WebSocket is ok');
        const sendJson = JSON.stringify({
            type: 'conn',
            userName: userName.value,
            roomName: roomName.value
        });
        ws.send(sendJson);
    }
    ws.onmessage = msg => {
        const str = msg.data.toString();
        const json = JSON.parse(str);
        switch (json.type) {
            case 'conn':
                startConn.disabled = true;
                joinRoon.disabled = false;
                hangUp.disabled = false;
                userName.disabled = true;
                roomName.disabled = true;
                localStreamId.innerHTML = json.userName;
                break;
            case 'signalOffer':
                remoteStreamId.innerHTML = json.userName;
                signalOffer(json.offer);
                break;
            case 'signalAnswer':
                remoteStreamId.innerHTML = json.userName;
                signalAnswer(json.answer);
                break;
            case 'iceOffer':
                addIceCandidates(json.iceCandidate);
                break;
            case 'close':
                console.log('close');
            default:
                break;
        }
    }
}

// 加入房间
joinRoon.onclick = function () {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(function (mediastream) {
        localStream = mediastream; // 本地视频流
        localVideo.srcObject = mediastream; // 播放本地视频流
        sendStreamId(mediastream.id);
        createWebRTC();
    }).catch(function (e) {
        console.log(JSON.stringify(e));
    });
}

function sendStreamId (streamId) {
    ws.send(JSON.stringify({
        type: 'streamId',
        streamId
    }))
}

function createWebRTC () {
    pc = new RTCPeerConnection(config); // 创建 RTC 连接
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream)); // 添加本地视频流 track
    // 创建 Offer 请求
    pc.createOffer(offerOptions).then(function (offer) {
        pc.setLocalDescription(offer); // 设置本地 Offer 描述，（设置描述之后会触发ice事件）
        const str = JSON.stringify({
            type: 'signalOffer',
            offer,
            userName: userName.value
        })
        ws.send(str); // 发送 Offer 请求信令
    });
    // 监听 ice
    pc.addEventListener('icecandidate', function (event) {
        var iceCandidate = event.candidate;
        if (iceCandidate) {
            // 发送 iceOffer 请求
            const str = JSON.stringify({
                type: 'iceOffer',
                iceCandidate
            });
            ws.send(str);
        }
    });
}

// 接收 Offer 请求信令
function signalOffer (message) {
    pc.setRemoteDescription(new RTCSessionDescription(message)); // 设置远端描述
    // 创建 Answer 请求
    pc.createAnswer().then(function (answer) {
        pc.setLocalDescription(answer); // 设置本地 Answer 描述
        const str = JSON.stringify({
            type: 'signalAnswer',
            answer,
            userName: userName.value
        });
        ws.send(str); // 发送 Answer 请求信令
    })

    // 监听远端视频流
    pc.addEventListener('addstream', function (event) {
        remoteVideo.srcObject = event.stream; // 播放远端视频流
        console.log(event)
    });
}

// 接收 Answer 请求信令
function signalAnswer (message) {
    pc.setRemoteDescription(new RTCSessionDescription(message)); // 设置远端描述
    console.log('remote answer');

    // 监听远端视频流
    pc.addEventListener('addstream', function (event) {
        remoteVideo.srcObject = event.stream;
        console.log(event)
    });
}

function addIceCandidates (message) {
    if (pc !== 'undefined') {
        pc.addIceCandidate(new RTCIceCandidate(message));
    }
}

// 挂断
hangUp.onclick = function () {
    if (pc) {
        localStream.getTracks().forEach(track => track.stop());
        pc.close();
        pc = null;
    }
    if (ws) {
        ws.close();
        ws = null;
    }
    startConn.disabled = false;
    joinRoon.disabled = true;
    hangUp.disabled = true;

    userName.disabled = false;
    roomName.disabled = false;
}