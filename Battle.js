const PL = require("PositionList2d.js");
const Monster = require("Monster.js");
const Terrain = require('Terrain.js');
const abilities = require('abilities.js');
const monsters = require('monsters.js');
const terrains = require('terrains.js');
console.log(terrains)
class Turn {
  constructor(actor) {
    this.actor = actor;
    this.startMovement = {x: actor.x, y: actor.y};
    this.endMovement = {x: 0, y: 0};
    this.actions = [];
  };
}

class Battle {
  constructor(team1, team2, w, h, tw, th, board, order, effects) {
    this.team1 = team1;
    this.team2 = team2;
    this.team1.forEach(m => {
      m.team = 'team1';
      m.battle = this;
    });
    this.team2.forEach(m => {
      m.team = 'team2';
      m.battle = this;
    });
    this.teamColors = {
      team1: {
        aura: 'rgba(22, 88, 110, 0.3)',
        selected: 'blue'
      },
      team2: {
        aura: 'rgba(110, 22, 33, 0.3)',
        selected: 'red'
      }
    };
    this.w = w;
    this.h = h;
    this.tw = tw;
    this.th = th;
    this.board = board;
    this.board.width = w * tw;
    this.board.height = h * th;
    this.effects = effects;
    this.effects.width = w * tw;
    this.effects.height = h * th;
    this.inputCanvas = document.createElement('canvas');
    this.inputCanvas.width = this.board.width;
    this.inputCanvas.height = this.board.height;
    Object.assign(this.inputCanvas.style, this.board.style);
    this.inputCanvas.style.zIndex = 100;
    this.board.parentNode.appendChild(this.inputCanvas);
    this.order = order;
    this.turnOrder = [];
    this.grid = new PL(w, h);
    this.terrain = new PL(w, h);
    this.terrainCanvas = document.createElement('canvas');
    this.terrainCanvas.width = this.board.width;
    this.terrainCanvas.height = this.board.height;
    Object.assign(this.terrainCanvas.style, this.board.style);
    this.board.parentNode.insertBefore(this.terrainCanvas, this.board);
    var terrain = new Terrain(terrains.find(t => t.bio.name == 'Grass'));

    this.terrain.loop((x, y) => {
      this.terrain.set(x, y, {sprite: terrain.sprite, x, y});
    })
    console.log(this.terrain)
    this.images = {};
    this.sounds = {};
    this.monsterCards = [];
    this.turns = [];
    this.currentActor = null;
    this.auras = {
      team1: [],
      team2: [],
      all: []
    };
    [...this.team1, ...this.team2].forEach(m => this.addAuras(m))
    this.setEvents();
  }

  addAuras(m) {
    m.passives.forEach(a => this.addAura(a))
  }

  addAura(a) {
    if((a.stats.shape == 'circle' || a.stats.shape == 'square') && a.stats.targetFamily !== 'self' && a.stats.radius) {
      this.auras[a.owner.team] && this.auras[a.owner.team].push(a);
      this.auras.all.push(a);
    }
  }

  removeAura(a) {
    let index = this.auras.all.indexOf(a);
    ~index && this.auras.all.splice(index, 1);
    if(!this.auras[a.owner.team]) return;
    index = this.auras[a.owner.team].indexOf(a);
    ~index && this.auras.all.splice(index, 1);
  }

  get turn() {
    return this.turns[this.turns.length -1];
  }

  setEvents() {

    var moved = false;
    var attacked = false;
    var mp = 0;
    var actor = null;
    this.inputCanvas.addEventListener('click', (e) => {
      let a = this.currentActor;
      actor = a;
      let x = Math.floor(e.offsetX / this.tw);
      let y = Math.floor(e.offsetY / this.th);
      var t = this.grid.get(x, y);
      let selectionsRequired = a.selectedAbility && a.selectedAbility.stats.selections || 1;
      if(a.selectedAbility && a.selectedAbility.stats.target == 'ground') {
        t = {x, y};
      }
      var targets = this.abilityTargets(a, a.selectedAbility, x, y);

      if(a.selectedAbility && selectionsRequired > 1) {
        if(a.selections[0]) {
          a.selections[1] = targets;
        } else {
          a.selections[0] = targets;
        }
      } else {
        a.selections[0] = targets;
      }
      if(a.selectedAbility && targets.validTargets && a.selections.length == selectionsRequired) {
        this.attack(a, t);
        mp = 0;
        if(this.turn.actions.filter(a => a.ability && a.ability.bio.type == 'active').length >= a.totalStat('apr')) {
          this.endTurn();
          this.act();
        }
      } else
      if(a.canMove) {
        var path = this.grid.path(a.x, a.y, x, y);
        path.shift();
        if(a.movesLeft < path.length) return;
        var walked = path.length - 1;
        this.walk(a, path)
        .then(() => {
          mp -= walked
        });
      }
    })

    var b = document.createElement('button');
    b.textContent = 'End Turn';
    this.endTurnButton = b;
    b.addEventListener('click', () => {
      let a = this.currentActor;
      if(a.ai) return;
      actor = this.currentActor;
      mp = 0;
      this.defend(this.currentActor);
      this.endTurn();
      this.act();
    })
    document.body.appendChild(b);
    var hoverx = 0;
    var hovery = 0;
    var currentPath = [];
    this.inputCanvas.addEventListener('mouseout', (e) => {
      var c = this.effects.getContext('2d');
      c.clearRect(0, 0, this.w * this.tw, this.h * this.th);
    });
    this.inputCanvas.addEventListener('mousemove', (e) => {
      let a = this.currentActor;
      if(!a || a.ai) return;
      let x = Math.floor(e.offsetX / this.tw);
      let y = Math.floor(e.offsetY / this.th);
      if(hoverx == x && hovery == y) return;
      var c = this.effects.getContext('2d');
      hoverx = x;
      hovery = y;

      if(x > this.w -1 || y > this.h -1) return;
      var path = this.grid.path(a.x, a.y, x, y);
      path.shift();
      var m = a.movesLeft;
      var targets = {
        actors: [],
        tiles: path.slice(0, m).map((p, i) => ({x: p[0], y: p[1], i}))
      };
      currentPath = path;

      var t = this.grid.get(x, y);
      var ability = a.selectedAbility;
      if(ability && ability.stats.target == 'ground') {
        t = {x: x, y: y};
      }
      if(ability && ability.stats.target == 'all') {
        t = {x: x, y: y};
      }
      if(t && this.inRange(a, t)) {
        targets = this.abilityTargets(a, ability, x, y);
      }
      this.highlight(targets, x, y);
    })

  }

  abilityTargets(a, ability, x, y) {
    var out = {actors: [], tiles: [], validTargets: false};
    if(!ability) return out;
    if(ability.stats.shape == 'point') {
      out.tiles = [{item: this.grid.get(x, y), x: x, y: y}];
    } else
    if(ability.stats.shape == 'line') {
      out.tiles = this.grid.inLine(a.x, a.y, x, y, ability.stats.radius);
    }
    if(ability.stats.shape == 'cone') {
      out.tiles = this.grid.inCone(a.x, a.y, x, y, ability.stats.radius);
    }
    if(ability.stats.shape == 'circle') {
      out.tiles = this.grid.inRadius(x, y, ability.stats.radius);
    }
    if(ability.stats.shape == 'square') {
      out.tiles = this.grid.around(x, y, ability.stats.radius);
    }

    if(ability.stats.targetFamily == 'self') {
      out.actors = a.x == x && a.y == y ? [a] : out.actors;
    } else
    if(ability.stats.targetFamily == 'allies') {
      out.actors = out.tiles.filter(b => b.item && b.item.team == a.team).map(m => m.item);
    } else
    if(ability.stats.targetFamily == 'enemies') {
      out.actors = out.tiles.filter(b => b.item && b.item.team != a.team).map(m => m.item);
    } else {
      out.actors = out.tiles.filter(b => b.item).map(m => m.item);
    }
    if(ability.stats.target == 'ground' && out.tiles.length && this.grid.squareRadius(a.x, a.y, x, y) <= ability.stats.range) {
      if(!ability.stats.summon || !out.actors.length ) {
        out.validTargets = true;
      }
    } else
    if(out.actors.length) {
      out.validTargets = true;
    }
    return out;
  }

  highlightAbility(x, y, image) {
    var c = this.effects.getContext('2d');
    c.drawImage(image, x * this.tw, y * this.th, this.tw, this.th);
  }

  highlightTile(x, y, i) {
    var c = this.effects.getContext('2d');
    c.strokeStyle = 'rgba(0, 255, 255, 1)';
    c.strokeRect(x * this.tw, y * this.th, this.tw, this.th);
    c.fillStyle = 'green';
    c.fillText(i, 2 + x * this.tw, 12 + y * this.th);
  }

  highlightAuraTile(x, y, team) {
    var c = this.effects.getContext('2d');
    c.fillStyle = this.teamColors[team].aura;
    c.fillRect(x * this.tw, y * this.th, this.tw, this.th);
  }

  highlightAura(a) {
    if(a.stats.shape == 'square') {
      this.grid.around(a.owner.x, a.owner.y, a.stats.radius)
      .forEach(t => this.highlightAuraTile(t.x, t.y, a.owner.team))
    } else
    if(a.stats.shape == 'circle') {
      this.grid.inRadius(a.owner.x, a.owner.y, a.stats.radius)
      .forEach(t => this.highlightAuraTile(t.x, t.y, a.owner.team))
    }
  }

  highlightAuras() {
    [...this.auras.team1, ...this.auras.team2].forEach(a => {
      if(a.stats.shape == 'square') {
        this.grid.around(a.owner.x, a.owner.y, a.stats.radius)
        .forEach(t => this.highlightAuraTile(t.x, t.y, a.owner.team))
      } else
      if(a.stats.shape == 'circle') {
        this.grid.inRadius(a.owner.x, a.owner.y, a.stats.radius)
        .forEach(t => this.highlightAuraTile(t.x, t.y, a.owner.team))
      }
    })
  }

  highlight(targets, x, y) {
    var c = this.effects.getContext('2d');
    c.clearRect(0, 0, this.w * this.tw, this.h * this.th);
    let ability = this.currentActor.selectedAbility;
    targets.tiles.forEach((t, i) => {
      this.highlightTile(t.x, t.y, i+1);
      if(ability && ability.stats.target == 'ground') {
        this.highlightAbility(t.x, t.y, ability.canvas);
      }
    })
    if(ability && ability.stats.target != 'ground') {
      targets.actors.forEach((t, i) => {
        this.highlightAbility(t.x, t.y, ability.canvas);
      })
    }
    let pointerTarget = this.grid.get(x, y);
    let aura = pointerTarget && pointerTarget.hasAura;
    aura && this.highlightAura(aura);
  }


  loadSpriteSheets() {
    var sheets = [];
    var items = this.turnOrder.filter(item => {
      var s = item.bio.sprite.spritesheet;
      if(!~sheets.indexOf(s)) {
        sheets.push(s);
        return item;
      }
    });
    var loads = [];
    items.forEach(item => {
      return loads.push(this.openSpriteSheet(item));
    });
    abilities.forEach(item => {
      return loads.push(this.openSpriteSheet(item));
    })
    return Promise.all(loads)
  }

  openSpriteSheet(item) {
    if(this.images[item.bio.sprite.spritesheet]) {
      return Promise.reolve(this.images[item.bio.sprite.spritesheet]);
    }
    return new Promise((resolve, reject) => {
      var image = new Image();
      image.onload = (e) => {
        this.images[item.bio.sprite.spritesheet] = image;
        resolve(image);
      }
      image.src = item.bio.sprite.spritesheet;

    })
  }

  setTurnOrder() {
    this.turnOrder = [...this.team1, ...this.team2].sort((a, b) => {
      return a.totalStat('initiative') > b.totalStat('initiative') ? -1 : 1;
    })
    return this;
  }

  drawGrid() {
    var canvas = this.board;
    var c = canvas.getContext('2d');
    c.strokeStyle = 'gray';
    this.grid.loop((x, y) => {
      c.beginPath();
      // draw horizontal
      c.moveTo(0, this.th * y);
      c.lineTo(this.w * this.th, this.th * y);
      c.stroke();
      // draw vertical
      c.beginPath();
      c.moveTo(this.tw * x, 0);
      c.lineTo(this.tw * x, this.th * this.h);
      c.stroke();
    })
  }

  drawTerrain() {
    var canvas = this.terrainCanvas;
    var c = canvas.getContext('2d');
    var obstacles = new Terrain(terrains.find(t => t.bio.name == 'Trees'));
    this.terrain.loop((x, y) => {
      let item = this.terrain.get(x, y);
      c.drawImage(item.sprite.canvas, x * this.tw, y * this.th, this.tw, this.th);
      // if(y > 2 && y < 8 && Math.random() < 0.2) {
      //   let sprite = obstacles.sprite;
      //   this.grid.set(x, y, {sprite: sprite, x, y});
      //   c.drawImage(sprite.canvas, x * this.tw, y * this.th, this.tw, this.th);
      // }
    })
  }

  setPositions() {
    var w, h;
    h = 2;
    w = Math.ceil(this.team1.length / h);
    var rangePositions = [
      0,
      this.w -1,
      Math.floor(this.w/2),
      Math.floor(this.w/2) + 1,
      Math.floor(this.w/2) - 1,
      Math.floor(this.w/2) + 2,
      Math.floor(this.w/2) - 2,
      Math.floor(this.w/2) - 3
    ];
    var meleePositions = [
      -1 + Math.floor(this.w/2),
      -1 + Math.floor(this.w/2) + 1,
      -1 + Math.floor(this.w/2) - 1,
      -1 + Math.floor(this.w/2) + 2,
      -1 + Math.floor(this.w/2) - 2,
      -1 + Math.floor(this.w/2) + 3,
      -1 + Math.floor(this.w/2) - 3,
      -1 + Math.floor(this.w/2) + 4,
      -1 + Math.floor(this.w/2) - 4,
      -1 + Math.floor(this.w/2) + 5
    ];
    var rangeCounter = 0;
    var meleeCounter = 0;
    this.team1.forEach((item, i) => {
      if(item.stats.range < 2) {
        let y = 1;
        let x = meleePositions[meleeCounter];
        meleeCounter += 1;
        item.x = x;
        item.y = y;
        this.grid.setItem(item);

      } else {
        let y = 0;
        let x = rangePositions[rangeCounter];
        rangeCounter += 1;
        item.x = x;
        item.y = y;
        this.grid.setItem(item);
      }
    })
    rangeCounter = 0;
    meleeCounter = 0;
    this.team2.forEach((item, i) => {
      if(item.stats.range < 2) {
        let y = this.h -2;
        let x = meleePositions[meleeCounter];
        meleeCounter += 1;
        item.x = x;
        item.y = y;
        this.grid.setItem(item);

      } else {
        let y = this.h - 1;
        let x = rangePositions[rangeCounter];
        rangeCounter += 1;
        item.x = x;
        item.y = y;
        this.grid.setItem(item);
      }
    })
  }

  cacheCanvases() {
    var summonSprite = {x: 224, y: 1504, spritesheet: "DungeonCrawl_ProjectUtumnoTileset.png", w: 32, h: 32};
    abilities.forEach(item => {
      var canvas = document.createElement('canvas');
      canvas.width = this.tw;
      canvas.height = this.th;
      var c = canvas.getContext('2d');
      var sprite = item.bio.sprite;
      var img = this.images[sprite.spritesheet];
      // c.clearRect(item.x * this.tw, item.y * this.th, this.tw, this.th);
      if(item.stats.summon) {
        c.drawImage(img, summonSprite.x, summonSprite.y, summonSprite.w, summonSprite.h, 0, 0, this.tw, this.th);
        c.drawImage(img, sprite.x, sprite.y, sprite.w, sprite.h, 6, 6, this.tw -12, this.th-12);
      } else {
        c.drawImage(img, sprite.x, sprite.y, sprite.w, sprite.h, 0, 0, this.tw, this.th);
      }
      item.canvas = canvas;
    })
    monsters.forEach(item => {
      var canvas = document.createElement('canvas');
      canvas.width = this.tw;
      canvas.height = this.th;
      var c = canvas.getContext('2d');
      var sprite = item.bio.sprite;
      var img = this.images[sprite.spritesheet];
      // c.clearRect(item.x * this.tw, item.y * this.th, this.tw, this.th);
      c.drawImage(img, sprite.x, sprite.y, sprite.w, sprite.h, 0, 0, this.tw, this.th);
      item.canvas = canvas;
    })
    terrains.forEach(terrain => {
      terrain.bio.sprite.forEach(sprite => {
        var canvas = document.createElement('canvas');
        canvas.width = this.tw;
        canvas.height = this.th;
        var c = canvas.getContext('2d');
        var img = this.images[sprite.spritesheet];
        // c.clearRect(item.x * this.tw, item.y * this.th, this.tw, this.th);
        c.drawImage(img, sprite.x, sprite.y, sprite.w, sprite.h, 0, 0, this.tw, this.th);
        sprite.canvas = canvas;

      })
    })
  }

  makeMonsterCards() {
    var style = document.createElement('style');
    style.innerHTML = `
    .card-outer {
      display: inline-block;
      width: 160px;
      height: 200px;
      border-radius: 12px;
      background-color: darkkhaki;
      padding: 8px;
      font-family: Tahoma, monospace;
      font-size: 14px;
      vertical-align: top;
      margin: 2px;
      border: none;
    }
    .card-outer.selected {
      border: 1px solid black;
    }
    .card-outer.dead {
      background-color: brown;
    }
    .card-inner {
      border-radius: 10px;
      border: 1px solid thistle;
      width: 100%;
      height: 100%;
      padding: 4px;
      background-color: beige;
    }

    .card-name {
      padding: 2px 4px;
      background-color: darkkhaki;
      position: relative;
      top: -5px;
      left: -5px;
      border-bottom: 2px solid gray;
      border-right: 1px solid gray;
      font-weight: bold;
      letter-spacing: 0.1em;
    }

    .card-image {
      text-align: center;
    }

    .card-upper, .card-lower {
      height: 50%;
      position: relative;
    }

    .stats-left {
      position: absolute;
      left: -10px;
      width: 24px;
      bottom: -6px;
    }
    .stats-right {
      position: absolute;
      right: -10px;
      width: 24px;
      bottom: -6px;
    }

    .card-stat {
      position: relative;
      min-width: 24px;
      height: 24px;
      border-radius: 8px;
      text-align: center;
      line-height: 20px;
      color: white;
      margin-bottom: -4px;
      border: none;
      cursor: default;
      display: inline-block;
      padding: 2px;
    }
    .card-stat span {
      display: none;
    }
    .card-stat:hover {
      outline: 1px solid black;
    }
    .stats-left .card-stat:hover span {
      display: inline-block;
      position: absolute;
      top: 0px;
      left: 24px;
      background-color: black;
      font-size: 13px;
      padding: 0px 4px;
      border-radius: 4px;
      width: 106px;
      text-align: left;

    }
    .stats-right .card-stat:hover span {
      display: inline-block;
      position: absolute;
      top: 0px;
      right: 24px;
      background-color: black;
      font-size: 13px;
      padding: 0px 4px;
      border-radius: 4px;
      width: 106px;
      text-align: right;

    }
    .health {
      background-color: #c12525;
    }
    .mana {
      background-color: #4039bb;
    }
    .defence, .attack {
      background-color: #8c882c;
    }
    .spell-resistance, .spell-power {
      background-color: #673ab7;
    }
    .movement {
      background-color: #3ba791;
    }
    .damage {
      background-color: #399a2c;
    }

    .card-abilities {
      font-family: Tahoma;
      font-size: 10px;
      padding-left: 16px;
    }
    .card-triggers {

    }
    .card-effects {

    }
    `;
    document.head.appendChild(style);
    this.monsterCards = this.turnOrder.map(item => {
      var health = item.totalStat('health');
      var mana = item.totalStat('mana');
      var defence = item.totalStat('defence');
      var spellResistance = item.totalStat('spellResistance');
      var attack = item.totalStat('attack');
      var spellPower = item.totalStat('spellPower');
      var movement = item.totalStat('movement');
      var damage = item.totalStat('damage');
      var name = item.bio.name;

      var effects = item.activeEffects.map(e => e.ability.bio.name);
      var abilities = item.abilities.map(a => a.bio.name);
      var html = () => `<div
        class='card-outer ${this.currentActor == item ? 'selected' : ''} ${item.alive ? '' : 'dead'}'>
        <div class='card-inner'>
          <div class='card-upper'>
            <div class='card-name'>
              ${name}
            </div>
            <div class='card-image'>
            </div>
          </div>
          <div class='card-lower'>
            <div class='card-abilities'>
              ${abilities.join(', ')}
            </div>
            <div class='stats-left'>
              <div class='card-stat spell-resistance'>
                ${item.totalStat('spellResistance')}
                <span>Spell Resistance</span>
              </div>
              <div class='card-stat defence'>
                ${item.totalStat('defence')}
                <span>Defence</span>
              </div>
              <div class='card-stat mana'>
                ${item.totalMana}/${item.maxMana}
                <span>Mana</span>
              </div>
              <div class='card-stat health'>
                ${item.totalHealth}/${item.maxHealth}
                <span>Health</span>
              </div>
            </div>
            <div class='stats-right'>
              <div class='card-stat spell-power'>
                ${item.totalStat('spellPower')}
                <span>Spell Power</span>
              </div>
              <div class='card-stat attack'>
                ${item.totalStat('attack')}
                <span>Attack</span>
              </div>
              <div class='card-stat movement'>
                ${item.totalStat('movement')}
                <span>Movement</span>
              </div>
              <div class='card-stat damage'>
                ${item.totalStat('damage')}
                <span>Damage</span>
              </div>
            </div>
          </div>
        </div>
      </div>`;

      return {item, html, canvas: item.canvas.clone()};
    })
  }

  drawMonsterCards() {
    var container = document.getElementById('monster-cards');
    container.innerHTML = '';
    this.monsterCards.forEach(c => {
      let card = document.createElement('div');
      card.innerHTML = c.html();
      let canvas = c.canvas;
      let image = card.querySelector('.card-image');
      image.appendChild(canvas);
      container.appendChild(card.firstElementChild);
    })
  }

  playHitAnimation(a, b, ability) {
    var counter = 20;
    var max = counter;
    var c = this.effects.getContext('2d');

    var int = setInterval(() => {
      c.clearRect(a.x * this.tw, a.y * this.th, this.tw, this.th);
      c.clearRect(b.x * this.tw, b.y * this.th, this.tw, this.th);
      counter -= 1;
      if(counter < 1) {
        c.globalAlpha = 1;
        return clearInterval(int);
      }
      c.globalAlpha = counter/max;
      c.fillStyle = `rgb(255, 255, 0)`;
      c.fillRect(a.x * this.tw, a.y * this.th, this.tw, this.th);
      c.fillStyle = `rgb(255, 0, 0)`;
      c.fillRect(b.x * this.tw, b.y * this.th, this.tw, this.th);
      c.drawImage(ability.canvas, b.x * this.tw, b.y * this.th, this.tw, this.th);
    }, 50);
  }

  drawMonsters() {
    var canvas = this.board;
    var c = canvas.getContext('2d');
    this.grid._list().forEach(item => {
      if(!item.bio || !item.bio.sprite) return
      var sprite = item.bio.sprite;
      var img = this.images[sprite.spritesheet];
      if(item == this.currentActor) {
        c.lineWidth = 1;
        c.strokeStyle = this.teamColors[item.team].selected;
        c.strokeRect(item.x * this.tw, item.y * this.th, this.tw, this.th);
      }
      c.lineWidth = 1;
      c.strokeStyle = 'black';
      c.drawImage(item.canvas, item.x * this.tw, item.y * this.th, this.tw, this.th);
      c.font = '16px monospace';
      c.fillStyle = 'black';
      c.fillRect(item.x * this.tw, item.y * this.th - 10 + this.th, 16, 12)
      c.fillStyle = 'red';
      c.strokeStyle = 'blue';
      c.fillText(item.stacks, item.x * this.tw, item.y * this.th + this.th);
    })
  }

  drawActiveEffects() {
    if(!this.currentActor) return;
    var container = document.getElementById('monster-effects');
    container.innerHTML = '';
    var title = document.createElement('p');
    var description = document.createElement('div');
    title.textContent = 'Effects';
    container.appendChild(title);
    this.currentActor.activeEffects.forEach(e => {
      var canvas = document.createElement('canvas');
      canvas.style.cursor = 'pointer';
      let a = e.ability;
      var {w, h} = a.bio.sprite;
      canvas.width = w;
      canvas.height = h;
      var c = canvas.getContext('2d');
      c.drawImage(a.canvas, 0, 0, w, h);

      canvas.addEventListener('click', () => {
        let {source, attribute, element, duration} = a.stats;
        let type = source == 'spell' || source == 'attack' ? `${element} damage` : `${source} - ${attribute}`;
        description.textContent = `${a.bio.name}: ${type} ${e.power} - ${e.rounds}/${duration} rounds`;
      })

      container.appendChild(canvas);
    });
    this.auras.all.forEach(a => {
      var {source, targetFamily, multiplier, radius} = a.stats;
      if(a.owner.team == this.currentActor.team) {
        if(targetFamily == 'enemies') return;
      } else {
        if(targetFamily == 'allies') return;
      }
      var d = this.grid.distance(this.currentActor.x, this.currentActor.y, a.owner.x, a.owner.y);
      if(a.stats.shape == 'square') {
        d -= radius * 0.415;
      }
      if(d > radius) return;
      var canvas = document.createElement('canvas');
      canvas.style.cursor = 'pointer';
      var {w, h} = a.bio.sprite;
      canvas.width = w;
      canvas.height = h;
      var c = canvas.getContext('2d');
      c.drawImage(a.canvas, 0, 0, w, h);
      canvas.addEventListener('click', () => {
        let {source, attribute, element, duration} = a.stats;
        let power = a.roll();
        let type = source == 'spell' || source == 'attack' ? `${element} damage` : `${source} - ${attribute}`;
        description.textContent = `${a.bio.name}: ${type} ${power}`;
      })

      container.appendChild(canvas);
    })
    this.currentActor.passives.forEach(a => {
      var {source, targetFamily, multiplier, radius} = a.stats;
      var canvas = document.createElement('canvas');
      canvas.style.cursor = 'pointer';
      var {w, h} = a.bio.sprite;
      canvas.width = w;
      canvas.height = h;
      var c = canvas.getContext('2d');
      c.drawImage(a.canvas, 0, 0, w, h);
      canvas.addEventListener('click', () => {
        let {source, attribute, element, duration} = a.stats;
        let power = a.roll();
        let type = source == 'spell' || source == 'attack' ? `${element} damage` : `${source} - ${attribute}`;
        description.textContent = `${a.bio.type} | ${source} - ${a.bio.name}: ${type} ${power} | targets ${targetFamily}`;
      })

      container.appendChild(canvas);
    })
    container.appendChild(description);
  }

  drawTriggers() {
    if(!this.currentActor) return;
    var container = document.getElementById('monster-triggers');
    container.innerHTML = '';
    var title = document.createElement('p');
    var description = document.createElement('div');
    title.textContent = 'Triggers';
    container.appendChild(title);
    var setDescription = function(a) {
      let {source, attribute, element, minPower, maxPower, multiplier, resourceCost, resourceType} = a.stats;
      let {activation, type, name} = a.bio;
      let stat = source == 'blessing' || source == 'curse' ? attribute : 'health';
      let parts = [name, type, `${source}/${element}`];
      if(multiplier) parts.push(`(${minPower}-${maxPower}) * ${multiplier}% to ${stat}`);
      parts.push(`Use ${activation}`);
      parts.push(`${resourceCost} ${resourceType}`)
      description.textContent = parts.join(' | ');
    };
    this.currentActor.triggers.forEach(a => {

      var canvas = document.createElement('canvas');
      var {w, h} = a.bio.sprite;
      canvas.width = w;
      canvas.height = h;
      var c = canvas.getContext('2d');
      c.drawImage(a.canvas, 0, 0, w, h);

      canvas.addEventListener('click', () => {
        setDescription(a);
      })

      if(this.currentActor.selectedAbility && a.bio.name == this.currentActor.selectedAbility.bio.name) {
        setDescription(a);
      }

      container.appendChild(canvas);
    });
    container.appendChild(description);
  }

  drawAbilities() {
    if(!this.currentActor) return;
    var container = document.getElementById('monster-abilities');
    container.innerHTML = '';
    var title = document.createElement('p');
    var description = document.createElement('div');
    title.textContent = 'Abilities';
    container.appendChild(title);
    var setDescription = function(a) {
      let {source, attribute, element, minPower,
        maxPower, multiplier, resourceCost, resourceType,
        range
      } = a.stats;
      let {activation, type, name} = a.bio;
      let stat = source == 'blessing' || source == 'curse' ? attribute : 'health';
      let parts = [name, type, `${source}/${element}`];
      if(multiplier) parts.push(`(${minPower}-${maxPower}) * ${multiplier}% to ${stat}`);
      parts.push(`Use ${activation}`);
      parts.push(`${resourceCost} ${resourceType}`)
      parts.push(`range ${range}`)
      description.textContent = parts.join(' | ');
    };
    this.currentActor.activeAbilities.forEach(a => {

      var canvas = document.createElement('canvas');
      var {w, h} = a.bio.sprite;
      canvas.width = w;
      canvas.height = h;
      var c = canvas.getContext('2d');
      c.drawImage(a.canvas, 0, 0, w, h);

      canvas.addEventListener('click', () => {
        if(a.bio.activation == 'when selected') {
          this.currentActor.selectAbility(a);
          this.drawAbilities();
        } else {
          setDescription(a);
        }
      })

      if(this.currentActor.selectedAbility && a.bio.name == this.currentActor.selectedAbility.bio.name) {
        c.strokeRect(0, 0, w, h);
        setDescription(a);
      }

      container.appendChild(canvas);
    });
    container.appendChild(description);
  }

  drawTurnOrder() {
    var canvas = this.order;
    var c = canvas.getContext('2d');
    this.turnOrder.forEach((item, i) => {
      var sprite = item.bio.sprite;
      var img = this.images[sprite.spritesheet];
      // c.clearRect(item.x * this.tw, item.y * this.th, this.tw, this.th);
      c.drawImage(item.canvas, i * this.tw, 0, this.tw, this.th);

    })
  }

  findClosestTarget(p, exclude = []) {
    var t = this.turnOrder.filter(item => {
      return item.team != p.team;
    })
    .sort((a, b) => {
      let d1 = this.grid.distance(a.x, a.y, p.x, p.y);
      let d2 = this.grid.distance(b.x, b.y, p.x, p.y);
      return d1 > d2 ? 1 : -1;
    })[0];
    if(!t) return null;
    var tile = this.findClosestTile(p, t);
    if(!tile) {
      exclude.push(t);
      return this.findClosestTarget(p, exclude);
    }
    return t;
  }

  findWeakestTarget(p, exclude = []) {
    var t = this.turnOrder.filter(item => {
      return item.team != p.team;
    })
    .sort((a, b) => {
      let d1 = a.stats.defence + a.stats.health * (1/this.flanks(a));
      let d2 = b.stats.defence + b.stats.health * (1/this.flanks(b));
      return d1 > d2 ? 1 : -1;
    })[0];
    if(!t) return null;
    var tile = this.findClosestTile(p, t);
    if(!tile) {
      exclude.push(t);
      return this.findWeakestTarget(p, exclude);
    }
    return t;
  }

  findStrongestTarget(p, exclude = []) {
    var t = this.turnOrder.filter(item => {
      return item.team != p.team && !~exclude.indexOf(item);
    })
    .sort((a, b) => {
      let d1 = a.stats.attack + a.stats.minDamage + a.stats.maxDamage;
      let d2 = b.stats.attack + b.stats.minDamage + b.stats.maxDamage;
      return d1 < d2 ? 1 : -1;
    })[0];
    if(!t) return null;
    var tile = this.findClosestTile(p, t);
    if(!tile) {
      exclude.push(t);
      return this.findStrongestTarget(p, exclude);
    }
    return t;
  }

  canWalkTo(a, b) {
    let path = this.grid.path(a.x, a.y, b.x, b.y);
    let length = path.length - 1;
    return length <= a.movesLeft;
  }

  findTarget(a) {
    var weakest = this.findWeakestTarget(a);
    if(weakest && this.canWalkTo(a, this.findClosestTile(a, weakest))) {
      return weakest;
    }
    var strongest = this.findStrongestTarget(a);
    if(strongest && this.canWalkTo(a, this.findClosestTile(a, strongest))) {
      return strongest;
    }
    return this.findClosestTarget(a);
  }

  roll(a, b) {
    return Math.ceil(a + Math.random() * (b-a));
  }

  flanks(b) {
    return this.grid.around(b.x, b.y, 1)
    .filter(m => {
      return m.item && m.item.team != b.team
    }).length;

  }

  defend(a) {
    a.bonusdefence = 2 + (a.canMove ? 1 : 0) * Math.round(8 * (a.movesLeft/a.totalStat('movement')));
  }

  undefend(a) {
    a.bonusdefence = 0;
  }

  pickBestAbility(a, b) {
    return a.activeAbilities[0];
  }

  findTargetsInLine(a, b, ability) {
    return this.grid.inLine(a.x, a.y, b.x, b.y, ability.stats.radius)
    .filter(t => t.item).map(t => t.item);
  }

  isHarmful(b, ability) {
    return (
      (~['force', 'fire', 'water', 'air', 'earth'].indexOf(ability.stats.element))
      ||
      (ability.stats.element == 'vitality' && b.bio.family == 'Undead')
      ||
      (ability.stats.element == 'rot' && b.bio.family != 'Undead')
    )
  }

  trigger(event, target, source, power, ability) {
    if(!target.alive || !target.canTrigger) return;
    target.triggers.forEach(a => {
      if(a.bio.activation != event) return;
      if(!target.canTrigger) return;
      console.log('TRIGGER', event, a.bio.name)
      var t = a.stats.targetFamily == 'self' ? target : source;
      if(a.stats.source == 'attack') {
        t.addEffect(target, a, this.attackRoll(target, source, a), {event, ability}, power);

      } else
      if(a.stats.source == 'spell') {

      }
      this.attack(target, source, a, true, power);
      target.triggerCount += 1;
      // if(a.stats.duration) {
      //   console.log(t.bio.name, 'added effect', a.bio.name)
      // } else {
      //   console.log('TRIGGER', event, a.bio.name);
      //   this.attack(target, source, a, true, power);
      // }
    })
  }

  dealDamage(a, b, d, ability, fromEffect) {
    var c = 'damaged';
    if(this.isHarmful(b, ability)) {
      b.harm(d);
    } else {
      b.heal(d);
      c = 'healed';
    }
    console.log(`${a.bio.name} ${c} ${b.bio.name} ${d} (${ability.stats.element}) with ${ability.bio.name} (${b.totalHealth})`);
    if(!fromEffect) {
      this.trigger('when self is hit', b, a, d, ability);
      this[b.team] && this[b.team].forEach(t => {
        if(t == b) return;
        // allied triggers
        this.trigger('when ally is hit', t, b, d, ability);
        let dist = this.grid.distance(b.x, b.y, t.x, t.y);
        if(dist < 4) {
          this.trigger('when nearby ally is hit', t, b, d, ability);
        }
        if(dist < 2) {
          this.trigger('when adjacent ally is hit', t, b, d, ability);
        }
      })
      this[a.team] && this[a.team].forEach(t => {
        if(t == a) return;
        // enemy triggers
        this.trigger('when enemy is hit', t, b, d, ability);
        let dist = this.grid.distance(b.x, b.y, t.x, t.y);
        if(dist < 4) {
          this.trigger('when nearby enemy is hit', t, b, d, ability);
        }
        if(dist < 2) {
          this.trigger('when adjacent enemy is hit', t, b, d, ability);
        }
      })
    }

    if(!b.alive) this.kill(b);
  }

  attackRoll(a, b, ability) {
    let df = b.totalStat('defence');
    let at = a.totalStat('attack');
    let stacks = a.stacks;
    let bonusDamage = a.totalStat('damage');
    let flanks = this.flanks(b) - 1;
    let flankMultiplier = 1 + (flanks / 5);
    let abilityDamage = ability.roll(bonusDamage);
    let multiplier = (Math.max(1, at) / Math.max(1, 2 + df));
    // console.log('ATTACK ROLL:', 'abilityDamage', abilityDamage, 'stacks', stacks, 'attack vs defence', multiplier, 'flanks', flankMultiplier)
    let d = Math.ceil(abilityDamage * stacks * multiplier * flankMultiplier);
    return d;
  }

  dealAttackDamage(a, b, ability, fromEffect, effectPower) {
    let d = this.attackRoll(a, b, ability);
    if(d) {
      this.dealDamage(a, b, d, ability, fromEffect);
      if(!fromEffect) {
        this.trigger('when attack hits', a, b, d, ability);
      }
    }

    return d;
  }

  dealSpellDamage(a, b, ability, fromEffect, effectPower) {
    let spellResistance = b.totalStat('spellResistance');
    let resistRoll = this.roll(1, 100);
    console.log('resist', resistRoll, 'against spellResistance', spellResistance);
    if(resistRoll < spellResistance) {
      console.log(b.bio.name, 'resisted spell', ability.bio.name);
      return 0;
    }
    let stacks = a.stacks;
    let abilityDamage = effectPower || ability.roll();
    let spellPower = 1 + a.totalStat('spellPower') / 10;
    let d = Math.ceil(abilityDamage * stacks * spellPower);
    console.log('abilityDamage', abilityDamage, 'stacks', stacks, 'spellPower', spellPower);
    if(d) {
      this.dealDamage(a, b, d, ability, fromEffect);
      if(!fromEffect) {
        this.trigger('when attack hits', a, b, d, ability);
      }
    }
    return d;
  }

  dealAttributeDamage(a, b, ability) {
    let abilityMultiplier = ability.stats.multiplier / 100;
    let roll = this.roll(ability.stats.minPower, ability.stats.maxPower);
    let d = Math.ceil(roll * abilityMultiplier);
    return d;
  }

  applyEffects(a) {
    if(!a.alive) return;
    a.activeEffects.forEach(e => {
      var {source} = e.ability.stats;
      if(e.ability.stats.source == 'attack' || e.ability.stats.source == 'spell') {
        this.dealDamage(e.source, a, e.power, e.ability, true);
      }
    })

  }

  attack(a, b, ability, fromEffect) {
    ability = ability || a.selectedAbility;
    var targets = this.abilityTargets(a, ability, b.x, b.y);
    this.turn.actions.push({
      targets: targets,
      ability: ability
    });

    if(!a.canUseAbility(ability)) {
      return;
    }
    a.useAbility(ability);
    if(!ability.stats.summon) {
      targets.actors.forEach((t, i) => {
        var power = 0;
        if(ability.stats.source == 'attack') {
          power = this.dealAttackDamage(a, t, ability, fromEffect);
        }
        if(ability.stats.source == 'spell') {
          power = this.dealSpellDamage(a, t, ability, fromEffect);
        }
        if(ability.stats.source == 'curse') {
          power = this.dealAttributeDamage(a, t, ability, fromEffect);
        }
        if(ability.stats.source == 'blessing') {
          power = this.dealAttributeDamage(a, t, ability, fromEffect);
        }

        this.playHitAnimation(a, t, ability);
        !fromEffect && t.addEffect(a, ability, power);
      });
      !targets.actors.length && targets.tiles.length &&
      !fromEffect && a.addEffect(a, ability, ability.roll(a.totalStat('damage')));
    } else {
      let health = 10 * a.totalStat('spellPower') * ability.roll();
      let template = monsters.find(m => m.bio.name == ability.stats.summon);
      let stacks = Math.min(template.bio.maxStacks, Math.ceil(health / template.stats.health));
      let monster = new Monster(template, stacks, true);
      let tile = a.selections[0].tiles[0];
      monster.team = a.team;
      monster.battle = a.battle;
      monster.ai = a.ai;
      monster.x = tile.x;
      monster.y = tile.y;
      this.grid.setItem(monster);
      this.turnOrder.push(monster);
      this.addAuras(monster);
    }
    this.sounds.attack.play();
  }

  kill(a) {
    this.sounds.death.play();
    var i = this.turnOrder.findIndex(item => item == a);
    // this.turnOrder.splice(i, 1);
    this.grid.remove(a.x,a.y);
    this.render();
    console.log(a.bio.name, 'was killed');
  }

  findClosestTile(p, q) {
    return this.grid.around(q.x, q.y, p.stats.range)
    .filter(t => !t.item)
    .sort((a, b) => {
      let d1 = this.grid.distance(a.x, a.y, p.x, p.y);
      let d2 = this.grid.distance(b.x, b.y, p.x, p.y);
      return d1 > d2 ? 1 : -1;
    })[0];
  }

  inRange(a, b) {
    var d = this.grid.distance(a.x, a.y, b.x, b.y);
    var ability = a.selectedAbility;
    if(!ability) return;
    var range = ability ? ability.stats.range : 1;
    return d <= range + 0.42;
  }

  walk(a, path) {
    return new Promise((resolve, reject) => {
      var int = setInterval(() => {
        let p = path.shift();
        if(!p) {
          clearInterval(int);
          return resolve();
        }
        this.grid.remove(a.x, a.y);
        a.move(p[0], p[1]);
        this.grid.setItem(a);
        this.turn.actions.push({movement: {x: a.x, y: a.y}})
        this.render();
        this.sounds.move.play();
        if(!path.length) {
          clearInterval(int);
          resolve();
        }
      }, 100);

    })
  }

  human(a) {

  }

  startTurn() {
    var a = this.turnOrder.shift();
    var turn = new Turn(a);
    this.turns.push(turn);
    console.log('Turn start for', a.bio.name, a.alive)
    this.currentActor = a;
    this.undefend(a);
    a.selections = [];
    a.triggerCount = 0;
    this.undefend(a);
    a.resetMovement();
    if(!a.canUseAbility(a.selectedAbility)) a.selectAbility(a.selectedAbility);
    this.render();
    this.applyEffects(a);
  }

  endTurn() {
    let a = this.currentActor;
    this.turn.endMovement.x = a.x;
    this.turn.endMovement.y = a.y;
    a.effects.forEach(e => {
      var {source} = e.ability.stats;
      e.rounds += 1;
      if(e.rounds == e.ability.stats.duration) {
        a.removeEffect(e);
      }
    });

    this.turnOrder.push(a);
  }

  act() {
    this.startTurn();
    var a = this.currentActor;
    if(!a.alive) return this.act();
    if(!a.canAct) {
      this.endTurn();
      return this.act();
    }
    if(!a.ai) {
      return this.human(a);
    }
    var t = this.findTarget(a);
    if(!t) {
      this.sounds.victory.play();
      console.log(`${a.team} won the match`);
      return;
    }
    var p = this.findClosestTile(a, t);
    var path = this.grid.path(a.x, a.y, p.x, p.y);
    path.shift();
    path.splice(a.movesLeft);
    var action = this.inRange(a, t) ? Promise.resolve() : this.walk(a, path);
    action.then(() => {
      setTimeout(() => {
        if(this.inRange(a, t)) {
          this.attack(a, t);
        } else {
          var ct = this.findClosestTarget(a);
          if(ct && this.inRange(a, ct)) {
            this.attack(a, ct);
          } else {
            this.defend(a);
          }
        }
        a.alive && this.turnOrder.push(a);
        this.render();
        if(this.turnOrder.length) this.act();

      }, 500)
    })

  }

  createAbilityContainer() {
    var c = document.createElement('div');
    c.id = 'monster-abilities';

    document.body.appendChild(c);
  }

  createMonsterCardContainer() {
    var c = document.createElement('div');
    c.id = 'monster-cards';

    document.body.appendChild(c);
  }
  createTriggerContainer() {
    var c = document.createElement('div');
    c.id = 'monster-triggers';

    document.body.appendChild(c);
  }

  createEffectContainer() {
    var c = document.createElement('div');
    c.id = 'monster-effects';

    document.body.appendChild(c);
  }

  start() {
    this.loadSounds();
    this.setTurnOrder();

    this.createMonsterCardContainer();
    this.createAbilityContainer();
    this.createTriggerContainer();
    this.createEffectContainer();
    this.loadSpriteSheets()
    .then(images => {
      this.cacheCanvases();
      this.makeMonsterCards();
      this.setPositions();
      this.drawTerrain();
      this.render();
      return this.act();
    })
    .catch(e => {
      console.log('error', e)
    });
  }

  clearCanvases() {
    let b = this.board.getContext('2d');
    b.clearRect(0, 0, this.board.width, this.board.height);
    let o = this.order.getContext('2d');
    o.clearRect(0, 0, this.order.width, this.order.height);
  }

  loadSounds() {
    var attack = new Audio();
    attack.src = 'sounds/attack.wav';
    var move = new Audio();
    move.src = 'sounds/move.wav';
    var death = new Audio();
    death.src = 'sounds/death.wav';
    var victory = new Audio();
    victory.src = 'sounds/victory.wav';
    this.sounds = {attack, move, death, victory};
  }

  render() {
    this.clearCanvases();
    // this.drawGrid();
    this.drawMonsters();
    this.drawTurnOrder();
    this.drawMonsterCards();
    this.drawAbilities();
    this.drawTriggers();
    this.drawActiveEffects();
  }
}

module.exports = Battle;
