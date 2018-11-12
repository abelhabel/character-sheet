HTMLCanvasElement.prototype.clone = function() {
  var c = document.createElement('canvas');
  c.width = this.width;
  c.height = this.height;
  c.getContext('2d').drawImage(this, 0, 0, c.width, c.height);
  Object.assign(c.style, this.style);
  return c;
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
    var o = Promise.resolve();
    files.forEach(f => {
      o = o.then(() => {
        return new Promise((resolve, reject) => {
          var script = document.createElement('script');
          script.onload = function() {
            resolve();
          };
          script.src = f;
          document.body.appendChild(script);
        })
      })
    })
    o.then(function() {
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

Module.onLoad(['monsters.js', 'abilities.js', 'terrains.js',
'special-effects.js', 'Logger.js', 'Rand.js',
'PositionList2d.js', 'pathfinding.js',  'Ability.js', 'Monster.js', 'Terrain.js',
'MonsterCard.js', 'Lobby.js', 'TeamSelect.js', 'Battle.js'], () => {
  const Lobby = require('Lobby.js');
  const lobby = new Lobby();
  lobby.render();

  socket.on('user entered', (user) => {
    console.log('user enters', user)
    lobby.didEnter(user);
  });

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
  var w = h = 8;
  h = 10;
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
  // beasts.forEach(m => m.ai = true);
  // var battle = new Battle(undead, humans, w, h, tw, th, grid, initiative, effects);
  // battle.start();
  lobby.on('local game', (game) => {
    var generator = new Rand(Date.now()).generator;
    window._random = () => generator.random();
    window._roll = (a, b) => {
      return Math.ceil(a + _random() * (b-a));
    }
    console.log('local game', game);
    var teamSelect = new TeamSelect(monsters, selectContainer, w, h, tw, th, cash, 2, () => {
      selectContainer.style.display = 'none';
      teamSelect.teams[0].forEach(m => m.ai = false);
      teamSelect.teams[1].forEach(m => m.ai = false);
      var battle = new Battle(teamSelect.teams[0], teamSelect.teams[1], w, h, tw, th, grid, effects);
      battle.start();
      window.battle = battle;
    });

    teamSelect.render();
  });

  function assembleTeam(team) {
    return team.map(t => {
      let template = monsters.find(m => m.id == t.templateId);
      let monster = new Monster(template, t.stacks);
      return monster;
    })
  }
  lobby.on('remote game', (game) => {
    console.log(game)
    var generator = new Rand(game.seed).generator;
    window._random = (t) => {
      let r = generator.random();
      // logger.log(r, t);
      return r;
    };
    window._roll = (a, b) => {
      return Math.ceil(a + _random() * (b-a));
    }
    console.log('remote game', game);
    lobby.hide();
    var teamSelect = new TeamSelect(monsters, selectContainer, w, h, tw, th, cash, 1, (team) => {
      console.log('team selected', team);
      var selected = team.map(m => {
        return {
          templateId: m.template.id,
          stacks: m.stacks
        }
      })
      lobby.selectTeam(game, selected);
      lobby.on('game ready', (game) => {

        console.log('battle can start', game);
        let localTeam = game.teams.find(t => t.user.id == lobby.localUser.id);
        let remoteTeam = game.teams.find(t => t.user.id != lobby.localUser.id);
        let firstTeam = game.owner.id == lobby.localUser.id ? localTeam.team : remoteTeam.team;
        let secondTeam = game.owner.id != lobby.localUser.id ? localTeam.team : remoteTeam.team;
        if(game.owner.id == lobby.localUser.id) {
          firstTeam = localTeam.team;
          secondTeam = remoteTeam.team;
          localTeam = 'team1';
        } else {
          firstTeam = remoteTeam.team;
          secondTeam = localTeam.team;
          localTeam = 'team2';
        }
        var battle = new Battle(assembleTeam(firstTeam), assembleTeam(secondTeam), w, h, tw, th, grid, effects);

        battle.onAction = (action, team) => {
          if(team != localTeam) return;
          console.log('battle.onAction', action)
          lobby.battleAction(game, action);
        };
        lobby.on('battle action confirmed', (data) => {
          console.log('battle action confirmed', data);
          let a = battle.createAction(data.action);
          battle.addAction(a, true);
        })
        battle.start();
        window.battle = battle;
        selectContainer.style.display = 'none';
      })
    });
  });
})
