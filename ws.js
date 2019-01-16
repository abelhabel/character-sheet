const File = require('./File.js');
const fs = require('fs');
const guid = require('./guid');
const backup = require('./backup');
console.log(process.env.NODE_ENV)
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

  const User = require('./User');

  class Team {
    constructor(user, team) {
      this.user = user;
      this.team = team;
    }
  }

  class Game {
    constructor(user, type) {
      this.id = guid();
      this.type = type || 'remote';
      this.owner = user;
      this.users = [user];
      this.max = 2;
      this.teams = [];
      this.status = 'created';
      this.seed = Date.now();
      this.actions = [];
      this.spectators = [];
    }

    static create(g) {
      let game = new Game();
      Object.assign(game, g);
      return game;
    }

    start() {
      this.status = 'started';
    }

    save() {
      let data = JSON.stringify(this);
      let file = new File('games', `${this.id}.json`);
      return file.write(data);
    }

    static load(id) {
      let file = new File('games', `${id}.json`);
      return file.read()
      .then(() => {
        let game = new Game();
        Object.assign(game, file.js());
        game.spectators = [];
        return game;
      })
    }

    spectate(user) {
      this.spectators.push(user);
    }

    join(user) {
      console.log('user joins', this, user)
      if(this.full) {
        return;
      }
      if(this.users.find(u => u.id == user.id)) return;
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
      this.loadOnGoingGames();
    }

    loadOnGoingGames() {
      if(process.env.NODE_ENV == 'production') {
        return backup.getFolder('games')
        .then(d => JSON.parse(d))
        .then(data => {
          data.forEach(g => {
            if(g.status == 'completed') return;
            let game = Game.create(g);
            this.games.push(game);
          })
        })
      }
      fs.readdir(__dirname + '/games', (err, fileNames) => {
        fileNames.forEach(fn => {
          Game.load(fn.replace('.json', ''))
          .then(game => {
            if(game.status == 'complete') return;
            this.games.push(game);
          })
          .catch(e => {
            console.log('error loading games', e)
          })
        })
      })
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
      game.spectators.forEach(u => {
        if(excludeUser && excludeUser.id == u.id) return;
        let socket = sockets.get({playerId: u.id});
        socket && socket.ship(channel, data);
      });
    }

    castToUser(user, channel, data) {
      let socket = sockets.get({playerId: user.id});
      socket && socket.ship(channel, data);
    }

    battleAction(gameId, user, action) {
      this.loadGame(gameId)
      .then(game => {
        game.actions.push(action);
        this.castInGame(game, 'battle action confirmed', {game, action});
        if(game.type == 'play by post') {
          return game.save();
        }
      })
    }

    createGame(user) {
      let game = new Game(user);
      this.games.push(game);
      this.cast('game created', game);
    }

    createPlayByPostGame(user) {
      let game = new Game(user, 'play by post');
      this.games.push(game);
      user.joinGame(game.id);
      user.save();
      game.save()
      .then(() => console.log('game save success'))
      .catch(e => console.log('game save error', e));
      this.cast('game created', game);
    }

    joinGame(gameId, user) {
      let game = this.games.find(g => g.id == gameId);
      if(!game) {
        return;
      }
      game.join(user);
      this.cast('game joined', {game, user});
      if(game.type == 'play by post' && game.full) {
        user.joinGame(game.id);
        user.save();
        game.save()
        .then(() => console.log('game save success'))
        .catch(e => console.log('game save error', e));
        // this.stopGame(game.id);
      }
    }

    continueGame(gameId, user) {
      this.loadGame(gameId)
      .then(game => {
        this.castToUser(user, 'game continued', game);
      })
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

    spectate(gameId, user) {
      let game = this.games.find(g => g.id == gameId);
      if(!game) {
        return;
      }
      game.spectate(user);
      this.castToUser(user, 'spectate confirmed', game);
    }

    winGame(gameId, user) {
      user.wins += 1;
      user.leaveGame(gameId);
      user.save()
      .then(() => this.loadGame(gameId))
      .then(game => {
        console.log('game won', game)
        game.status = 'complete';
        game.winner = user;
        return this.stopGame(gameId, user);
      })
    }

    loseGame(gameId, user) {
      user.losses += 1;
      user.leaveGame(gameId);
      user.save()
      .then(() => this.loadGame(gameId))
      .then(game => {
        game.status = 'complete';
        return game.save()
      })
    }

    loadGame(id) {
      return new Promise((resolve, reject) => {
        let game = this.games.find(g => g.id == id);
        if(game) {
          return resolve(game);
        }
        return Game.load(id).then(resolve, reject);
      })
    }

    saveGame(game) {
      if(game.type != 'play by post') return Promise.resolve();
      return game.save();
    }

    selectTeam(gameId, user, team) {
      this.loadGame(gameId)
      .then(game => {
        if(!game) {
          return;
        }
        game.addTeam(user, team);
        console.log('added team', game)
        if(game.type == 'play by post') {
          game.save()
          .then(() => console.log('game save success'))
          .catch(e => console.log('game save error', e));
        }
        this.castInGame(game, 'team selected', game);
        game.ready && this.cast('game ready', game);

      })
      .catch(e => {
        console.log('selectin team error', e)
      })
    }

    removeGameFromMemory(gameId) {
      let index = this.games.findIndex(g => g.id == gameId);
      ~index && this.games.splice(index, 1);
    }

    stopGame(gameId) {
      this.loadGame(gameId)
      .then(game => {
        console.log('stopping game', game)
        this.removeGameFromMemory(gameId);
        game.status = 'complete';
        this.cast('game stopped', game);
        return this.saveGame(game);
      })
    }

    enter(user) {
      this.users.push(user);
      this.cast('user entered', user);
      this.cast('game list', this.games);
      let socket = sockets.get({playerId: user.id});
      socket && socket.ship('user list', this.users);
    }

    sendToken(user, token) {
      let socket = sockets.get({playerId: user.id});
      socket && socket.ship('token', {token, name: user.name});
    }

    leave(user) {
      let index = this.users.findIndex(u => u.id == user.id);
      if(!~index) {
        return;
      }
      this.cast('user left', user);
      this.games.forEach(g => {
        if(g.type == 'remote' && g.owner && g.owner.id == user.id) {
          this.stopGame(g.id);
        }
      })
      this.users.splice(index, 1);
    }

    disconnect(user) {
      let index = this.users.findIndex(u => u.id == user.id);
      console.log('disconnect user index', index)
      if(!~index) {
        return;
      }
      this.users.splice(index, 1);
      this.games.forEach(g => {
        if(!g || !g.owner) return;
        if(g.type == 'remote' && g.owner.id == user.id) {
          this.stopGame(g.id);
        }
      })
      this.games.forEach(g => {
        if(!g || !g.owner) return;
        if(g.type == 'play by post') return;
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
      let p = data.name.split(':');
      let name = p[0];
      let password = p[1];
      console.log('enter lobby', data)
      User.login(name, password)
      .then(user => {
        let token = user.createToken();
        PLAYERS[user.id] = user;
        sockets.set({playerId: user.id, socketId: socket.id});
        LOBBY.enter(user.toSafe());
        LOBBY.sendToken(user, token.toString());

      })
      .catch(e => {
        console.log('error logging in user', e);
      })
    },
    'login'(socket, data) {
      User.loginWithToken(data.token)
      .then(user => {
        console.log('user logged in with token', user);
        PLAYERS[user.id] = user;
        sockets.set({playerId: user.id, socketId: socket.id});
        LOBBY.enter(user.toSafe());
      })
      .catch(e => {
        console.log('error logging in user', e);
      })
    },
    'leave lobby'(socket, data) {
      let user = getUser(socket);
      LOBBY.leave(user);
    },
    'win game'(socket, data) {
      let user = getUser(socket);
      LOBBY.winGame(data.id, user);
    },
    'lose game'(socket, data) {
      let user = getUser(socket);
      LOBBY.loseGame(data.id, user);
    },
    'create game'(socket, data) {
      let user = getUser(socket);
      LOBBY.createGame(user);
    },
    'create play by post game'(socket, data) {
      let user = getUser(socket);
      LOBBY.createPlayByPostGame(user);
    },
    'continue game'(socket, data) {
      let user = getUser(socket);
      LOBBY.continueGame(data.id, user);
    },
    'join game'(socket, data) {
      let user = getUser(socket);
      LOBBY.joinGame(data.id, user);
    },
    'spectate'(socket, data) {
      let user = getUser(socket);
      LOBBY.spectate(data.id, user);
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
    },
    'pong'(socket) {
      socket.isAlive = true;
    }
  };
  function noop() {}
  var channelNames = Object.keys(channels);
  wss.on('connection', function(socket) {
    socket.isAlive = true;
    setInterval(() => {
      if(!socket || !socket.isAlive) return socket.terminate();
      socket.ping(noop);
    }, 20000);
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
      console.log('user leaving', socket.id, user)
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
