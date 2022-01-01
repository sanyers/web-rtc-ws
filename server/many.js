// 多对多视频通话
var express = require('express');//web框架
var bodyParser = require('body-parser');
const fs = require('fs');

var app = express();
app.use("/js", express.static("example/js"));
app.use("/", express.static("example/many"));

let options = {
    key: fs.readFileSync('./ssl/privatekey.pem'), // 证书文件的存放目录
    cert: fs.readFileSync('./ssl/certificate.pem')
}

const server = require('https').Server(options, app);
const WebSocketServer = require('ws').Server;
const wss = new WebSocketServer({ server });

wss.on('connection', ws => {
    ws.on('message', function message (data) {
        const str = data.toString();
        const json = JSON.parse(str);
        switch (json.type) {
            case 'conn':
                ws.userName = json.userName;
                ws.send(JSON.stringify(json));
                break;
            case 'room':
                ws.roomName = json.roomName;
                ws.streamId = json.streamId;
                const roomUserList = getRoomUser(ws);
                if (roomUserList.length) {
                    const jsonStr = {
                        type: 'room',
                        roomUserList
                    }
                    ws.send(JSON.stringify(jsonStr));
                }
                break;
            default:
                sendUser(ws, json);
                break;
        }
    });

    ws.on('close', () => {
        // console.log(ws.userName);
        const str = JSON.stringify({
            type: 'close',
            sourceName: ws.userName,
            streamId: ws.streamId
        });
        sendMessage(ws, str);
    })
});

function sendMessage (ws, str) {
    wss.clients.forEach(item => {
        if (item.userName != ws.userName && item.roomName === ws.roomName && item.readyState === 1) {
            item.send(str);
        }
    })
}

function sendUser (ws, json) {
    if (ws.userName !== json.userName) {
        wss.clients.forEach(item => {
            if (item.userName === json.userName && item.roomName === ws.roomName && item.readyState === 1) {
                const temp = { ...json };
                delete temp.userName;
                temp.sourceName = ws.userName;
                temp.streamId = ws.streamId;
                item.send(JSON.stringify(temp));
            }
        })
    }
}

function getRoomUser (ws) {
    const roomUserList = [];
    wss.clients.forEach(item => {
        if (item.userName != ws.userName && item.roomName === ws.roomName) {
            roomUserList.push(item.userName);
        }
    });
    return roomUserList;
}

const config = {
    port: 8103
};
server.listen(config.port);
console.log('https listening on ' + config.port);