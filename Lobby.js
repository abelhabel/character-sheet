class User {
  constructor(name, id, activeGames, wins, losses) {
    this.name = name;
    this.id = id;
    this.activeGames = activeGames || [];
    this.wins = wins || 0;
    this.losses = losses || 0;
  }

  static create(data) {
    return new User(data.name, data.id, data.activeGames, data.wins, data.losses);
  }
}

class Game {
  constructor(user, type, id, status, max, seed, actions, teams) {
    this.type = type;
    this.owner = user;
    this.users = [user];
    this.id = id;
    this.status = status;
    this.max = max;
    this.seed = seed;
    this.actions = actions || [];
    this.teams = teams || [];
  }

  static create(g) {
    return new Game(g.owner, g.type, g.id, g.status, g.max, g.seed, g.actions, g.teams);
  }

  start() {
    console.log('started game')
  }

  update(o) {

  }

  join(user) {
    if(this.full) {
      console.log('game is full');
      return;
    }
    this.users.push(user);
  }

  get full() {
    return this.users.length >= this.max;
  }
}

class Lobby {
  constructor() {
    this.localUser = null;
    this.localUserName = localStorage.localUserName || '';
    this.users = [];
    this.games = [];
    this.tags = {};
    this.channels = {
      'user entered': 'didEnter'
    };
    this.events = {
      'local game': [],
      'remote game': [],
      'game ready': [],
      'battle action confirmed': [],
      'start spectate': [],
      'play by post': []
    }
  }

  hide() {
    this.tags.container.style.display = 'none';
  }

  show() {
    this.tags.container.style.display = 'block';
  }

  on(event, fn) {
    if(!this.events[event]) return;
    this.events[event].push(fn);
  }

  trigger(event, data) {
    if(!this.events[event]) return;
    this.events[event].forEach(fn => fn(data));
  }

  confirmBattleAction(data) {
    let game = this.games.find(u => u.id == data.game.id);
    if(!game) return;
    let action = data.action;
    game.actions.push(action);
    this.trigger('battle action confirmed', {game, action});
  }

  battleAction(game, action) {
    socket.emit('battle action', {game, action});
  }

  selectTeam(game, team) {
    socket.emit('select team', {game, team})
  }

  teamSelected(data) {
    let game = this.games.find(g => g.id == data.id);
    if(!game) return;
    game.teams = data.teams;
    console.log('team selected and game updated')
  }

  gameIsReady(game) {
    this.trigger('game ready', game);
  }

  gameDidStart(data) {
    console.log('gameDidStart', data)
    let game = this.games.find(u => u.id == data.id);
    this.update();
    if(game.users.find(u => u.id == this.localUser.id)) {
      this.trigger('remote game', game);
    }
  }

  startRemoteGame(game) {
    socket.emit('start game', game);
  }

  spectate(game) {
    socket.emit('spectate', game);
  }

  startSpectate(game) {
    console.log('startSpectate')
    this.trigger('start spectate', game);
  }

  addUsers(users) {
    let list = users.filter(u => !this.users.find(b => b.id == u.id));
    list.forEach(u => {
      this.users.push(User.create(u));
    });
    this.update();
  }

  addGames(games) {
    let list = games.filter(u => !this.games.find(b => b.id == u.id));
    list.forEach(g => {
      let game = Game.create(g);
      game.users = g.users.map(u => User.create(u));
      this.games.push(game);
    });
    this.update();
  }

  updateGame(data) {
    let game = this.games.find(g => g.id == data.id);
    game.update(data);
  }

  didEnter(data) {
    let user = User.create(data);
    this.users.push(user);
    console.log('user did enter', user, this);
    if(user.name == this.localUserName) {
      this.localUser = user;
    }
    this.update();
  }

  setToken(data) {
    localStorage.localUserName = data.name;
    localStorage.token = data.token;
    this.update();
  }

  enter() {
    if(localStorage.token) {
      return socket.emit('login', {token: localStorage.token});
    }
    var name = window.prompt('Name:');
    if(!name) return;
    this.localUserName = name;
    socket.emit('enter lobby', {name: name});
  }

  didLeave(user) {
    let index = this.users.findIndex(u => u.id == user.id);
    if(!~index) {
      console.log('user could not leave')
      return;
    }
    if(this.localUser.id == user.id) {
      this.localUser = null;
    }
    this.users.splice(index, 1);
    this.update();
  }

  leave() {
    socket.emit('leave lobby', this.localUser);
  }

  gameCreated(data) {
    console.log('gameCreated', data)
    let user = this.users.find(u => u.id == data.owner.id);
    let game = Game.create(data);
    game.owner = user;
    this.games.push(game);
    this.update();
    if(game.type == 'play by post' && game.users.find(u => u.id == this.localUser.id)) {
      this.trigger('play by post', game);
    }
  }

  createGame(user) {
    socket.emit('create game', this.localUser);
  }

  createPlayByPostGame(user) {
    socket.emit('create play by post game', this.localUser);
  }
  createLocalGame() {
    this.hide();
    this.trigger('local game');
  }

  didJoinGame(data) {
    console.log('didJoinGame', data)
    let game = this.games.find(g => g.id == data.game.id);
    let user = this.users.find(u => u.id == data.user.id);
    game.users.push(user);
    game.teams = data.game.teams;
    if(game.full && game.type == 'play by post' && game.users.find(u => u.id == this.localUser.id)) {
      console.log('game full');
      this.trigger('play by post', game);
    }
    this.update();
  }

  joinGame(game, user) {
    socket.emit('join game', game);
  }

  didStopGame(data) {
    let index = this.games.findIndex(g => g.id == data.id);
    let game = this.games[index];
    if(!game) {
      console.log('could not stop game. it does not exist');
      return;
    }
    this.games.splice(index, 1);
    this.update();
  }

  winGame(game) {
    socket.emit('win game', game);
  }

  loseGame(game) {
    socket.emit('lose game', game);
  }

  stopGame(game) {
    socket.emit('stop game', game);
  }

  continueGame(game) {
    socket.emit('continue game', game);
  }

  gameContinued(data) {
    let game = this.games.find(g => g.id == data.id);
    this.trigger('play by post', game);
  }

  renderGame(game) {
    console.log('render game', game)
    let c = document.createElement('div');
    Object.assign(c.style, {
      width: '100%',
      height: '100px',
      border: '1px solid lightgray'
    })
    if(~this.localUser.activeGames.indexOf(game.id)) {
      let cont = document.createElement('button');
      cont.textContent = 'Continue Game';
      cont.addEventListener('click', () => this.continueGame(game));
      c.appendChild(cont);
    } else
    if(game.full && game.owner.id == this.localUser.id) {
      let startGame = document.createElement('button');
      startGame.textContent = 'Start Game';
      startGame.addEventListener('click', () => this.startRemoteGame(game));
      c.appendChild(startGame);
    } else {
      let spectate = document.createElement('button');
      spectate.textContent = 'Spectate';
      spectate.addEventListener('click', () => this.spectate(game));
      c.appendChild(spectate);
    }
    if(!game.full && game.owner.id != this.localUser.id) {
      let joinGame = document.createElement('button');
      joinGame.textContent = 'Join Game';
      joinGame.addEventListener('click', () => this.joinGame(game, this.localUser));
      c.appendChild(joinGame);
    }
    if(game.owner.id == this.localUser.id) {
      let stopGame = document.createElement('button');
      stopGame.textContent = 'Stop Game';
      stopGame.addEventListener('click', () => this.stopGame(game, this.localUser));
      c.appendChild(stopGame);
    }
    let name = game.owner.name == this.localUserName ? 'You' : game.owner.name;
    let html = `<p>
      Type: ${game.type}<br>
      Created by: ${name}<br>
      Users: ${game.users.map(u => u.name).join(', ')}<br>
      ${game.users.length}/${game.max}
    </p>`;
    let d = document.createElement('div');
    d.innerHTML = html;
    c.appendChild(d);
    return c;
  }

  renderUser(user) {
    let c = document.createElement('div');
    Object.assign(c.style, {
      width: '100%',
      border: '1px solid lightgray',
    })
    c.innerHTML = `<span>
      ${user.name} | wins ${user.wins} | losses ${user.losses}
    </span>`;
    return c;
  }

  update() {
    if(this.localUser) {
      this.tags.enter.style.display = 'none';
      this.tags.leave.style.display = 'inline-block';
      this.tags.create.style.display = 'inline-block';
      this.tags.playByPost.style.display = 'inline-block';
    } else {
      this.tags.enter.style.display = 'inline-block';
      this.tags.create.style.display = 'none';
      this.tags.playByPost.style.display = 'none';
      this.tags.leave.style.display = 'none';
    }
    this.tags.games.innerHTML = '';
    this.games.filter(g => {
      if(g.type == 'play by post' && g.full && !g.users.find(u => u.id == this.localUser.id)) {
        return false;
      }
      if(g.status == 'complete') return false;
      return true;
    })
    .forEach(g => {
      let tag = this.renderGame(g);
      this.tags.games.appendChild(tag);
    })
    // this.localUser && this.localUser.activeGames.forEach(g => {
    //   let tag = this.renderActiveGame(g);
    //   this.tags.games.appendChild(tag);
    // })
    this.tags.users.innerHTML = '';
    this.users.forEach(g => {
      let tag = this.renderUser(g);
      this.tags.users.appendChild(tag);
    })
  }

  render() {
    let c = document.createElement('div');
    Object.assign(c.style, {
      position: 'fixed',
      zIndex: 1000,
      left: '50%',
      top: '50%',
      transform: 'translate(-50%,-50%)',
      width: '800px',
      height: '600px',
      backgroundColor: 'rgba(0,0,0,0.5)',
      border: '1px solid gray',
      color: 'white'
    })
    let buttons = document.createElement('div');
    buttons.classList.add('buttons');

    let create = document.createElement('button');
    create.textContent = 'Create Multiplayer Game';
    create.addEventListener('click', () => this.createGame(this.localUser));

    let playByPost = document.createElement('button');
    playByPost.textContent = 'Create Play By Post Game';
    playByPost.addEventListener('click', () => this.createPlayByPostGame(this.localUser));

    let createLocal = document.createElement('button');
    createLocal.textContent = 'Create Local Game';
    createLocal.addEventListener('click', () => this.createLocalGame(this.localUser));

    let enter = document.createElement('button');
    enter.textContent = 'Enter';
    enter.addEventListener('click', () => this.enter());

    let leave = document.createElement('button');
    leave.textContent = 'Leave';
    leave.addEventListener('click', () => this.leave());

    buttons.appendChild(create);
    buttons.appendChild(playByPost);
    buttons.appendChild(createLocal);
    buttons.appendChild(enter);
    buttons.appendChild(leave);
    let users = document.createElement('div');
    let games = document.createElement('div');
    Object.assign(users.style, {
      display: 'inline-block',
      width: '50%',
      height: '90%',
      verticalAlign: 'top'
    });
    Object.assign(games.style, {
      display: 'inline-block',
      width: '50%',
      height: '90%',
      verticalAlign: 'top'
    })
    c.appendChild(buttons);
    c.appendChild(users);
    c.appendChild(games);
    document.body.appendChild(c);

    this.tags.container = c;
    this.tags.users = users;
    this.tags.games = games;
    this.tags.create = create;
    this.tags.enter = enter;
    this.tags.leave = leave;
    this.tags.createLocal = createLocal;
    this.tags.playByPost = playByPost;
    this.update();
  }

}

module.exports = Lobby;
