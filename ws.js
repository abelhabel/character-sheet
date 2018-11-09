module.exports = function(server) {
  var WebSocket = require('ws');
  var wss = new WebSocket.Server({server: server});
  const SPLITTER = '-|-';
  WebSocket.prototype.ship = function(channel, data) {
    this.send(channel + SPLITTER + JSON.stringify(data));
  };

  function uniqueId() {
    return Math.random().toString().substr(2);
  }

  class User {
    constructor(name) {
      this.id = uniqueId();
      this.name = name;
    }
  }

  class Team {
    constructor(user, team) {
      this.user = user;
      this.team = team;
    }
  }

  class Game {
    constructor(user) {
      this.owner = user;
      this.users = [user];
      this.id = uniqueId();
      this.max = 2;
      this.teams = [];
      this.status = 'created';
      this.seed = Date.now();
    }

    start() {
      this.status = 'started';
    }

    join(user) {
      if(this.full) {
        return;
      }
      this.users.push(user);
    }

    addTeam(user, team) {
      if(this.teams.find(t => t.user.id == user.id)) {
        return;
      }
      let t = new Team(user, team);
      this.teams.push(t);
    }

    get full() {
      return this.users.length >= this.max;
    }

    get ready() {
      return this.teams.length == this.max;
    }
  }

  class Lobby {
    constructor() {
      this.games = [];
      this.users = [];
    }

    cast(channel, data, excludeUser) {
      this.users.forEach(u => {
        if(u == excludeUser) return;
        let socket = sockets.get({playerId: u.id});
        socket && socket.ship(channel, data);
      });
    }

    castInGame(game, channel, data, excludeUser) {
      game.users.forEach(u => {
        if(excludeUser && excludeUser.id == u.id) return;
        let socket = sockets.get({playerId: u.id});
        socket && socket.ship(channel, data);
      });
    }

    battleAction(gameId, user, action) {
      let game = this.games.find(g => g.id == gameId);
      if(!game) {
        return;
      }

      this.castInGame(game, 'battle action confirmed', {game, action});
    }

    createGame(user) {
      let game = new Game(user);
      this.games.push(game);
      this.cast('game created', game);
    }

    joinGame(gameId, user) {
      let game = this.games.find(g => g.id == gameId);
      if(!game) {
        return;
      }
      game.join(user);
      this.cast('game joined', {game, user});
    }

    startGame(gameId) {
      let index = this.games.findIndex(g => g.id == gameId);
      let game = this.games[index];
      if(!game) {
        return;
      }
      game.start();
      this.cast('game started', game);
    }

    selectTeam(gameId, user, team) {
      let game = this.games.find(g => g.id == gameId);
      if(!game) {
        return;
      }
      game.addTeam(user, team);
      game.ready && this.cast('game ready', game);
    }

    stopGame(gameId) {
      let index = this.games.findIndex(g => g.id == gameId);
      let game = this.games[index];
      if(!game) {
        return;
      }
      this.games.splice(index, 1);
      this.cast('game stopped', game);
    }

    enter(user) {
      this.users.push(user);
      this.cast('user entered', user);
      this.cast('game list', this.games);
      let socket = sockets.get({playerId: user.id});
      socket && socket.ship('user list', this.users);


    }

    leave(user) {
      let index = this.users.indexOf(user);
      if(!~index) {
        return;
      }
      this.cast('user left', user);
      this.games.forEach(g => {
        if(g.owner.id == user.id) {
          this.stopGame(g.id);
        }
      })
      this.users.splice(index, 1);
    }

    disconnect(user) {
      let index = this.users.indexOf(user);
      if(!~index) {
        return;
      }
      this.users.splice(index, 1);
      this.games.forEach(g => {
        if(g.owner.id == user.id) {
          this.stopGame(g.id);
        }
      })
      this.games.forEach(g => {
        g.teams = g.teams.filter(t => t.user.id != user.id);
        g.users = g.users.filter(u => u.id != user.id);
      })
      this.cast('user left', user);
      this.cast('game list', this.games);
      this.cast('user list', this.users);
    }

  }

  var sockets = require('./sockets')(wss);
  const SOCKETS = {};
  const PLAYERS = {};
  const LOBBY = new Lobby();

  WebSocket.Server.prototype.to = function(socketId) {
    return SOCKETS[socketId];
  }
  function getUser(socket) {
    let userId = sockets.getPlayerId(socket.id);
    return PLAYERS[userId];
  }
  var channels = {
    'enter lobby'(socket, data) {
      let user = new User(data.name);
      PLAYERS[user.id] = user;
      sockets.set({playerId: user.id, socketId: socket.id});
      LOBBY.enter(user);
    },
    'leave lobby'(socket, data) {
      let user = getUser(socket);
      LOBBY.leave(user);
    },
    'create game'(socket, data) {
      let user = getUser(socket);
      LOBBY.createGame(user);
    },
    'join game'(socket, data) {
      let user = getUser(socket);
      LOBBY.joinGame(data.id, user);
    },
    'stop game'(socket, data) {
      let user = getUser(socket);
      LOBBY.stopGame(data.id);
    },
    'start game'(socket, data) {
      let user = getUser(socket);
      LOBBY.startGame(data.id);
    },
    'select team'(socket, data) {
      let user = getUser(socket);
      LOBBY.selectTeam(data.game.id, user, data.team);
    },
    'battle action'(socket, data) {
      let user = getUser(socket);
      LOBBY.battleAction(data.game.id, user, data.action);
    }
  };

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
      typeof channels[channel] == 'function' && channels[channel](socket, data);

    })
    socket.on('close', function() {
      let user = getUser(socket) || {id: ''};
      console.log('user leaving', user)
      LOBBY.disconnect(user);
      sockets.del({
        playerId: user.id,
        socketId: socket.id
      });
      delete SOCKETS[socket.id];
      delete PLAYERS[user.id];

    });
  });
}
