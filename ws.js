var WebSocket = require('ws');
var wss = new WebSocket.Server({server: server});
const SPLITTER = '-|-';
WebSocket.prototype.send = function(channel, data) {
  this.send(channel + SPLITTER + JSON.stringify(data));
};

const SOCKETS = {};
WebSocket.Server.prototype.to = function(socketId) {
  return SOCKETS[socketId];
}
var channels = {
  'enter lobby'() {

  }
};
// var io = require('socket.io')(server);
var sockets = require('./sockets')(wss);
var channelNames = Object.keys(channels);
wss.on('connection', function(socket) {
  if(!socket.id) {
    socket.id = uniqueId();
    SOCKETS[socket.id] = socket;
  }
  console.log('a user connected', socket.id);
  socket.on('message', (d) => {
    var all = d.split(SPLITTER);
    var channel = all[0];
    if(!~channelNames.indexOf(channel)) {
      return;
    }

    var data = JSON.parse(all[1]);


    if(channel == 'auth') {
      if(data.playerId) {
        return socket.send('player token', createToken(data.playerId));
      }
      return socket.send('auth error', "No player id available");
    }
    var player;
    getPlayer(socket, data)
    .then((p) => {
      if(!p)  {
        throw "No player found";
      }
      sockets.set({
        playerId: p.id,
        socketId: socket.id
      });
      player = p;
      if(p.roomId) {
        return getRoom(p);
      }

    })
    .then((room) => {
      if(room) {
        room._addPlayer(player);
      }
      channels[channel](player, room, data);
    })
    .catch((err) => {
      console.log('server error', err)
      socket.send('server error', err);
    })
  })
  socket.on('close', function() {
    Player._getOnSocketId(socket.id)
    .then(p => {
      p._save();
      // delete Player.players[p.id];
      var r = getRoom(p);
      r && r._removePlayer(p);
      sockets.del({
        playerId: p.id,
        socketId: socket.id
      });
    })
    .catch(err => {
      console.log('process disconnect player error')
      console.log(err)
    });

  });
});
