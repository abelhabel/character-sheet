const icons = require('icons.js');
const Sprite = require('Sprite.js');
const Menu = require('Menu.js');
const TeamViewer = require('TeamViewer.js');
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
      'play by post': [],
      'human vs ai game': [],
      'ai vs ai game': []
    };
    this.cursor = new Sprite(icons.find(i => i.bio.name == 'Ability Cursor').bio.sprite);
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

  trigger(event) {
    if(!this.events[event]) return;
    this.events[event].forEach(fn => fn.apply(null, Array.from(arguments).splice(1)));
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
      g.users.forEach(u => {
        if(!u) return;
        if(u.id == g.owner.id) return;
        let user = User.create(u)
        game.users.push(user);
      });
      if(!g.users.length) {
        return this.stopGame(game);
      }
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

  createLocalAIVSAIGame(level = 1) {
    let v1 = new TeamViewer('Pick Team 1');
    let v2 = new TeamViewer();
    v1.render(this.tags.container);
    v1.on('done', team1 => {
      v2.title = `<div>${team1.name} Picked</div>Now, Pick Team 2`;
      v2.render(this.tags.container);
      v2.on('done', team2 => {
        this.hide();
        this.trigger('ai vs ai game', team1, team2, level);
      });
    });
  }

  createLocalAIGame(level = 1) {
    let v1 = new TeamViewer('Pick team to play against');
    v1.render(this.tags.container);
    v1.on('done', team1 => {
      this.hide();
      this.trigger('human vs ai game', team1, level);
    });
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
    c.className = 'game'
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
    } else
    if(game.owner.id !== this.localUser.id) {
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
    let d = html`<p>
      Type: ${game.type}<br>
      Created by: ${name}<br>
      Users: ${game.users.map(u => u.name).join(', ')}<br>
      ${game.users.length}/${game.max}
    </p>`;
    c.appendChild(d);
    return c;
  }

  renderUser(user) {
    let c = html`<div class='user'>
      <span>
        ${user.name} | wins ${user.wins} | losses ${user.losses}
      </span>
    </div>`;
    return c;
  }

  update() {
    this.tags.games.innerHTML = '';
    this.games.filter(g => {
      if(g.type == 'play by post' && g.full && !g.users.find(u => u.id == this.localUser.id)) {
        console.log('do not render game', g)
        return false;
      }
      if(g.status == 'complete') return false;
      return true;
    })
    .forEach(g => {
      let tag = this.renderGame(g);
      this.tags.games.appendChild(tag);
    })
    this.tags.users.innerHTML = '';
    this.users.forEach(g => {
      let tag = this.renderUser(g);
      this.tags.users.appendChild(tag);
    })
  }

  render() {

    let c = document.createElement('div');
    c.id = 'lobby';

    let menu = new Menu([
      {
        text: 'Log In',
        fn: (e, item) => {
          this.enter();
          menu.hide(item);
          menu.show(menu.items[1]);
          menu.show(menu.items[2].items[2]);
          menu.show(menu.items[2].items[3]);
          menu.show(menu.items[2].items[4]);
        }
      },
      {
        text: 'Log Out',
        hidden: true,
        fn: (e, item) => {
          this.leave();
          menu.hide(item);
          menu.show(menu.items[0]);
          menu.hide(menu.items[2].items[2]);
          menu.hide(menu.items[2].items[3]);
          menu.hide(menu.items[2].items[4]);
        }
      },
      {
        text: 'New Game',
        open: false,
        items: [
          {
            text: 'Human vs AI',
            items: [
              {
                text: 'Easy',
                fn: () => this.createLocalAIGame(1),
              },
              {
                text: 'Medium',
                fn: () => this.createLocalAIGame(2),
              }
            ]
          },
          {
            text: 'AI vs AI',
            items: [
              {
                text: 'Easy',
                fn: () => this.createLocalAIVSAIGame(1),
              },
              {
                text: 'Medium',
                fn: () => this.createLocalAIVSAIGame(2),
              }
            ]
          },
          {
            text: 'Local Multiplayer',
            fn: () => this.createLocalGame(this.localUser)
          },
          {
            text: 'Live Multiplayer',
            hidden: true,
            fn: () => this.createGame(this.localUser)
          },
          {
            text: 'Play By Post',
            hidden: true,
            fn: () => this.createPlayByPostGame(this.localUser)
          }
        ]
      },
      {
        text: 'Bestiary',
        link: '/bestiary.html'
      },
      {
        text: 'Ability Compendium',
        link: '/ability-compendium.html'
      },
      {
        text: 'Rules',
        link: '/rules'
      }
    ]);

    let users = document.createElement('div');
    let games = document.createElement('div');
    users.className = 'half';
    games.className = 'half';
    c.appendChild(users);
    c.appendChild(games);

    let outer = document.createElement('div');
    let shadow = outer.attachShadow({mode: 'open'});
    let style = html`<style>
      * {
        box-sizing: border-box;
      }
      #lobby {
        position: fixed;
        z-index: 1000;
        width: 100vw;
        height: 100vh;
        background-color: rgba(0,0,0,0.5);
        background-image: url(sheet_of_old_paper_horizontal.png);
        background-size: contain;
        border: 1px solid gray;
        color: white;
        cursor: url(${this.cursor.canvas.toDataURL('image/png')}), auto;
        padding: 20px;
      }
      button {
        padding: 10px;
        border: none;
        font-size: 20px;
        font-weight: bold;
        margin: 4px;
        box-shadow: 0px 2px 4px -1px rgba(0,0,0,0.5);
        border-radius: 4px;
        background-color: rgba(0,0,0,0);
        cursor: inherit;
      }
      button:hover {
        background-color: rgba(0,0,0,0.1);
      }
      .half {
        display: inline-block;
        width: 50%;
        height: 90%;
        vertical-align: top;
        padding: 10px;
      }
      .game {
        width: 100%;
        background-color: rgba(0,0,0,0.1);
        padding: 5px;
        border-radius: 8px;
        box-shadow: -1px 2px 5px -1px #5a5a5a;
      }
      .user {
        width: 100%;
        background-color: rgba(0,0,0,0.1);
        padding: 5px;
        border-radius: 8px;
        box-shadow: -1px 2px 5px -1px #5a5a5a;
      }
    </style>`;
    shadow.appendChild(style);
    shadow.appendChild(c);

    document.body.appendChild(outer);

    this.tags.container = c;
    this.tags.users = users;
    this.tags.games = games;

    this.tags.container.appendChild(menu.render());
    this.update();
  }

}

module.exports = Lobby;
