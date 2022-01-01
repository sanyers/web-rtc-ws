// 1对1视频通话
var express = require('express');//web框架
var bodyParser = require('body-parser');
const fs = require('fs');

var app = express();
app.use("/js", express.static("example/js"));
app.use("/", express.static("example/one"));

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
                ws.roomName = json.roomName;
                const connStr = JSON.stringify({
                    type: 'conn',
                    userName: json.userName
                });
                ws.send(connStr);
                break;
            case 'streamId':
                ws.streamId = json.streamId;
                break;
            default:
                sendMessage(ws, str);
                break;
        }
    });

    ws.on('close', () => {
        // console.log(ws.userName);
        const str = JSON.stringify({
            type: 'close',
            userName: ws.userName
        })
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

const config = {
    port: 8102
};
server.listen(config.port);
console.log('https listening on ' + config.port);