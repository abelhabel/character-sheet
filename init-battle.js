HTMLCanvasElement.prototype.clone = function(w, h, style) {
  w = w || this.width;
  h = h || this.height;
  var c = document.createElement('canvas');
  c.width = w;
  c.height = h;
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
function addToolTip(tag, tip) {
  let toolTip;
  tag.addEventListener('mouseenter', e => {
    let bb = tag.getBoundingClientRect();
    toolTip = html`<div style='
      position: fixed;
      top: ${bb.y + 3}px;
      left: ${bb.x + bb.width + 2}px;
      color: black;
      z-index: 1010;
      pointer-events: none;
      padding: 4px;
      background-image: url(sheet_of_old_paper.png);
      background-repeat: no-repeat;
      overflow: hidden;
      border-radius: 2px;
      box-shadow: 0px 0px 5px 1px rgba(0,0,0,0.75);
      '
    >
      ${tip}
    </div>`;
    document.body.appendChild(toolTip);
  });
  tag.addEventListener('mouseout', e => {
    toolTip && toolTip.parentNode && document.body.removeChild(toolTip);
  })
  tag.addEventListener('mousedown', e => {
    toolTip && toolTip.parentNode && document.body.removeChild(toolTip);
  })
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
'mythical_card.jpg', 'outlaws_card.jpg', 'undead_card.jpg', 'beasts_card.jpg', 'order_of_idun_card.jpg', 'aloysias_chosen_card.jpg', 'demons_card.jpg',
'guid.js', 'sounds.js', 'adventures.js', 'recipes.js',
'monsters.js', 'abilities.js', 'terrains.js', 'arenas.js', 'icons.js', 'animations.js', 'teams.js', 'elements.js', 'matches.js', 'gauntlets.js',
'special-effects.js','FixedList.js', 'Component.js', 'ToolTip.js', 'CardList.js', 'Logger.js', 'Rand.js',
'Canvas.js', 'Sprite.js', 'CompositeSprite.js',
'AbilityEffect.js', 'Animation.js', 'AdventureTime.js',
'PositionList2d.js', 'pathfinding.js',  'Ability.js', 'AI.js', 'Terrain.js', 'Scroll.js', 'Menu.js', 'Slider.js', 'Monster.js',
'BattleMenu.js', 'AdventureMenu.js', 'Inventory.js', 'Crafting.js', 'Quest.js', 'QuestLog.js',
'Arena.js', 'MonsterCard.js',
'TeamSheet.js', 'TeamViewer.js', 'Team.js', 'TeamSelect.js', 'UnitPlacement.js', 'BattleResult.js', 'Match.js', 'SoundPlayer.js',
'Gauntlet.js', 'View.js', 'Lobby.js', 'Battle.js', 'Adventure.js', 'GameUI.js',
'game-modes.js', 'lobby-channels-client.js' ], () => {
  const GameUI = require('GameUI.js');
  const channels = require('lobby-channels-client.js');
  const gameui = new GameUI();
  channels(gameui.lobby);
  gameui.render();
  window.gameui = gameui;
  const Logger = require('Logger.js');
  const logger = new Logger();
  window.logger = logger;

  const gameModes = require('game-modes.js');
  gameModes.humanVSAI(gameui.lobby, gameui);
  gameModes.AIVSAI(gameui.lobby, gameui);
  gameModes.localMultiplayer(gameui.lobby, gameui);
  gameModes.spectate(gameui.lobby, gameui);
  gameModes.liveMultiplayer(gameui.lobby, gameui);
  gameModes.playByPost(gameui.lobby, gameui);
  gameModes.startMatch(gameui.lobby, gameui);
  gameModes.importMatch(gameui.lobby, gameui);
  gameModes.gauntlet(gameui.lobby, gameui);
  gameModes.adventure(gameui.lobby, gameui);
})
