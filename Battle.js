const PL = require("PositionList2d.js");
const Monster = require("Monster.js");
const MonsterCard = require("MonsterCard.js");
const Terrain = require('Terrain.js');
const Arena = require('Arena.js');
const abilities = require('abilities.js');
const monsters = require('monsters.js');
const terrains = require('terrains.js');
const arenas = require('arenas.js');
class TurnOrder extends Array {
  constructor() {
    super();
    this.currentIndex = 0;
    this.round = 1;
  }

  get first() {
    return this[0];
  }

  get last() {
    return this[this.length -1];
  }

  get current() {
    return this[this.currentIndex];
  }

  next() {
    this.currentIndex += 1;
    if(this.currentIndex > this.length-1) {
      this.currentIndex = 0;
      this.round += 1;
    }
    return this.current;
  }
}

class R extends Array {
  constructor() {
    super();
    this.current = {
      hasActed: [],
      willAct: [],
      waiting: []
    };
    this.next = [];
    this._actor = null;
    this.currentRound = 0;
    this.waited = false;
  }

  get actor() {
    return this._actor || this.current.willAct[0];
  }

  add(actors) {
    var toInsert = [];
    actors.forEach(a => {
      this.current.willAct.find((b, i) => {
        if(a.totalStat('initiative') > b.totalStat('initiative')) {
          toInsert.push({i, a});
          return true;
        }
      })
    })
    toInsert.forEach((a, i) => {
      this.current.willAct.splice(a.i + i, 0, a.a);
    })
    this.push.apply(this, actors);
  }

  wait(actor) {
    if(actor.movesLeft < actor.totalStat('movement')) {
      logger.log(actor.bio.name, 'has already moved');
      return;
    }
    if(~this.current.waiting.indexOf(actor)) {
      logger.log(actor.bio.name, 'has already waited');
      return;
    }
    this.waited = true;
    this.current.waiting.push(this.current.willAct.shift());
    this._actor = this.current.willAct[0];
    return true;
  }

  remove(actor) {
    let index = this.indexOf(actor);
    if(!~index) return;
    this.splice(index, 1);
    index = this.current.willAct.indexOf(actor);
    this.current.willAct.splice(index, 1);
    index = this.current.hasActed.indexOf(actor);
    this.current.hasActed.splice(index, 1);
  }

  extraTurn(a, init, turn) {
    let remainder = init - 20;
    if(remainder < 1) {
      a.initiativeEntropyCounter = 0;
      return false;
    }
    if(remainder - a.initiativeEntropyCounter >= a.initiativeEntropy) {
      a.initiativeEntropyCounter += 20;
      return true;
    } else {
      a.initiativeEntropyCounter -= remainder;
      return false;
    }
  }

  order() {
    this.sort((a, b) => {
      return a.totalStat('initiative') > b.totalStat('initiative') ? -1 : 1;
    });

    this.forEach((a, i) => {
      let init = a.totalStat('initiative');
      let tpr = Math.ceil(init / 20);
      this.current.willAct[i] = a;
      for(let j = 1; j < tpr; j++) {
        if(this.extraTurn(a, init, j)) {
          this.current.willAct[i + j*this.length] = a;
        }
      }
    });
    this.current.willAct = Object.values(this.current.willAct);
    this._actor = this.current.willAct[0];
  }

  initiativeChanged() {
    // units who had their initiative changed
    // might lose or gain extra turns this round
    let actor = this.actor;
    this.current.willAct.sort((a, b) => {
      return a != actor && a.totalStat('initiative') > b.totalStat('initiative') ? -1 : 1;
    });

    let k = [];
    this.current.willAct.forEach((a, i) => {
      let init = a.totalStat('initiative');
      let tpr = Math.ceil(init / 20);
      k[i] = a;
      for(let j = 1; j < tpr; j++) {
        if(this.extraTurn(a, init, j)) {
          k[i + j*this.current.willAct.length] = a;
        }
      }
    });
    this.current.willAct = Object.values(k);

  }

  get round() {
    return [...this.current.willAct, ...Array.from(this.current.waiting).reverse(), ...this.current.hasActed];
  }

  nextRound() {
    this.current.willAct = Array.from(this.current.hasActed);
  }

  nextTurn() {
    if(!this.waited) {
      let index = this.current.willAct.indexOf(this.actor);
      if(~index) {
        this.current.willAct.splice(index, 1);
        this.current.hasActed.push(this.actor);
      } else {
        index = this.current.waiting.indexOf(this.actor);
        this.current.waiting.splice(index, 1);
        this.current.hasActed.push(this.actor);
      }
    } else {

    }
    if(!this.current.willAct.length && !this.current.waiting.length) {
      this.order();
      this.current.hasActed = [];
      this.current.waiting = [];
      this.currentRound += 1;
      logger.log("New Round:", this.currentRound);
    }
    this.waited = false;
    this._actor = this.current.willAct[0] || this.current.waiting[this.current.waiting.length -1];
  }
}

class Round extends Array {
  constructor() {
    super();
    this.current = null;
    this.order = [];
    this.round = 0;
    this.turn = -1;
    this.future = [];
    this.stages = {
      current: {
        hasActed: [],
        willAct: []
      },
      next: []
    }
  }

  add(actors) {
    this.push.apply(this, actors);
    actors.forEach(a => {
      this.order.push({
        count: a.totalStat('initiative'),
        actor: a
      });
    });

    this.resetFuture();
  }

  resetFuture() {
    this.future = [];
    for(let i = 0; i < 500; i++) {
      this.future.push(this._next());
    }
    this.turn = -1;
  }

  next() {
    this.turn += 1;
    return this.future[this.turn];
  }

  _next() {
    this.order.forEach(a => {
      a.count += 20 + a.actor.totalStat('initiative');
    });

    let n;
    this.order.forEach(a => {
      if(!n && a.count > 100) {
        n = a;
      } else
      if(a.count > 100 && a.count > n.count) {
        n = a;
      }
    });

    if(!n) return this._next();
    n.count = 0;
    return n.actor;
  }

}

class Turn {
  constructor(actor) {
    this.actor = actor;
    this.startMovement = {x: actor.x, y: actor.y};
    this.endMovement = {x: 0, y: 0};
    this.actions = [];
  };

  addAction(action) {
    this.actions.push(action);
  }

  get apts() {
    return this.actions.filter(a => a.type == 'use ability').length;
  }

  get action() {
    return this.actions[this.actions.length -1];
  }

  get ability() {
    for(let i = this.actions.length -1; i > 0; i--) {
      let a = this.actions[i];
      if(a && a.type == 'use ability') {
        return this.actor.abilities.find(b => b.id == a.abilityId);
      }
    }
  }

  get isOver() {
    return this.actor.totalStat('apr') <= this.apts ||
    this.actions.find(b => b.type == 'defend') ||
    this.actions.find(b => b.type == 'wait');
  }
}

class Action {
  constructor(type, position, abilityId) {
    this.type = type || 'move';
    this.position = position || {x: 0, y: 0};
    this.abilityId = abilityId || '';
  }
}

class Battle {
  constructor(team1, team2, w, h, tw, th, board, effects) {
    this.mouse = {
      x: 0,
      y: 0
    }
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
        aura: 'rgba(22, 88, 110, 0.5)',
        selected: 'rgba(22, 88, 110, 0.5)'
      },
      team2: {
        aura: 'rgba(110, 22, 33, 0.5)',
        selected: 'rgba(110, 22, 33, 0.5)'
      },
      neutral: {
        aura: 'rgba(110, 110, 22, 0.5)',
        selected: 'rgba(110, 110, 22, 0.5)'
      }
    };
    this.w = w;
    this.h = h;
    this.tw = tw;
    this.th = th;
    this.board = board;
    this.board.width = w * tw;
    this.board.height = h * th;
    this.board.style.zIndex = 1;
    this.effects = effects;
    this.effects.width = w * tw;
    this.effects.height = h * th;
    this.board.style.copyTo(this.effects.style);
    // Object.assign(this.effects.style, this.board.style);
    effects.style.zIndex = this.board.style.zIndex + 1;
    this.inputCanvas = document.createElement('canvas');
    this.inputCanvas.width = this.board.width;
    this.inputCanvas.height = this.board.height;
    this.board.style.copyTo(this.inputCanvas.style);
    this.inputCanvas.style.zIndex = 100;
    this.board.parentNode.appendChild(this.inputCanvas);

    this.hasActed = [];
    this.grid = new PL(w, h);
    this.terrain = new PL(w, h);
    this.terrainCanvas = document.createElement('canvas');
    this.terrainCanvas.width = this.board.width;
    this.terrainCanvas.height = this.board.height;
    this.board.style.copyTo(this.terrainCanvas.style);
    this.board.parentNode.insertBefore(this.terrainCanvas, this.board);
    var terrain = new Terrain(terrains.find(t => t.bio.name == 'Sand Stone'));
    var arena = arenas[0];
    this.arena = new Arena(arena, this.tw, this.th);
    this.grid = this.arena.obstacles;
    // this.terrain.loop((x, y) => {
    //   this.terrain.set(x, y, {sprite: terrain.sprite, x, y});
    // })
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
    this.turnOrder = new Round();
    this.turnOrder.add([...this.team1, ...this.team2]);
    this.tr = new R();
    this.tr.add([...this.team1, ...this.team2]);
    this.tr.order();
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
      if(a.selectedAbility) {
        if(selectionsRequired > 1) {
          if(a.selections[0]) {
            a.selections[1] = targets;
          } else {
            a.selections[0] = targets;
          }
        } else {
          a.selections[0] = targets;
        }
      }
      if(a.selectedAbility && targets.validTargets && a.selections.length == selectionsRequired) {
        let action = new Action('use ability', {x,y}, a.selectedAbility.template.id);
        this.addAction(action)
        .catch(e => {
          console.log('action error', e)
        });
      } else
      if(a.canMove && !this.grid.get(x, y)) {
        let action = new Action('move', {x,y}, a.template.id);
        this.addAction(action)
        .then(() => {
          console.log('walk successful');
        })
        .catch(e => {
          console.log(e)
        });
      }
    })

    var w = document.createElement('button');
    w.textContent = 'Wait';
    this.waitButton = w;
    w.addEventListener('click', () => {
      return this.addAction(new Action('wait'))
      .catch(e => {
        console.log('action error', e)
      });
    });

    var b = document.createElement('button');
    b.textContent = 'End Turn';
    this.endTurnButton = b;
    b.addEventListener('click', () => {
      return this.addAction(new Action('defend'))
      .catch(e => {
        console.log('action error', e)
      });
    });
    window.addEventListener('keyup', (e) => {
      if(e.key != 'e') return;
      return this.addAction(new Action('defend'))
      .catch(e => {
        console.log('action error', e)
      });
    })
    document.body.appendChild(b);
    document.body.appendChild(w);
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
      this.mouse.x = x;
      this.mouse.y = y;
      this.monsterCards.forEach(c => {
        if(!c.cached) return;
        if(c.item == this.grid.get(this.mouse.x, this.mouse.y)) {
          c.hightlightCanvas();
        } else {
          c.unhightlightCanvas();
        }

      })
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

  highlightMonsterCard(x, y) {
    this.monsterCards.forEach(c => {

    })
  }

  abilityTargets(a, ability, x, y) {
    var out = {actors: [], tiles: [], validTargets: false};
    if(!ability) return out;
    if(ability.stats.target == 'actor' && !this.grid.get(x, y)) {
      return out;
    }
    if(ability.stats.range >= this.grid.squareRadius(a.x, a.y, x, y)) {
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
    }
    if(ability.stats.targetFamily == 'self') {
      out.actors = a.x == x && a.y == y ? [a] : out.actors;
    } else
    if(ability.stats.targetFamily == 'allies') {
      out.actors = out.tiles.filter(b => b.item instanceof Monster && b.item.team == a.team).map(m => m.item);
    } else
    if(ability.stats.targetFamily == 'enemies') {
      out.actors = out.tiles.filter(b => b.item instanceof Monster && b.item.team != a.team).map(m => m.item);
    } else {
      out.actors = out.tiles.filter(b => b.item instanceof Monster).map(m => m.item);
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
    var img = this.arena.canvas.composite || this.arena.render();
    c.drawImage(img, 0,0, this.tw*this.w, this.th*this.h);
    return;
    var obstacles = new Terrain(terrains.find(t => t.bio.name == 'Trees'));
    this.terrain.loop((x, y) => {
      let item = this.terrain.get(x, y);
      if(!item) return;
      c.drawImage(item.sprite.canvas, x * this.tw, y * this.th, this.tw, this.th);
    })
  }

  setPositions() {
    var w, h;
    h = 2;
    w = Math.ceil(this.team1.length / h);
    var rangePositions = [
      0,
      this.h -1,
      Math.floor(this.h/2),
      Math.floor(this.h/2) + 1,
      Math.floor(this.h/2) - 1,
      Math.floor(this.h/2) + 2,
      Math.floor(this.h/2) - 2,
      Math.floor(this.h/2) - 3
    ];
    var meleePositions = [
      -1 + Math.floor(this.h/2),
      -1 + Math.floor(this.h/2) + 1,
      -1 + Math.floor(this.h/2) - 1,
      -1 + Math.floor(this.h/2) + 2,
      -1 + Math.floor(this.h/2) - 2,
      -1 + Math.floor(this.h/2) + 3,
      -1 + Math.floor(this.h/2) - 3,
      -1 + Math.floor(this.h/2) + 4,
      -1 + Math.floor(this.h/2) - 4,
      -1 + Math.floor(this.h/2) + 5
    ];
    var rangeCounter = 0;
    var meleeCounter = 0;
    this.team1.forEach((item, i) => {
      if(item.stats.range < 2) {
        let x = 1;
        let y = meleePositions[meleeCounter];
        meleeCounter += 1;
        item.x = x;
        item.y = y;
        this.grid.setItem(item);

      } else {
        let x = 0;
        let y = rangePositions[rangeCounter];
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
        let x = this.w -2;
        let y = meleePositions[meleeCounter];
        meleeCounter += 1;
        item.x = x;
        item.y = y;
        this.grid.setItem(item);

      } else {
        let x = this.h - 1;
        let y = rangePositions[rangeCounter];
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
      var sprite = item.bio.sprite;
      var img = this.images[sprite.spritesheet];
      var left = document.createElement('canvas');
      var right = document.createElement('canvas');
      left.width = right.width = this.tw;
      left.height = right.height = this.th;
      var leftc = left.getContext('2d');
      var rightc = right.getContext('2d');
      leftc.drawImage(img, sprite.x, sprite.y, sprite.w, sprite.h, 0, 0, this.tw, this.th);
      rightc.translate(this.tw, 0)
      rightc.scale(-1, 1);
      rightc.drawImage(left, 0, 0, this.tw, this.th);
      rightc.setTransform(1, 0, 0, 1, 0, 0);
      if(item.bio.orientation == 'right') {
        item.canvas = right;
        item.canvases = [right, left];
      } else {
        item.canvas = left;
        item.canvases = [left, right];
      }
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
    arenas.forEach(arena => {
      arena.ground.items.forEach(sprite => {
        var canvas = document.createElement('canvas');
        canvas.width = this.tw;
        canvas.height = this.th;
        var c = canvas.getContext('2d');
        var img = this.images[sprite.spritesheet];
        // c.clearRect(item.x * this.tw, item.y * this.th, this.tw, this.th);
        c.drawImage(img, sprite.x, sprite.y, sprite.w, sprite.h, 0, 0, this.tw, this.th);
        sprite.canvas = canvas;
      });
      arena.obstacles.items.forEach(sprite => {
        if(!sprite) return;
        var canvas = document.createElement('canvas');
        canvas.width = this.tw;
        canvas.height = this.th;
        var c = canvas.getContext('2d');
        var img = this.images[sprite.spritesheet];
        // c.clearRect(item.x * this.tw, item.y * this.th, this.tw, this.th);
        c.drawImage(img, sprite.x, sprite.y, sprite.w, sprite.h, 0, 0, this.tw, this.th);
        sprite.canvas = canvas;
      });
    })
  }

  makeMonsterCards() {
    this.monsterCards = this.tr.round.map(item => {
      return new MonsterCard(item);
    })
  }

  drawMonsterCards() {
    var container = document.getElementById('monster-cards');
    Object.assign(container.style, {
      position: 'relative'
    })
    container.innerHTML = '';
    let toggle = document.createElement('div');
    Object.assign(toggle.style, {
      position: 'relative',
      display: 'inline-block',
      marginLeft: '-45px',
      top: '0px',
      width: '45px',
      height: '45px'
    });
    toggle.textContent = this.tr.currentRound + 1;
    container.appendChild(toggle);
    let divider = document.createElement('div');
    Object.assign(divider.style, {
      height: '45px',
      width: '4px',
      display: 'inline-block',
      backgroundColor: 'yellow'
    })

    this.monsterCards.forEach(c => c.render(container));
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
        let o = 4;
        c.lineWidth = o;
        c.strokeStyle = this.teamColors[item.team].selected;
        c.strokeRect(item.x * this.tw - o, item.y * this.th - o, this.tw + o*1.5, this.th + o*1.5);
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

  drawEffectStats(e, tag) {
    let a = e.ability;
    let {source, attribute, element, minPower,
      maxPower, multiplier, resourceCost, resourceType,
      range, effect, duration
    } = a.stats;
    let {activation, type, name} = a.bio;
    let stat = source == 'blessing' || source == 'curse' ? attribute : 'health';
    attribute = source == 'spell' || source == 'attack' ? 'health' : attribute;
    let time = type == 'passive' ? 'permanent' : `${e.rounds}/${duration} rounds`;
    var text = `<span class='bold'>Name</span>: ${name}
    <span class='bold'>Source</span>: ${source}
    <span class='bold'>Element</span>: ${element}
    <span class='bold'>Duration</span>: ${time}
    <span class='bold'>Effect</span>: ${e.power} to ${attribute}`;

    tag.innerHTML = text;
  }

  drawActiveEffects() {
    if(!this.currentActor) return;
    var container = document.getElementById('monster-effects');
    container.innerHTML = '';
    var dcontainer = document.getElementById('ability-book-right');
    dcontainer.innerHTML = '';
    var title = document.createElement('p');
    var descriptionTag = document.createElement('div');
    title.textContent = 'Effects';
    container.appendChild(title);
    this.currentActor.activeEffects.forEach(e => {
      let a = e.ability;
      var canvas = a.canvas.clone(32, 32, {cursor: 'pointer'});

      canvas.addEventListener('click', () => {
        dcontainer.innerHTML = '';
        dcontainer.appendChild(descriptionTag);
        this.drawEffectStats(e, descriptionTag);
      })

      container.appendChild(canvas);
    });
    this.auras.all.forEach(a => {
      if(!a.owner.alive) return;
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
      var canvas = a.canvas.clone(32, 32, {cursor: 'pointer'});
      canvas.addEventListener('click', () => {
        dcontainer.innerHTML = '';
        dcontainer.appendChild(descriptionTag);
        this.drawEffectStats({ability: a, power: a.power}, descriptionTag);
      })

      container.appendChild(canvas);
    })
    this.currentActor.passives.forEach(a => {
      var {source, targetFamily, multiplier, radius} = a.stats;
      var {type, activation, condition} = a.bio;
      if(targetFamily != 'self') return;
      if(!a.owner.abilityConditionMet(a)) return;
      var canvas = a.canvas.clone(32, 32, {cursor: 'pointer'});
      canvas.addEventListener('click', () => {
        dcontainer.innerHTML = '';
        dcontainer.appendChild(descriptionTag);
        this.drawEffectStats({ability: a, power: a.power}, descriptionTag);
      })

      container.appendChild(canvas);
    })
    container.appendChild(descriptionTag);
  }

  drawAbilityStats(a, tag) {
    let {source, attribute, element, minPower, shape, radius,
      maxPower, multiplier, resourceCost, resourceType,
      range, effect, duration, target, targetFamily, stacks
    } = a.stats;
    let {activation, type, name, description} = a.bio;
    let stat = source == 'blessing' || source == 'curse' ? attribute : 'health';
    var text = `<span class='bold'>Name</span>: ${name}
    <span class='bold'>Targets</span>: ${target}/${targetFamily}
    <span class='bold'>Activates</span>: ${activation}
    <span class='bold'>Shape</span>: ${shape}
    <span class='bold'>Radius</span>: ${radius}
    <span class='bold'>Source</span>: ${source}
    <span class='bold'>Element</span>: ${element}
    <span class='bold'>Cost</span>: ${resourceCost} ${resourceType}
    <span class='bold'>Range</span>: ${range}`;
    let time = duration ? ` for ${duration} rounds` : '';
    if(multiplier) {
      text += `\n<span class='bold'>Effects</span>: (${minPower}-${maxPower}) * ${multiplier}% to ${stat}${time} (max stacks: ${stacks})`;
      if(effect) {
        let {source, attribute, minPower, maxPower, multiplier, duration, stacks} = effect.stats;
        let stat = source == 'blessing' || source == 'curse' ? attribute : 'health';
        let time = duration ? ` for ${duration} rounds` : '';
        text += `, (${minPower}-${maxPower}) * ${multiplier}% to ${stat}${time} (max stacks: ${stacks})`;
      }

    }
    text += `\n\n${description}`;
    tag.innerHTML = text;
  }

  drawTriggers() {
    if(!this.currentActor) return;
    var container = document.getElementById('monster-triggers');
    container.innerHTML = '';
    var dcontainer = document.getElementById('ability-book-right');
    dcontainer.innerHTML = '';
    var title = document.createElement('p');
    var descriptionTag = document.createElement('div');
    title.textContent = 'Triggers';
    container.appendChild(title);
    this.currentActor.triggers.forEach(a => {

      var canvas = document.createElement('canvas');
      var {w, h} = a.bio.sprite;
      canvas.width = w;
      canvas.height = h;
      var c = canvas.getContext('2d');
      c.drawImage(a.canvas, 0, 0, w, h);

      canvas.addEventListener('click', () => {
        dcontainer.innerHTML = '';
        dcontainer.appendChild(descriptionTag);
        this.drawAbilityStats(a, descriptionTag);
      })

      container.appendChild(canvas);
    });
    dcontainer.appendChild(descriptionTag);
  }

  drawAbilities() {
    if(!this.currentActor) return;
    var container = document.getElementById('monster-abilities');
    var dcontainer = document.getElementById('ability-book-right');
    dcontainer.innerHTML = '';
    container.innerHTML = '';
    var title = document.createElement('p');
    var descriptionTag = document.createElement('div');
    title.textContent = 'Abilities';
    container.appendChild(title);
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
          this.drawAbilityStats(a, descriptionTag);
        }
      })

      if(this.currentActor.selectedAbility && a.bio.name == this.currentActor.selectedAbility.bio.name) {
        c.strokeRect(0, 0, w, h);
        this.drawAbilityStats(a, descriptionTag);
      }

      container.appendChild(canvas);
    });
    dcontainer.appendChild(descriptionTag);
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
    return Math.ceil(a + _random('battle roll') * (b-a));
  }

  flanks(b) {
    console.log(b.team)
    return this.grid.around(b.x, b.y, 1)
    .filter(m => {
      console.log(m.item && m.item.team)
      return m.item instanceof Monster && m.item.team != b.team
    }).length;

  }

  wait(a) {
    let canWait = this.tr.wait(a);
    this.makeMonsterCards();
    return canWait;
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
      console.log('TRIGGER', event, a.bio.name, ability)
      var t = a.stats.targetFamily == 'self' ? target : source;
      this.useAbility(target, t, a, true, power);
      target.triggerCount += 1;
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
    logger.log(`${a.bio.name} ${c} ${b.bio.name} ${d} (${ability.stats.element}) with ${ability.bio.name} (${b.totalHealth})`, a.totalStat('attack'), 'vs', b.totalStat('defence'));
    if(!b.alive) logger.log(b.bio.name, 'died!');
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
    let multiplier = 1 + Math.max(-0.9, ((Math.max(1, at) - Math.max(1, df)) / 10));
    // logger.log('ATTACK ROLL:', 'abilityDamage', abilityDamage, 'stacks', stacks, 'attack vs defence', multiplier, 'flanks', flankMultiplier)
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

  spellRoll(a, b, ability, fromEffect, effectPower) {
    let spellResistance = b.totalStat('spellResistance');
    let resistRoll = this.roll(1, 100);
    if(resistRoll < spellResistance) {
      logger.log(b.bio.name, 'resisted spell', ability.bio.name);
      return 0;
    }
    let stacks = a.stacks;
    let bonusDamage = a.totalStat("damage");
    let abilityDamage = effectPower || ability.roll(bonusDamage);
    let spellPower = 1 + a.totalStat('spellPower') / 10;
    let d = Math.ceil(abilityDamage * stacks * spellPower);
    return d;
  }

  dealSpellDamage(a, b, ability, fromEffect, effectPower) {
    let d = this.spellRoll(a, b, ability, fromEffect, effectPower);
    if(d) {
      this.dealDamage(a, b, d, ability, fromEffect);
      if(!fromEffect) {
        this.trigger('when spell hits', a, b, d, ability);
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
        console.log('apply effect', e)
        this.dealDamage(e.source, a, e.power, e.ability, true);
      }
    })

    a.passives.forEach(ab => {
      if(!(ab.stats.source == 'attack' || ab.stats.source == 'spell')) return;
      if(ab.stats.targetFamily == 'self') {
        this.dealDamage(a, a, ab.power, ab, true);
      } else
      if(ab.stats.targetFamily == 'enemies') {
        this.useAbility(a, a, ab, true);
      }
    })

  }

  initiativeChanged(where) {
    this.tr.initiativeChanged();
    this.makeMonsterCards();
    logger.log('Initiative changed', where);
  }

  createAction(o) {
    return new Action(o.type, o.position, o.abilityId);
  }

  addAction(action, fromOutside) {
    if(this.onAction && !fromOutside) {
      this.onAction(action, this.currentActor.team);

      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {

      var {position, abilityId, type} = action;
      let actor = this.currentActor;
      let p;
      if(type == 'wait') {
        let canWait = this.wait(actor)
        if(canWait) {
          p = Promise.resolve();

        } else {
          reject("Cannot wait");
        }

      } else
      if(type == 'defend') {
        this.defend(actor);
        p = Promise.resolve();
      } else
      if(type == 'move') {
        let path = this.grid.path(actor.x, actor.y, position.x, position.y);
        path.shift();
        if(actor.movesLeft < path.length) return reject("Invalid move");
        p = this.walk(actor, path);
      } else
      if(type == 'use ability') {
        let ability = actor.abilities.find(a => a.template.id == abilityId);
        if(!ability) {
          return reject("Invalid ability")
        }
        p = this.useAbility(actor, position, ability);
      } else {
        p = Promise.resolve();
      }

      p.then(() => {
        this.turn.addAction(action);
        if(this.turn.isOver) {
          this.endTurn();
          this.act();
        }
        resolve();
      })
      .catch(reject);
    })
  }

  useAbility(a, b, ability, fromEffect) {
    a.setOrientation(b.x);
    return new Promise((resolve, reject) => {
      ability = ability || a.selectedAbility;
      var targets = this.abilityTargets(a, ability, b.x, b.y);

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
          t.addEffect(a, ability, power);
          if(ability.stats.special != 'giveEffectAsAbility' && ability.stats.effect) {
            this.useAbility(a, t, ability.stats.effect, true);
          }
        });
        !targets.actors.length && targets.tiles.length &&
        !fromEffect && a.addEffect(a, ability, ability.roll(a.totalStat('damage')));
        if(ability.stats.attribute == 'initiative') {
          this.initiativeChanged('useAbility');
        }
      } else {
        let tile = a.selections[0].tiles[0];
        let template = monsters.find(m => m.bio.name == ability.stats.summon);
        this.summon(a, ability, template, tile);
      }
      this.sounds.attack.play();
      resolve();
    })
  }

  summon(a, ability, template, tile) {
    let health = a.stacks * (10 + 10 * a.totalStat('spellPower'));
    let stacks = Math.min(template.bio.maxStacks, Math.ceil(health / template.stats.health));
    let monster = new Monster(template, 1, true);
    monster.addStack(stacks -1);
    monster.harm(health % template.stats.health);
    monster.team = a.team;
    monster.battle = a.battle;
    monster.ai = a.ai;
    monster.x = tile.x;
    monster.y = tile.y;
    this.grid.setItem(monster);
    this.tr.add([monster]);
    this.addAuras(monster);
    logger.log(a.bio.name, 'summoned', monster.bio.name)
    return monster;
  }

  kill(a) {
    this.sounds.death.play();
    // var i = this.turnOrder.findIndex(item => item == a);
    // this.turnOrder.splice(i, 1);
    this.tr.remove(a);
    this.grid.remove(a.x,a.y);
    this.render();
    logger.log(a.bio.name, 'was killed');
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
    var a = this.tr.actor;
    this.currentActor = a;
    var turn = new Turn(a);
    this.turns.push(turn);
    logger.log('Turn start for', a.bio.name);
    this.undefend(a);
    a.selections = [];
    a.triggerCount = 0;
    this.undefend(a);
    a.resetMovement();
    a.selectAbility(null);
    this.applyEffects(a);
    this.render();
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
    logger.log('Turn end for', a.bio.name);
    let currentRound = this.tr.currentRound;
    this.tr.nextTurn();
    this.makeMonsterCards();
  }

  act() {
    this.startTurn();
    var a = this.currentActor;
    if(!a.alive) {
      console.log(a.bio.name, 'is not alive');
      this.kill(a);
      this.endTurn();
      return this.act();
    }
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
      logger.log(`${a.team} won the match`);
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
          this.useAbility(a, t);
        } else {
          var ct = this.findClosestTarget(a);
          if(ct && this.inRange(a, ct)) {
            this.useAbility(a, ct);
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

  dragndrop(container) {
    var sx = 0;
    var sy = 0;
    var ox = 0;
    var oy = 0;
    var state = 'up';
    container.addEventListener('mousedown', (e) => {
      sx = e.screenX;
      sy = e.screenY;
      ox = e.offsetX;
      oy = e.offsetY;
      state = 'down';
    });
    window.addEventListener('mousemove', (e) => {
      if(e.target != container) return;
      if(state != 'down') return;
      var x = e.x;
      var y = e.y;
      container.style.left = x - ox + 'px';
      container.style.top = y - oy + 'px';
    });
    container.addEventListener('mouseup', (e) => {
      state = 'up';
    });
  }

  createOuterAbilitiesContainer() {
    var c = document.createElement('div');
    this.dragndrop(c);
    c.id = 'outer-abilities';
    Object.assign(c.style, {
      width: '700px',
      height: '400px',
      position: 'fixed',
      top: '0px',
      left: '0px',
      whiteSpace: 'pre-line',
      overflowY: 'auto',
      backgroundImage: 'url(spellbookForFlare.png)',
      backgroundSize: 'contain',
      backgroundRepeat: 'no-repeat',
      padding: '20px 100px',
      zIndex: 100
    })
    var left = document.createElement('div');
    left.id = 'ability-book-left';
    var right = document.createElement('div');
    right.id = 'ability-book-right';
    Object.assign(left.style, Battle.bookContainerStyle);
    Object.assign(right.style, Battle.bookContainerStyle, {
      verticalAlign: 'top',
      padding: '20px 25px',
      height: '280px'
    });
    c.appendChild(left);
    c.appendChild(right);
    document.body.appendChild(c);
  }

  static get bookContainerStyle() {
    return {
      display: 'inline-block',
      width: '50%'
    }
  }

  createMonsterCardContainer() {
    var c = document.createElement('div');
    c.id = 'monster-cards';

    document.body.appendChild(c);
  }

  createAbilityContainer() {
    var o = document.getElementById('ability-book-left');
    var c = document.createElement('div');
    c.id = 'monster-abilities';
    o.appendChild(c);
  }

  createTriggerContainer() {
    var o = document.getElementById('ability-book-left');
    var c = document.createElement('div');
    c.id = 'monster-triggers';
    o.appendChild(c);
  }

  createEffectContainer() {
    var o = document.getElementById('ability-book-left');
    var c = document.createElement('div');
    c.id = 'monster-effects';
    o.appendChild(c);
  }

  start() {
    logger.minimized = false;
    logger.redraw();
    this.loadSounds();
    // this.setTurnOrder();

    this.createMonsterCardContainer();
    this.createOuterAbilitiesContainer();
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
    this.drawMonsterCards();
    this.drawAbilities();
    this.drawTriggers();
    this.drawActiveEffects();
  }
}

module.exports = Battle;
