# WebRTC-WS

#### 介绍

使用 JavaScript WebRTC 代码实现跨平台音视频通话，实现1对1视频，多人视频，视频直播，屏幕共享，视频会议，房间管理，权限管理等。

#### 使用技术

`NodeJs` `ws` `socket.io` `WebRTC` `WebSocket` `ICE/STUN/TURN`

#### 运行

npm install

所有示例默认使用 https，如需开启 http 请参考 `./server/broadcast.js`

（1）示例 zero 使用 socket.io

`node ./server/zero.js`

（2）示例 one 使用 ws 模块

`node ./server/one.js`

（3）示例 many 实现多人视频

`node ./server/many.js`

![效果图](example/many/1.png "效果图")

（4）示例 broadcast 实现直播视频或屏幕共享

`node ./server/broadcast.js`

启动 http

`node ./server/broadcast.js --http`

#### 跨网络通讯

经过测试，局域网内的 webrtc 无需配置 iceServers

跨网络，比如：跨网段 wifi 和 4g 之间的穿透，需要使用 [turn 服务器](https://sanyers.github.io/blog/web/webrtc/turn%E6%9C%8D%E5%8A%A1%E5%99%A8%E9%83%A8%E7%BD%B2.html)

部署 turn 服务器后可配置 iceServers

```js
var config = {
  iceServers: [
    {
      urls: "turn:xxx.com:3478", // 跨网段需要部署 turn 服务器
      credential: "xxx", // 密码
      username: "xxx", // 用户名
    },
  ],
};
```