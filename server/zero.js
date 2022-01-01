var express = require('express');//web框架
var bodyParser = require('body-parser');
const fs = require('fs');

var app = express();
app.use("/js", express.static("example/js"));
app.use("/", express.static("example/zero"));

let options = {
    key: fs.readFileSync('./ssl/privatekey.pem'), // 证书文件的存放目录
    cert: fs.readFileSync('./ssl/certificate.pem')
}

const https = require('https').Server(options, app);
const io = require('socket.io')(https);

io.on('connection', (socket) => {
    // 发送音视频信令
    socket.on('signal', function (message) {
        console.log('发送信令');
        socket.to('room').emit('signal', message);
    });

    socket.on('signalOffer', function (message) {
        socket.to('room').emit('signalOffer', message);
    });

    socket.on('signalAnswer', function (message) {
        socket.to('room').emit('signalAnswer', message);
    });

    // 发送ice
    socket.on('ice', function (message) {
        socket.to('room').emit('ice', message);
    });

    socket.on('iceOffer', function (message) {
        socket.to('room').emit('iceOffer', message);
    });

    // socket.on('iceAnswer', function (message) {
    //     socket.to('room').emit('iceAnswer', message);
    // });

    // 发送test
    socket.on('test', function (message) {
        socket.to('room').emit('test', message);
    });

    socket.on('conn', function (userName) {
        socket.join('room');
        socket.emit('conn', userName); // socket.id
        console.log('新用户：' + userName);
    });
});

const config = {
    port: 8101
};
https.listen(config.port);
console.log('https listening on ' + config.port);