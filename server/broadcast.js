// 视频直播
var express = require("express"); //web框架
var bodyParser = require("body-parser");
const fs = require("fs");

var app = express();
app.use("/js", express.static("example/js"));
app.use("/", express.static("example/broadcast"));

let options = {
  key: fs.readFileSync("./ssl/privatekey.pem"), // 证书文件的存放目录
  cert: fs.readFileSync("./ssl/certificate.pem"),
};

let agreement = "https";
const argv = process.argv[2]; // 设置argv可开启http,默认https
if (argv === "--http") {
  agreement = "http";
}
const server = require(agreement).Server(options, app);
const WebSocketServer = require("ws").Server;
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  ws.on("message", function message(data) {
    const str = data.toString();
    const json = JSON.parse(str);
    switch (json.type) {
      case "conn":
        ws.userName = json.userName;
        ws.send(JSON.stringify(json));
        break;
      case "createRoom":
        ws.roomName = json.roomName;
        ws.anchor = true;
        sendAnchors(ws, "addUserList");
        break;
      case "joinRoom":
        ws.roomName = json.roomName;
        sendAnchor(ws, "addUser");
        break;
      case "leaveRoom":
        sendMessage(ws, str);
        ws.roomName = null;
        break;
      default:
        sendUser(ws, json);
        break;
    }
  });

  ws.on("close", () => {
    if (ws.anchor) {
      const str = JSON.stringify({
        type: "close",
        userName: ws.userName,
      });
      sendMessage(ws, str);
    } else {
      sendAnchor(ws, "close");
    }
  });
});

// 给所有用户发送数据
function sendMessage(ws, str) {
  wss.clients.forEach((item) => {
    if (
      item.userName != ws.userName &&
      item.roomName === ws.roomName &&
      item.readyState === 1
    ) {
      item.send(str);
    }
  });
}

// 给指定用户发送数据
function sendUser(ws, json) {
  if (ws.userName !== json.userName) {
    wss.clients.forEach((item) => {
      if (
        item.userName === json.userName &&
        item.roomName === ws.roomName &&
        item.readyState === 1
      ) {
        const temp = { ...json };
        delete temp.userName;
        temp.sourceName = ws.userName;
        item.send(JSON.stringify(temp));
      }
    });
  }
}

// 给指定主播发送数据
function sendAnchor(ws, type) {
  wss.clients.forEach((item) => {
    if (
      item.userName != ws.userName &&
      item.roomName === ws.roomName &&
      item.anchor
    ) {
      const str = JSON.stringify({
        type,
        userName: ws.userName,
      });
      item.send(str);
    }
  });
}

// 给指定主播发送房间用户列表数据
function sendAnchors(ws, type) {
  const userList = [];
  wss.clients.forEach((item) => {
    if (item.roomName === ws.roomName && !item.anchor) {
      userList.push(item.userName);
    }
  });
  if (userList.length) {
    const str = JSON.stringify({
      type,
      userList,
    });
    ws.send(str);
  }
}

const config = {
  port: 8104,
};
server.listen(config.port);
console.log(agreement + " listening on " + config.port);
