HTMLCanvasElement.prototype.clone = function(w, h, style) {
  w = w || this.width;
  h = h || this.height;
  var c = document.createElement('canvas');
  c.width = this.width;
  c.height = this.height;
  c.getContext('2d').drawImage(this, 0, 0, w, h);
  this.style.copyTo(c.style);
  if(typeof style == 'object') {
    Object.assign(c.style, style);
  }
  return c;
}

HTMLCanvasElement.prototype.toPNG =  function() {
  return this.toDataURL('image/png');
}

CSSStyleDeclaration.prototype.copyTo = function(o) {
  for(p of this) {
    o[p] = this[p];
  }
}
function html(strings, ...values) {
  let out = '';
  strings.forEach((s, i) => {
    out += s + (values[i] == undefined ? '' : values[i]);
  })

  let d = document.createElement('template');
  d.innerHTML = out;
  return d.content.firstElementChild;
}
class Module {
  constructor(name) {
    this.name = name;
    this.module = '';
    Module.modules[name] = this;
  }

  get exports() {
    return this.module;
  }

  set exports(n) {
    this.module = n;
    // Module.loaders.forEach(l => l());
  }

  static onLoad(files, fn) {
    console.log('load modules')
    var o = Promise.resolve();
    let calls = files.map(f => {
      let m = new Module(f);
      let tag = f.match('.js') ? 'script' : 'img';

      return new Promise((resolve, reject) => {
        var script = document.createElement(tag);
        script.async = true;
        script.defer = true;
        script.onload = function() {
          if(tag == 'img') {
            m.exports = script;
          }
          resolve();
        };
        script.src = f;
        tag == 'script' && document.body.appendChild(script);
      })
    });

    Promise.all(calls).then(function() {
      Object.keys(Module.modules).forEach(k => {
        Module.modules[k].pre && Module.modules[k].pre()
      });
      fn()
    }).catch(e => {
      console.log('loading error', e)
    });
  }
}

function require(name) {
  return Module.modules[name] && Module.modules[name].module || null;
}
Module.modules = {};
Module.loaders = [];

class Emitter {
  constructor() {
    this.worker = new Worker('socket-worker.js');
    this.worker.onmessage = (e) => {
      if(e.data.method == 'on') {
        this.execOn(e.data.channel, e.data.data);
      }
    };
    this.channels = {};
  }
  on(channel, fn) {
    this.channels[channel] = fn;
    // this.worker.postMessage({
    //   method: 'on',
    //   channel: channel
    // })
  }
  execOn(channel, data) {
    if(typeof this.channels[channel] !== 'function') return;
    this.channels[channel](data);
  }
  emit(channel, data) {
    this.worker.postMessage({
      method: 'emit',
      channel: channel,
      data: data
    })
  }
}
const socket = new Emitter();

Module.onLoad(['DungeonCrawl_ProjectUtumnoTileset.png', 'Hell2.jpg',
'monsters.js', 'abilities.js', 'terrains.js', 'arenas.js', 'icons.js', 'animations.js', 'teams.js',
'special-effects.js','FixedList.js', 'Logger.js', 'Rand.js', 'Canvas.js', 'Sprite.js', 'CompositeSprite.js', 'AbilityEffect.js', 'Animation.js',
'PositionList2d.js', 'pathfinding.js',  'Ability.js', 'AI.js', 'Monster.js', 'Terrain.js', 'Menu.js', 'BattleMenu.js',
'Arena.js', 'MonsterCard.js', 'TeamViewer.js', 'Lobby.js', 'TeamSelect.js', 'BattleResult.js', 'Battle.js',
'game-modes.js' ], () => {
  const aiTeams = require('teams.js');
  const Lobby = require('Lobby.js');
  const lobby = new Lobby();
  lobby.render();

  socket.on('user entered', (user) => {
    console.log('user enters', user)
    lobby.didEnter(user);
  });

  socket.on('token', data => {
    lobby.setToken(data);
  })

  socket.on('user left', (user) => {
    console.log('user left', user)
    lobby.didLeave(user);
  })

  socket.on('user list', users => {
    lobby.addUsers(users);
  })

  socket.on('game created', game => {
    lobby.gameCreated(game);
  })

  socket.on('game joined', game => {
    lobby.didJoinGame(game);
  })

  socket.on('game stopped', game => {
    lobby.didStopGame(game);
  })

  socket.on('game started', game => {
    lobby.gameDidStart(game);
  })

  socket.on('spectate confirmed', game => {
    lobby.startSpectate(game);
  })

  socket.on('game ready', game => {
    // when all teams have been selected
    lobby.gameIsReady(game);
  })

  socket.on('game list', games => {
    lobby.addGames(games);
  })
  socket.on('game updated', game => {
    lobby.updateGame(game);
  })

  socket.on('team selected', game => {
    lobby.teamSelected(game);
  })

  socket.on('game continued', game => {
    lobby.gameContinued(game);
  })

  socket.on('battle action confirmed', data => {
    lobby.confirmBattleAction(data);
  })
  const Rand = require('Rand.js');
  const PL = require('PositionList2d.js');
  const monsters = require('monsters.js');
  const Battle = require('Battle.js');
  const TeamSelect = require('TeamSelect.js');
  const Monster = require('Monster.js');
  const MonsterCard = require('MonsterCard.js');
  const abilities = require('abilities.js');
  const terrains = require('terrains.js');
  const Logger = require('Logger.js');
  const logger = new Logger();
  window.logger = logger;
  var style = document.createElement('style');
  style.innerHTML = MonsterCard.style;
  document.head.appendChild(style);
  var team1 = [];
  var team2 = [];
  var cash = 600;

  var selectContainer = document.createElement('div');
  selectContainer.style.position = 'absolute';
  selectContainer.style.width = '100%';
  selectContainer.style.height = '100%';
  selectContainer.style.top = '0px';
  selectContainer.style.left = '0px';
  selectContainer.style.backgroundColor = 'darkslategray';
  selectContainer.style.zIndex = 10;
  selectContainer.style.textAlign = 'center';
  document.body.appendChild(selectContainer);

  // team2.forEach(a => a.ai = true);
  var w = h = 12;
  h = 12;
  var tw = th = 42;
  var container = document.createElement('div');
  container.style.position = 'relative';
  container.style.height = h * th + "px";
  var grid = document.createElement('canvas');
  var effects = document.createElement('canvas');
  grid.style.position = effects.style.position = 'absolute';
  grid.style.left = effects.style.left = '0px';
  grid.style.top = effects.style.top = '0px';
  grid.style.zIndex = 1;
  effects.style.zIndex = 2;
  effects.style.position = 'block';
  container.appendChild(effects);
  container.appendChild(grid);
  Object.assign(grid.style, {
    display: 'block',
    border: '1px solid green',
    width: w * tw,
    height: h * th,
    left: '50%',
    transform: 'translateX(-50%)',

  })
  document.body.appendChild(container);

  const viewer = {
    selectContainer,
    container,
    showTeamSelect() {
      selectContainer.style.display = 'block'
    },
    hideTeamSelect() {
      selectContainer.style.display = 'none'
    },
    reset() {
      container.innerHTML = '';
      selectContainer.innerHTML = '';
      window.battle = null;
    }
  };

  function assembleTeam(team) {
    return team.map(t => {
      let template = monsters.find(m => m.id == t.templateId);
      let monster = new Monster(template, t.stacks);
      return monster;
    })
  }

  const gameModes = require('game-modes.js');
  gameModes.humanVSAI(lobby, viewer);
  gameModes.AIVSAI(lobby, viewer);
  gameModes.localMultiplayer(lobby, viewer);
  gameModes.spectate(lobby, viewer);
  gameModes.liveMultiplayer(lobby, viewer);
  gameModes.playByPost(lobby, viewer);
})
