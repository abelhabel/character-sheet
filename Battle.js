const PL = require("PositionList2d.js");
const Monster = require("Monster.js");
const MonsterCard = require("MonsterCard.js");
const Terrain = require('Terrain.js');
const Arena = require('Arena.js');
const Animation = require('Animation.js');
const Sprite = require('Sprite.js');
const CompositeSprite = require('CompositeSprite.js');
const Canvas = require('Canvas.js');
const BattleResult = require('BattleResult.js');
const BattleMenu = require('BattleMenu.js');
const UnitPlacement = require('UnitPlacement.js');
const Component = require('Component.js');
const SoundPlayer = require('SoundPlayer.js');
const specialEffects = require('special-effects.js');
const abilities = require('abilities.js');
const monsters = require('monsters.js');
const terrains = require('terrains.js');
const arenas = require('arenas.js');
const icons = require('icons.js');
const animations = require('animations.js');
const elements = require('elements.js');
const soundNames = require('sounds.js');
const guid = require('guid.js');

const hitAnimationTemplate = animations.find(a => a.id == '1e5eaf56-808d-980a-5e48-c6b2de6844e2');
const bloodTemplate = icons.find(i => i.id == 'b4987d53-02d6-06b6-e0f8-79d896bf3860');
const hitBackgroundTemplate = icons.find(i => i.id == 'c9215451-5896-1ea0-4e9e-1f9a575a7ff3');
class AnimationPlayer {
  constructor(canvas) {
    this.canvas = canvas;
    this.animations = [];
    this.paused = false;
  }

  add(animation) {
    this.animations.push(animation);
    return new Promise((resolve, reject) => {
      animation.on('end', () => {
        animation.ended = true;
        this.remove(animation.id);
        resolve();
      });
    })
  }

  remove(animationId) {
    let index = this.animations.findIndex(a => a.id == animationId);
    this.animations.splice(index, 1);
  }

  loop() {
    this.render();
    this.paused || window.requestAnimationFrame(() => this.loop());
  }

  render() {
    let {w, h} = this.canvas;
    this.canvas.clear();
    this.animations.forEach(a => {
      a.move();
      a.draw(this.canvas);
    })
  }

}

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
  constructor(battle) {
    super();
    this.battle = battle;
    this.current = {
      hasActed: [],
      willAct: [],
      waiting: []
    };
    this.next = [];
    this._actor = null;
    this.currentRound = 0;
    this.waited = false;
    this.cardSize = 'big';
    this.component = new Component();
    this.scrollIndex = -1;
  }

  get actor() {
    return this._actor || this.current.willAct[0];
  }

  add(actors) {
    let ca = this.actor;
    this.push.apply(this, actors);
    this.current.willAct.push.apply(this.current.willAct, actors);
    this.current.willAct.sort((a, b) => {
      if(a == ca) return -1;
      if(b == ca) return 1;
      if(a.totalStat('initiative') == b.totalStat('initiative')) {
        if(a.bio.name != b.bio.name) {
          if(a.team != b.team) {
            return a.team < b.team ? -1 : 1;
          } else {
            return a.bio.name < b.bio.name ? -1 : 1;
          }
        } else {
          if(a.team != b.team) {
            return a.team < b.team ? -1 : 1;
          } else {
            return 0;
          }
        }
      }
      return a.totalStat('initiative') > b.totalStat('initiative') ? -1 : 1;
    });
  }

  didWait(a) {
    return this.current.waiting.find(b => b.id == a.id);
  }

  canWait(actor) {
    if(actor.movesLeft < actor.totalStat('movement')) {
      return;
    }
    if(~this.current.waiting.indexOf(actor)) {
      return;
    }
    return true;
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
    if(~index) this.current.willAct.splice(index, 1);
    index = this.current.hasActed.indexOf(actor);
    if(~index) this.current.hasActed.splice(index, 1);
    index = this.current.waiting.indexOf(actor);
    if(~index) this.current.waiting.splice(index, 1);
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
      this.nextRound();
    }
    this.waited = false;
    this._actor = this.current.willAct[0] || this.current.waiting[this.current.waiting.length -1];
  }

  init() {
    let c = this.component;
    c.addInner({id: 'monster-cards'});
    let style = html`<style>
      #monster-cards {
        position: absolute;
        display: inline-block;
        left: 0px;
        bottom: 0px;
        background-image: url(sheet_of_old_paper_horizontal.png);
        border: 5px solid rgba(0,0,0,0.2);
        outline: 1px solid rgba(0,0,0,0.2);
        outline-offset: -4px;
        border-radius: 3px;
        width: 60%;
        overflow: hidden;
        height: 235px;
      }

      .toggle-control {
        position: absolute;
        z-index: 1;
        display: inline-block;
        padding: 10px;
        border: none;
        font-size: 18px;
        font-weight: bold;
        margin: 4px;
        box-shadow: 0px 2px 4px -1px rgba(0,0,0,0.5);
        border-radius: 4px;
        background-color: rgba(0,0,0,0);
        cursor: inherit;
        background: url(sheet_of_old_paper_horizontal.png);
        text-align: left;
        user-select: none;
        max-width: 174px;
      }
      .toggle-button {
        position: relative;
        display: inline-block;
        padding: 10px;
        border: none;
        font-size: 20px;
        font-weight: bold;
        margin: 4px;
        box-shadow: 0px 2px 4px -1px rgba(0,0,0,0.5);
        border-radius: 4px;
        background-color: rgba(0,0,0,0);
        cursor: inherit;
        text-align: left;
      }
      .toggle-button:hover {
        background-color: rgba(0,0,0,0.1);
      }
      #cards {
        display: inline-block;
        margin-left: 200px;
      }
      #next, #prev {
        position: absolute;
        width: 32px;
        height: 32px;
        top: 82px;
        z-index: 2;
        transform: rotate(-45deg);
      }
      #next {
        border-bottom: 10px solid black;
        border-right: 10px solid black;
        right: 25px;
      }
      #prev {
        border-top: 10px solid black;
        border-left: 10px solid black;
        right: 57px;
      }
      #next:hover, #prev:hover {
        border-color: grey;
      }
      ${MonsterCard.style}
    </style>`;
    c.addStyle(style);
    this.battle.container.appendChild(c.tags.outer);
  }

  render(battle) {
    let inner = this.component.inner;
    inner.innerHTML = '';
    let round = battle.tr.currentRound + 1;
    let teamName = battle.currentTeamName;
    let actor = battle.currentActor ? battle.currentActor.bio.name : '';
    let tag = html`<div>
      <div class='toggle-control'>
        <div class='toggle-button'>
          Change Size
        </div>
        <div>
          Round: ${round}<br>
          Team: ${teamName}<br>
          Actor: ${actor}
        </div>
      </div>
      <div id='next'></div>
      <div id='prev'></div>
      <div id='cards'></div>
    </div>
    `;
    this.battle.addDOMEvent(tag.querySelector('.toggle-button'), 'click', e => {
      this.cardSize = this.cardSize == 'small' ? 'big' : 'small';
      this.render(battle);
    });
    this.battle.addDOMEvent(tag.querySelector('#next'), 'click', e => {
      this.scrollIndex = Math.min(this.battle.monsterCards.length - 3, this.scrollIndex + 1);
      this.render(battle);
    })
    this.battle.addDOMEvent(tag.querySelector('#prev'), 'click', e => {
      this.scrollIndex = Math.max(-1, this.scrollIndex - 1);
      this.render(battle);
    })
    battle.monsterCards.forEach((c, i) => {
      if(i <= this.scrollIndex) return;
      c.state = this.cardSize;
      c.render(tag.querySelector('#cards'));
    });
    inner.appendChild(tag);
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
  constructor(type, positions, abilityId) {
    this.type = type || 'move'; // move, defende, wait, surrender, use ability
    this.positions = positions || [{x: 0, y: 0}];
    this.abilityId = abilityId || '';
  }
}

class Battle {
  constructor(team1, team2, tw, th, container, arena, mode) {
    this.DOMEvents = [];
    this.container = container;
    this.mode = mode || 'standard';
    this.mouse = {
      x: 0,
      y: 0
    };
    this.originalTeam1 = team1;
    this.originalTeam2 = team2;
    this.team1 = [];
    this.team2 = [];
    this.teamColors = {
      team1: {
        aura: 'rgba(22, 88, 110, 0.5)',
        selected: 'rgba(22, 88, 110, 1)'
      },
      team2: {
        aura: 'rgba(110, 22, 33, 0.5)',
        selected: 'rgba(110, 22, 33, 1)'
      },
      neutral: {
        aura: 'rgba(110, 110, 22, 0.5)',
        selected: 'rgba(110, 110, 22, 1)'
      }
    };
    arena = arena || arenas[1];
    this.arena = new Arena(arena, tw, th);
    this.grid = this.arena.obstacles;
    this.w = this.arena.w;
    this.h = this.arena.h;
    this.tw = tw;
    this.th = th;
    this.createCanvases();
    this.ap = new AnimationPlayer(this.animationCanvas);
    this.ap.loop();
    this.sp = new SoundPlayer();
    this.hasActed = [];
    this.terrain = new PL(this.w, this.h);
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
    this.tr = new R(this);
    if(this.mode == 'standard') {
      this.assembleTeams();
    } else
    if(this.mode == 'portal') {
      this.setupPortals();
    }
    [...this.team1, ...this.team2].forEach(m => this.addAuras(m))
    this.tr.add([...this.team1, ...this.team2]);
    this.tr.order();
    this.br = new BattleResult();
    this.csPopup = this.popup();
    this.setEvents();
  }

  static create(o) {
    var arena = o.arena || arenas[1];
    let b = new Battle(o.team1, o.team2, o.tw, o.th, o.container, arena);
  }

  static fromMatch(m) {
    let b = new Battle(
      m.team1.team,
      m.team2.team,
      42,
      42,
      m.gameui.container,
      m.arena.arena,
      m.settings.settings.mode
    );
    let actor1 = m.team1.actor.match(/AI - level (\d)/);
    let actor2 = m.team2.actor.match(/AI - level (\d)/);
    if(actor1) {
      console.log('actor 1 ai', actor1[1])
      b.team1.forEach(u => u.addAI(parseInt(actor1[1])));
    }
    if(actor2) {
      b.team2.forEach(u => u.addAI(parseInt(actor2[1])));
    }
    return b;
  }

  setupPortals() {
    this.originalTeam1.addPortal(0, 0);
    this.originalTeam2.addPortal(this.w-1, this.h-1);
    let p1 = this.originalTeam1.portal.monster;
    p1.team = 'team1';
    let p2 = this.originalTeam2.portal.monster;
    p2.team = 'team2';
    this.addMonster(p1);
    this.addMonster(p2);
  }

  assembleTeams() {
    this.originalTeam1.units.forEach(u => {
      let tpl = monsters.find(tpl => tpl.id == u.templateId);
      let m = new Monster(tpl, u.stacks, false, u.suuid);
      if(u.abilities && u.abilities.length) {
        u.abilities.forEach(a => m.addAbility(a));
      }
      m.team = 'team1';
      m.battle = this;
      this.team1.push(m);
    });

    this.originalTeam2.units.forEach(u => {
      let tpl = monsters.find(tpl => tpl.id == u.templateId);
      let m = new Monster(tpl, u.stacks, false, u.suuid);
      m.team = 'team2';
      m.battle = this;
      this.team2.push(m);
    });

    this.setPositions();

    this.originalTeam1.units.forEach(u => {
      let m = this.team1.find(m => m.suuid == u.suuid);
      if(typeof u.x == 'number' && typeof u.y == 'number') {
        let currentMonster = this.grid.get(m.x, m.y);
        if(currentMonster && currentMonster.suuid == u.suuid) {
          this.grid.remove(m.x, m.y);
        }
        m.x = Number(u.x);
        m.y = Number(u.y);
        this.grid.setItem(m);
      }
    })

    this.originalTeam2.units.forEach(u => {
      let m = this.team2.find(m => m.suuid == u.suuid);
      if(typeof u.x == 'number' && typeof u.y == 'number') {
        let currentMonster = this.grid.get(m.x, m.y);
        if(currentMonster && currentMonster.suuid == u.suuid) {
          this.grid.remove(m.x, m.y);
        }
        m.x = Number(u.x);
        m.y = Number(u.y);
        this.grid.setItem(m);
      }
    })

  }

  isFarWay(a, b) {
    return this.grid.steps(a.x, a.y, b.x, b.y) > 5;
  }

  getEnemyTeam(team) {
    if(team == 'team1') return this.team2;
    return this.team1;
  }

  get currentTeam() {
    if(this.currentActor.team == 'team1') return this.originalTeam1;
    return this.originalTeam2;
  }

  createCanvases() {
    let {w, h, tw, th} = this;
    var board = document.createElement('canvas');
    var effects = document.createElement('canvas');
    var container = html`<section id='battle-canvas' style='width: ${w*tw}px;height: ${h*th}px;'></section>`;
    board.id = 'board';
    effects.id = 'effects';
    board.style.zIndex = 1;
    effects.style.zIndex = 2;
    container.appendChild(effects);
    container.appendChild(board);
    this.board = board;
    this.board.width = this.w * this.tw;
    this.board.height = this.h * this.th;
    this.board.style.zIndex = 1;
    this.effects = effects;
    this.effects.width = this.w * this.tw;
    this.effects.height = this.h * this.th;

    this.animationCanvas = new Canvas(this.w * this.tw, this.h * this.th);
    this.animationCanvas.canvas.style.zIndex = 4;
    this.animationCanvas.canvas.id = 'animation';

    this.inputCanvas = board.clone();
    this.inputCanvas.id = 'input';
    this.inputCanvas.style.zIndex = 100;

    this.terrainCanvas = board.clone();;
    this.terrainCanvas.id = 'terrain';
    this.terrainCanvas.style.zIndex = 0;

    this.board.parentNode.appendChild(this.inputCanvas);
    this.board.parentNode.appendChild(this.animationCanvas.canvas);
    this.board.parentNode.insertBefore(this.terrainCanvas, this.board);
    this.container.appendChild(container);

  }

  addDOMEvent(tag, event, fn) {
    let id = guid();
    this.DOMEvents.push({id, tag, event, fn});
    tag.addEventListener(event, fn);
  }

  removeDOMEvent(id) {
    let index = this.DOMEvents.findIndex(item => item.id == id);
    if(!~index) return;
    let item = this.DOMEvents[index];
    item.tag.removeEventListener(item.event, item.fn);
    this.DOMEvents.splice(index, 1);
  }

  removeDOMEvents() {
    Array.from(this.DOMEvents).forEach(item => {
      this.removeDOMEvent(item.id);
    })
  }

  destroy() {
    this.removeDOMEvents();
    let keys = Object.keys(this);
    keys.forEach(key => delete this[key]);
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

  get currentTeamName() {
    return this.currentActor ? (this.currentActor.team  == 'team1' ? this.originalTeam1.name : this.originalTeam2.name) : '';
  }

  removeDamagePreview() {
    let c = this.container.querySelector('#battle-canvas');
    let d = this.container.querySelector('#board-damage-preview')
    if(d) {
      c.removeChild(d);
    }
  }

  drawDamagePreview(a, b, ability, p) {
    let c = this.container.querySelector('#battle-canvas');
    let d = this.container.querySelector('#board-damage-preview')
    if(d) {
      c.removeChild(d);
    }
    let min = ability.stats.source == 'attack' ? this.attackRollMin(a, b, ability) : this.spellRollMin(a, b, ability);
    let max = ability.stats.source == 'attack' ? this.attackRollMax(a, b, ability) : this.spellRollMax(a, b, ability);
    let health = b.totalStat('health');
    let killsMin = Math.floor(min / health);
    if(min - killsMin * health >= b.health) killsMin += 1;
    let killsMax = Math.floor(max / health);
    if(max - killsMax * health >= b.health) killsMax += 1;
    let kills = ability.isDamaging ? ` <span>(kills ${killsMin}-${killsMax})</span>` : '';
    let damage = ability.isDamaging ? `${min} - ${max}` : '';
    if(!kills && !damage) damage = ability.bio.name;
    let tag = html`<div id='board-damage-preview' style='top: ${p.y}px; left: ${p.x}px;'>
      <span>${damage}${kills}</span>
    </div>`;
    c.appendChild(tag);
    return tag;
  }

  setEvents() {

    var moved = false;
    var attacked = false;
    var mp = 0;
    var actor = null;
    this.addDOMEvent(this.inputCanvas, 'contextmenu', (e) => {
      let x = Math.floor(e.offsetX / this.tw);
      let y = Math.floor(e.offsetY / this.th);

      var t = this.grid.get(x, y);
      if(t instanceof Monster) {
        this.toggleAbilityBook(t);
      }
      e.preventDefault();
    });
    this.addDOMEvent(this.inputCanvas, 'click', (e) => {
      let x = Math.floor(e.offsetX / this.tw);
      let y = Math.floor(e.offsetY / this.th);
      let a = this.currentActor;
      actor = a;

      var t = this.grid.get(x, y);
      let selectionsRequired = a.selectedAbility && a.selectedAbility.stats.selections || 1;
      if(a.selectedAbility && a.selectedAbility.stats.target == 'ground') {
        t = {x, y};
      }
      var targets = this.abilityTargets(a, a.selectedAbility, x, y);
      targets.validTargets && a._select({x,y});
      if(a.selectedAbility && targets.validTargets && a._selections.length == selectionsRequired && this.inRange(a, t)) {
        let action = new Action('use ability', a._selections, a.selectedAbility.template.id);
        this.addAction(action)
        .then(() => {
          a._deselect();
        })
        .catch(e => {
          console.log('action error', e)
        });
      } else
      if(!a.selectedAbility && a.canMove && !this.grid.get(x, y)) {
        this.sp.play('confirm_move', a);
        let action = new Action('move', [{x,y}], a.template.id);
        this.addAction(action)
        .then(() => {
          // console.log('walk successful');
        })
        .catch(e => {
          console.log(e)
        });
      }
    })

    this.addDOMEvent(window, 'keyup', (e) => {
      switch(e.key) {
        case 'd':
          return this.addAction(new Action('defend'))
          .catch(e => {
            console.log('action error', e)
          });
        case 'w':
          return this.addAction(new Action('wait'))
          .catch(e => {
            console.log('action error', e)
          });
        case '1':
          this.battleMenu.selectAbility(this.currentActor.actives[0]);
          return
        case '2':
          this.battleMenu.selectAbility(this.currentActor.actives[1]);
          return
        case '3':
          this.battleMenu.selectAbility(this.currentActor.actives[2]);
          return
        case '4':
          this.battleMenu.selectAbility(this.currentActor.actives[3]);
          return
        case '5':
          this.battleMenu.selectAbility(this.currentActor.actives[4]);
          return
        case '6':
          this.battleMenu.selectAbility(this.currentActor.actives[5]);
          return
        case '7':
          this.battleMenu.selectAbility(this.currentActor.actives[6]);
          return
        case '8':
          this.battleMenu.selectAbility(this.currentActor.actives[7]);
          return
        case '9':
          this.battleMenu.selectAbility(this.currentActor.actives[8]);
          return
        default:
          return;
      }
    })
    var hoverx = 0;
    var hovery = 0;
    var currentPath = [];
    this.addDOMEvent(this.inputCanvas, 'mouseout', (e) => {
      var c = this.effects.getContext('2d');
      c.clearRect(0, 0, this.w * this.tw, this.h * this.th);
    });

    this.addDOMEvent(this.inputCanvas, 'contextmenu', e => {
      e.preventDefault();
      this.monsterCards.forEach(c => {
        if(!c.cached) return;
        if(c.item == this.grid.get(this.mouse.x, this.mouse.y)) {
        } else {
        }

      })
    })

    this.addDOMEvent(this.inputCanvas, 'mousemove', (e) => {
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
      let hightlighted = this.monsterCards.filter(c => {
        if(!c.cached) return;
        if(c.item == this.grid.get(this.mouse.x, this.mouse.y)) {
          c.hightlightCanvas();
          if(this.currentActor.selectedAbility) {
            this.drawDamagePreview(this.currentActor, c.item, this.currentActor.selectedAbility, {x: c.item.x * this.tw, y: c.item.y * this.th -30});
          }
          return true;
        } else {
          c.unhightlightCanvas();
        }

      })
      if(!hightlighted.length) {
        this.removeDamagePreview();
      }
      if(x > this.w -1 || y > this.h -1) return;
      var path = a.selectedAbility ? [] : this.grid.path(a.x, a.y, x, y);
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

  popup() {
    let tag = html`<div
      style='
        display: none;
        position: fixed;
        width: 800px;
        height: 600px;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        padding: 20px;
        background-color: rgba(0,0,0,0.5);
        background: url(sheet_of_old_paper_horizontal.png);
        border-radius: 10px;
        z-index: 100;
      '
    >
    </div>`;
    document.body.appendChild(tag);
    return tag;
  }

  toggleAbilityBook(a) {
    a = a || this.currentActor;
    let c = this.csPopup;//document.getElementById('outer-abilities');
    a.drawMonsterCS(c);
    if(c.style.display == 'none')
      c.style.display = 'block';
    else
      c.style.display = 'none';

    this.sp.play('open_book');
  }

  drawBattleMenu() {
    this.battleMenu = new BattleMenu(this);
    let outer = this.battleMenu.render();
    let container = html`<div></div>`;
    container.id = 'battle-menu';
    this.board.parentNode.appendChild(container);
    Object.assign(container.style, {
      top: this.h * this.th + 4 + 'px',
    });
    container.appendChild(outer);

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
    if(ability.stats.target == 'self' && this.grid.get(x, y) != a) {
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
    let icon = icons.find(i => i.bio.name == 'Tile Target');
    c.drawImage(icon.canvas, x * this.tw, y * this.th, this.tw, this.th);
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
      if(ability) {
        this.highlightAbility(t.x, t.y, ability.baseSprite.canvas);
      } else {
        this.highlightTile(t.x, t.y, i+1);
      }
    })
    if(ability && ability.stats.target != 'ground') {
      targets.actors.forEach((t, i) => {
        this.highlightAbility(t.x, t.y, ability.baseSprite.canvas);
      })
    }
    let pointerTarget = this.grid.get(x, y);
    let aura = pointerTarget && pointerTarget.hasAura;
    aura && !ability && this.highlightAura(aura);
  }


  loadSpriteSheets() {
    var sheets = [];
    var items = this.tr.filter(item => {
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
    this.arena.canvas.composite && this.arena.drawObstacles();
    var canvas = this.terrainCanvas;
    var c = canvas.getContext('2d');
    var img = this.arena.canvas.composite || this.arena.render();
    c.drawImage(img, 0,0, this.tw*this.w, this.th*this.h);
  }

  setPositions() {
    this.w = this.arena.w;
    this.h = this.arena.h;
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
        let x = this.arena.w -2;
        let y = meleePositions[meleeCounter];
        meleeCounter += 1;
        item.x = x;
        item.y = y;
        this.grid.setItem(item);

      } else {
        let x = this.arena.w - 1;
        let y = rangePositions[rangeCounter];
        rangeCounter += 1;
        item.x = x;
        item.y = y;
        this.grid.setItem(item);
      }
    })
    return Promise.resolve();
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
        c.drawImage(img, sprite.x, sprite.y, sprite.w, sprite.h, 0, 0, this.tw, this.th);
        sprite.canvas = canvas;

      })
    })
    icons.forEach(icon => {
      let sprite = icon.bio.sprite;
      var canvas = document.createElement('canvas');
      canvas.width = this.tw;
      canvas.height = this.th;
      var c = canvas.getContext('2d');
      var img = this.images[sprite.spritesheet];
      c.drawImage(img, sprite.x, sprite.y, sprite.w, sprite.h, 0, 0, this.tw, this.th);
      icon.canvas = canvas;

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
    return this.tr.render(this);
    var container = document.getElementById('monster-cards');
    Object.assign(container.style, {
      position: 'relative'
    })
    let cursor = new Sprite(icons.find(i => i.bio.name == 'Ability Cursor').bio.sprite);
    container.innerHTML = '';
    let toggle = html`<div style='position: relative;
      display: inline-block;
      padding: 10px;
      border: none;
      font-size: 20px;
      font-weight: bold;
      margin: 4px;
      box-shadow: 0px 2px 4px -1px rgba(0,0,0,0.5);
      border-radius: 4px;
      background-color: rgba(0,0,0,0);
      cursor: inherit;
      background: url(sheet_of_old_paper_horizontal.png);
      text-align: left;
      user-select: none;
      cursor: url(${cursor.canvas.toDataURL('image/png')}), auto;'
    >
      <div style='position: relative;
        display: inline-block;
        padding: 10px;
        border: none;
        font-size: 20px;
        font-weight: bold;
        margin: 4px;
        box-shadow: 0px 2px 4px -1px rgba(0,0,0,0.5);
        border-radius: 4px;
        background-color: rgba(0,0,0,0);
        cursor: inherit;
        background: url(sheet_of_old_paper_horizontal.png);
        text-align: left;'
      >
        Change Size
      </div>
    </div>`;
    let round = this.tr.currentRound + 1;
    let teamName = this.currentTeamName;
    let actor = this.currentActor ? this.currentActor.bio.name : '';
    let info = html`<div>
      Round: ${round}<br>
      Team: ${teamName}<br>
      Actor: ${actor}
    </div>`;
    toggle.appendChild(info);
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

  playAbilityAnimation(a, b, ability) {
    if(ability.animation.template) {
      let {sprite, template} = ability.animation;
      if(!sprite) sprite = new Sprite(ability.bio.sprite);
      let anim = new Animation(a.x * this.tw, a.y*this.th, b.x*this.tw, b.y*this.th, sprite, template.stats);
      return this.ap.add(anim)
      .then(() => this.playHitAnimation(a, b, ability))
      .catch(e => console.log('animation error', e))
    }
    return this.playHitAnimation(a, b, ability);
  }

  playHitAnimation(a, b, ability) {
    return new Promise((resolve, reject) => {
      this.sp.play(ability.stats.source, ability.sounds);
      this.sp.play('hurt', b.sounds, true);
      let template = hitAnimationTemplate;
      let sprite = new CompositeSprite([hitBackgroundTemplate.bio.sprite, ability.bio.sprite]);
      let anim = new Animation(b.x * this.tw, b.y*this.th, b.x*this.tw, b.y*this.th, sprite, template.stats, 'time', this.tw, this.th);
      return this.ap.add(anim).then(resolve, reject);
      var counter = 5;
      var max = counter;
      var c = this.effects.getContext('2d');

      var int = setInterval(() => {
        c.clearRect(0, 0, this.w * this.tw, this.h * this.th);
        c.clearRect(0, 0, this.w * this.tw, this.h * this.th);
        counter -= 1;
        if(counter < 1) {
          c.globalAlpha = 1;
          resolve();
          return clearInterval(int);
        }
        c.globalAlpha = counter/max;
        c.fillStyle = `rgb(255, 255, 0)`;
        c.fillRect(a.x * this.tw, a.y * this.th, this.tw, this.th);
        c.fillStyle = `rgb(255, 0, 0)`;
        c.fillRect(b.x * this.tw, b.y * this.th, this.tw, this.th);
        c.drawImage(ability.canvas, b.x * this.tw, b.y * this.th, this.tw, this.th);
      }, 50);
    })
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

  canWait(a) {
    return this.tr.canWait(a);
  }

  canWalkTo(a, b) {
    let path = this.grid.path(a.x, a.y, b.x, b.y);
    let length = path.length - 1;
    return length <= a.movesLeft;
  }

  roll(a, b) {
    return Math.ceil(a + _random('battle roll') * (b-a));
  }

  flanks(b) {
    return this.grid.around(b.x, b.y, 1)
    .filter(m => {
      return m.item instanceof Monster && m.item.team != b.team
    }).length;
  }

  wait(a) {
    logger.log(a.bio.name, 'waits');
    let canWait = this.tr.wait(a);
    this.makeMonsterCards();
    return canWait;
  }

  defend(a) {
    logger.log(a.bio.name, 'defends');
    a.bonusdefence = 2 + (a.canMove ? 1 : 0) * Math.round(8 * (a.movesLeft/a.totalStat('movement')));
    a.defending = true;
  }

  undefend(a) {
    a.bonusdefence = 0;
    a.defending = false;
  }

  isHarmful(b, ability) {
    return (
      (~['force', 'fire', 'water', 'air', 'earth'].indexOf(ability.stats.element))
      ||
      (ability.stats.element == 'vitality' && b.bio.family == 'Undead')
      ||
      (ability.stats.element == 'rot' && b.bio.family != 'Undead')
      ||
      (ability.stats.element == 'vitality' && b.hasAilment('blighted'))
    )
  }

  trigger(event, target, source, power, ability) {
    if(!target.alive || !target.canTrigger) return;
    target.triggers.forEach(a => {
      if(a.bio.activation != event) return;
      if(!target.abilityConditionMet(a, target)) return;
      var t = a.stats.targetFamily == 'self' ? target : source;
      if(a.stats.target == 'self') {
        t = target;
      }
      if(!this.inRange(target, t, a)) return;
      this.useAbility(target, [t], a, true, power, ability);
      target.triggerCount += 1;
    })
  }

  applyElementalAilment(a, b, ability) {
    let element = ability.stats.element;
    let ailment = elements.randomAilment(element);
    if(ailment) {
      logger.log(b.bio.name, 'is now', ailment);
      b.addAilment(ailment);
    }
  }

  applyElementalVigor(a, b, ability) {
    let element = ability.stats.element;
    let vigor = elements.randomVigor(element);
    if(vigor) {
      logger.log(b.bio.name, 'is now', vigor);
      b.addVigor(vigor);
    }
  }

  ailmentThreshold(a, b) {
    let base = 95;
    if(a.hasVigor('charged')) base -= 30;

    return base;
  }

  dealDamage(a, b, d, ability, fromEffect) {
    var c = 'damaged';
    if(this.isHarmful(b, ability)) {
      d = b.harm(d);
      this.br.damage(a, b, ability, d);
    } else {
      d = b.heal(d);
      c = 'healed';
    }
    let ailmentRoll = this.roll(1, 100);
    let ailmentThreshold = this.ailmentThreshold(a, b);
    if(ailmentRoll > ailmentThreshold) this.applyElementalAilment(a, b, ability);
    logger.log(`${a.bio.name} ${c} ${b.bio.name} ${d} (${ability.stats.element}) with ${ability.bio.name} (${b.totalHealth})`);
    if(!b.alive) logger.log(b.bio.name, 'died!');
    if(!fromEffect) {
      this.trigger('when self is hit', b, a, d, ability);
      if(!b.alive) {
        this.trigger('when enemy is slain by self', a, b, d, ability);
      }
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
          if(!b.alive) {
            this.trigger('when adjacent enemy is slain', t, b, d, ability);
          }
        }
      })
    }

    if(!b.alive) this.kill(b);
  }

  vigorMultiplier(a, b, ability) {
    let d = this.grid.squareRadius(a.x, a.y, b.x, b.y);
    let m = 1;
    if(a.hasVigor('intimidating') && d <= 1) {
      m += 0.25;
    }
    if(b.hasVigor('prepared') && d <= 1) {
      m -= 0.25;
    }
    if(a.hasVigor('precise') && d > 5) {
      m += 0.25;
    }
    if(b.hasVigor('hidden') && d > 5) {
      m -= 0.25;
    }
    if(b.hasVigor('grounded') && ability.stats.element == 'air') {
      m *= 0.5;
    }
    if(a.hasVigor('engorged') && ability.stats.source == 'spell' ) {
      m *= 1.5;
    }

    return m;
  }

  ailmentMultiplier(a, b, ability) {
    let d = this.grid.squareRadius(a.x, a.y, b.x, b.y);
    let m = 1;
    if(b.hasAilment('overwhelmed') && d <= 1) {
      m += 0.25;
    }
    if(a.hasAilment('meek') && d <= 1) {
      m -= 0.25;
    }
    if(b.hasAilment('exposed') && d > 5) {
      m += 0.25;
    }
    if(a.hasAilment('rushed') && d > 5) {
      m -= 0.25;
    }
    if(ability.stats.element == 'force' && b.hasAilment('bruised')) {
      m += 0.25;
    }
    if(ability.stats.element == 'fire' && b.hasAilment('singed')) {
      m += 0.25;
    }
    if(a.hasAilment('soaked')) {
      m *= 0.75;
    }
    return m;
  }

  attackRoll(a, b, ability) {
    let at = a.totalStat('attack');
    let df = b.totalStat('defence');
    let stacks = a.stacks;
    let bonusDamage = a.totalStat('damage', b);
    let flanks = this.flanks(b) - 1;
    let flankMultiplier = 1 + (flanks / 5);
    let abilityDamage = ability.roll(bonusDamage);
    let multiplier = 1;
    let vigorMultiplier = this.vigorMultiplier(a, b, ability);
    let ailmentMultiplier = this.ailmentMultiplier(a, b, ability);
    if(at > df) {
      multiplier = 1 + (at - df)/10;
    } else if(df > at) {
      multiplier = Math.max(0.1, 1 + (at - df)/20);
    }
    let d = Math.ceil(abilityDamage * stacks * multiplier * flankMultiplier * vigorMultiplier * ailmentMultiplier);
    return d;
  }

  attackRollMin(a, b, ability) {
    let df = b.totalStat('defence');
    let at = a.totalStat('attack');
    let stacks = a.stacks;
    let bonusDamage = a.totalStat('damage', b);
    let flanks = this.flanks(b) - 1;
    let flankMultiplier = 1 + (flanks / 5);
    let abilityDamage = ability.minPower(bonusDamage);
    let multiplier = 1;
    let vigorMultiplier = this.vigorMultiplier(a, b, ability);
    let ailmentMultiplier = this.ailmentMultiplier(a, b, ability);
    if(at > df) {
      multiplier = 1 + (at - df)/10;
    } else if(df > at) {
      multiplier = Math.max(0.1, 1 + (at - df)/20);
    }
    let d = Math.ceil(abilityDamage * stacks * multiplier * flankMultiplier * vigorMultiplier * ailmentMultiplier);
    return d;
  }

  attackRollMax(a, b, ability) {
    let df = b.totalStat('defence');
    let at = a.totalStat('attack');
    let stacks = a.stacks;
    let bonusDamage = a.totalStat('damage', b);
    let flanks = this.flanks(b) - 1;
    let flankMultiplier = 1 + (flanks / 5);
    let abilityDamage = ability.maxPower(bonusDamage);
    let multiplier = 1;
    let vigorMultiplier = this.vigorMultiplier(a, b, ability);
    let ailmentMultiplier = this.ailmentMultiplier(a, b, ability);
    if(at > df) {
      multiplier = 1 + (at - df)/10;
    } else if(df > at) {
      multiplier = Math.max(0.1, 1 + (at - df)/20);
    }
    let d = Math.ceil(abilityDamage * stacks * multiplier * flankMultiplier * vigorMultiplier * ailmentMultiplier);
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
    let vigorMultiplier = this.vigorMultiplier(a, b, ability);
    let ailmentMultiplier = this.ailmentMultiplier(a, b, ability);
    let d = Math.ceil(abilityDamage * stacks * spellPower * vigorMultiplier * ailmentMultiplier);
    return d;
  }

  spellRollMin(a, b, ability, fromEffect, effectPower) {
    let stacks = a.stacks;
    let bonusDamage = a.totalStat("damage");
    let abilityDamage = ability.minPower(bonusDamage);
    let spellPower = 1 + a.totalStat('spellPower') / 10;
    let vigorMultiplier = this.vigorMultiplier(a, b, ability);
    let ailmentMultiplier = this.ailmentMultiplier(a, b, ability);
    let d = Math.ceil(abilityDamage * stacks * spellPower * vigorMultiplier * ailmentMultiplier);
    return d;
  }

  spellRollMax(a, b, ability, fromEffect, effectPower) {
    let stacks = a.stacks;
    let bonusDamage = a.totalStat("damage");
    let abilityDamage = ability.maxPower(bonusDamage);
    let spellPower = 1 + a.totalStat('spellPower') / 10;
    let vigorMultiplier = this.vigorMultiplier(a, b, ability);
    let ailmentMultiplier = this.ailmentMultiplier(a, b, ability);
    let d = Math.ceil(abilityDamage * stacks * spellPower * vigorMultiplier * ailmentMultiplier);
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
    if(this.roll(1, 100) > 95) this.applyElementalAilment(a, b, ability);
    return d;
  }

  applyEffects(a) {
    if(!a.alive) return;
    a.activeEffects.forEach(e => {
      var {source} = e.ability.stats;
      if(e.ability.stats.source == 'attack' || e.ability.stats.source == 'spell') {
        if(e.power) {
          this.dealDamage(e.source, a, e.power, e.ability, true);
          let special = specialEffects[e.ability.stats.special];
          if(special &&special.recurring) {
            special.fn(this, e.source, a, e.ability, e.power, 0, [a], null);
          }
        }
        // this.useAbility(e.source, [a], e.ability, false, 0, null, true);
      }
    })

    a.passives.forEach(ab => {
      if(!(ab.stats.source == 'attack' || ab.stats.source == 'spell')) return;
      this.useAbility(a, [a], ab, true);
    })

  }

  initiativeChanged(where) {
    this.tr.initiativeChanged();
    this.makeMonsterCards();
    logger.log('Initiative changed', where);
  }

  createAction(o) {
    return new Action(o.type, o.positions, o.abilityId);
  }

  fastForward(actions) {
    let next = (action) => {
      return new Promise((resolve, reject) => {
        var {positions, abilityId, type} = action;
        let position = positions[0];
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
          this.grid.remove(actor.x, actor.y);
          actor.move(position.x, position.y);
          this.grid.setItem(actor);
          p = Promise.resolve();
        } else
        if(type == 'use ability') {
          let ability = actor.abilities.find(a => a.template.id == abilityId);
          if(!ability) {
            return reject("Invalid ability")
          }
          p = this.useAbility(actor, positions, ability);
        } else {
          p = Promise.resolve();
        }

        p.then(() => {
          this.turn.addAction(action);
          if(this.turn.isOver) {
            this.endTurn();
            this.act();
          } else {
            if(actor.ai) return this.aiAct(actor).then(resolve, reject);
          }
          resolve();
        })
        .catch(reject);
      })
    }
    let que = Promise.resolve();
    actions.forEach(action => {
      que = que.then(() => next(action));
    });
    que.then(() => {
      this.render();
    })
    .catch(e => {
      console.log('fast forward failed', e)
    })
  }

  addAction(action, fromOutside) {
    if(this.onAction && !fromOutside) {
      this.onAction(action, this.currentActor.team);

      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {

      var {positions, abilityId, type} = action;
      let position = positions[0];
      let actor = this.currentActor;
      let p;
      if(type == 'surrender' && window.confirm('Are you sure you want to surrender?')) {
        let enemyTeam = this.getEnemyTeam(actor.team);
        this.endGame(enemyTeam[0].team);
        return Promise.resolve();
      } else
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
        if(actor.movesLeft < path.length) return reject(["Invalid move", actor.movesLeft, path]);
        p = this.walk(actor, path).then(() => {
          this.movementTriggers(actor);

        });
      } else
      if(type == 'use ability') {
        let ability = actor.abilities.find(a => a.template.id == abilityId);
        if(!ability) {
          return reject("Invalid ability")
        }
        p = this.useAbility(actor, positions, ability);
      } else {
        p = Promise.resolve();
      }

      p.then(() => {
        this.turn.addAction(action);
        if(this.turn.isOver) {
          this.endTurn();
          this.act();
        } else {
          if(actor.ai) return this.aiAct(actor).then(resolve, reject);
        }
        resolve();
      })
      .catch(reject);
    })
    .then(() => {
      this.render();
    })
    .catch(e => {
      console.log('Action Error:', e)
    })
  }

  useAbility(a, positions, ability, triggered, triggeredPower, triggeredBy, fromEffect) {
    return new Promise((resolve, reject) => {
      ability = ability || a.selectedAbility;
      let actions = positions.map(b => {
        a.setOrientation(b.x);
        var targets = this.abilityTargets(a, ability, b.x, b.y);
        if(!a.canUseAbility(ability)) {
          return;
        }
        a.useAbility(ability);
        logger.log(a.bio.name, triggeredPower ? 'trigger' : 'uses' ,'ability:', ability.bio.name);
        if(!ability.stats.summon) {
          let acts = targets.actors.map((t, i) => {
            let specialResult;
            let special = specialEffects[ability.stats.special];
            if(special && special.when == 'before hit') {
              specialResult = special.fn(this, a, b, ability, power, triggeredPower, positions, triggeredBy);
              if(specialResult.preventUse) return;
            }
            var power = 0;
            if(ability.stats.source == 'attack') {
              power = this.dealAttackDamage(a, t, ability, triggered);
            }
            if(ability.stats.source == 'spell') {
              power = this.dealSpellDamage(a, t, ability, triggered);
            }
            if(ability.stats.source == 'curse') {
              power = this.dealAttributeDamage(a, t, ability, triggered);
            }
            if(ability.stats.source == 'blessing') {
              power = this.dealAttributeDamage(a, t, ability, triggered);
            }


            if(special && special.when == 'per target') {
              specialResult = special.fn(this, a, t, ability, power, triggeredPower, positions, triggeredBy);
            }

            t.addEffect(a, ability, power, triggered, triggeredPower, positions, specialResult);

            if(special && special.when == 'per target, after effect') {
              specialResult = special.fn(this, a, t, ability, power, triggeredPower, positions, triggeredBy);
            }

            if(ability.stats.special != 'giveEffectAsAbility' && ability.stats.effect) {
              t = ability.stats.effect.stats.target == 'self' ? a : t;
              console.log('ability effect', ability.stats.effect)
              this.useAbility(a, [t], ability.stats.effect, true, power);
            }
            return this.playAbilityAnimation(a, t, ability);
          });
          let power = ability.roll(a.totalStat('damage'));
          let special = specialEffects[ability.stats.special];
          let specialResult;
          if(special && special.when == 'per use') {
            specialResult = special.fn(this, a, b, ability, power, triggeredPower, positions, triggeredBy);
          }
          !targets.actors.length && targets.tiles.length &&
          !triggered && a.addEffect(a, ability, power, triggered, triggeredPower, positions, specialResult);
          if(ability.stats.attribute == 'initiative') {
            this.initiativeChanged('useAbility');
          }
          return Promise.all(acts);
        } else {
          // let tile = a.selections[0].tiles[0];
          let template = monsters.find(m => m.bio.name == ability.stats.summon);
          this.summon(a, ability, template, b);
          return Promise.resolve();
        }

      })
      Promise.all(actions).then(resolve, reject);
    })
  }

  summon(a, ability, template, tile) {
    let c = this.grid.get(tile.x, tile.y);
    if(c) {
      tile = this.grid.closestEmpty(tile.x, tile.y);
    };
    let health = a && a.stacks * (10 + 10 * a.totalStat('spellPower'));
    let stacks = a ? Math.min(template.bio.maxStacks, Math.ceil(health / template.stats.health)) : 1;
    let monster = new Monster(template, 1, true);
    monster.addStack(stacks -1);
    monster.harm(monster.totalHealth);
    monster.heal(health);
    monster.team = a.team;
    monster.battle = a.battle;
    monster.ai = a.ai;
    monster.x = tile.x;
    monster.y = tile.y;
    this.grid.setItem(monster);
    this.tr.add([monster]);
    this.addAuras(monster);
    logger.log(a.bio.name, 'summoned', monster.bio.name)
    this.initiativeChanged('useAbility');
    return monster;
  }

  addMonster(monster, tile) {
    tile = tile || monster;
    monster.battle = this;
    monster.x = tile.x;
    monster.y = tile.y;
    this.grid.setItem(monster);
    this.tr.add([monster]);
    this.addAuras(monster);
    logger.log('Added monster', monster.bio.name)
    this.initiativeChanged();
    return monster;
  }

  kill(a) {
    this.sp.play('death');
    this.tr.remove(a);
    this.grid.remove(a.x,a.y);
    this.render();
    logger.log(a.bio.name, 'was killed');
  }

  inRange(a, b, ability) {
    var d = this.grid.distance(a.x, a.y, b.x, b.y);
    ability = ability || a.selectedAbility;
    if(!ability) return;
    var range = ability ? ability.stats.range : 1;
    return d <= range + 0.42;
  }

  movementTriggers(a) {
    let enemies = this.getEnemyTeam(a.team);
    enemies.forEach(e => {
      if(this.isFarWay(a, e)) {
        this.trigger('when far away enemy move', e, a, 0, null);
      }
    })
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
        if(a.hasAilment('bleeding')) {
          let d = Math.round(a.totalHealth / 50) || 1;
          logger.log(a.bio.name, 'takes bleeding damage', d);
          a.harm(d);
        }
        this.grid.setItem(a);
        this.render();
        this.sp.play('move');
        if(!path.length) {
          clearInterval(int);
          resolve();
        }
      }, 100);

    })
  }

  human(a) {

  }

  endGame(winningTeam) {
    this.sp.play('victory');
    if(typeof this.onGameEnd !== 'function') return;
    this.onGameEnd({
      winningTeam,
      monstersLeft: Array.from(this.tr),
      results: this.br,
      team: this.currentTeam
    });
  }

  spreadContagion(a) {
    let adjacent = this.grid.around(a.x, a.y, 1)
    .filter(b => b.item && b.item.team == a.team && b.id != a.id);
    a.activeEffects.filter(e => {
      return e.ability.stats.source == 'curse' || (e.power && (e.ability.stats.source == 'spell' || e.ability.stats.source == 'attack'))
    })
    .forEach(e => {
      adjacent.forEach(m => {
        let effect = m.item.addEffect(e.source, e.ability, e.power, e.triggered, e.power);
        if(effect) effect.rounds = e.rounds;
      })
    })
  }

  startTurn() {
    var a = this.tr.actor;
    logger.log('Turn start for', a.bio.name);
    if(!a.ai) {
      this.sp.play('start_turn', a.sounds, true);
    }
    this.currentActor = a;
    var turn = new Turn(a);
    this.turns.push(turn);
    this.undefend(a);
    a.selections = [];
    a.triggerCount = 0;
    this._selections = [];
    a.resetMovement();
    a.selectAbility(null);
    if(!this.tr.didWait(a)) {
      a.replenishMana(1);
      this.applyEffects(a);
      if(a.hasAilment('contagious')) this.spreadContagion(a);
    }
    this.render();
    this.battleMenu.setActor(a);
    if(!this.tr.filter(m => m.team != a.team).length) {
      logger.log(a.team, 'won the game!');
      this.endGame(a.team);
    }
  }

  endTurn() {
    let a = this.currentActor;
    logger.log('Turn end for', a.bio.name);
    this.turn.endMovement.x = a.x;
    this.turn.endMovement.y = a.y;
    if(!this.tr.didWait(a) || a.defending) {
      let effectsToRemove = [];
      a.effects.forEach(e => {
        let {source} = e.ability.stats;
        e.rounds += 1;
        if(e.rounds == e.ability.stats.duration) {
          effectsToRemove.push(e);
        }
      });
      effectsToRemove.forEach(e => a.removeEffect(e));
    }
    let currentRound = this.tr.currentRound;
    this.tr.nextTurn();
    this.makeMonsterCards();
  }

  aiAct(a) {
    return a.routine.act(Action);
  }

  act() {
    this.startTurn();
    var a = this.currentActor;
    if(!a) return;
    if(!a.alive) {
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
    return this.aiAct(a);


  }

  dragndrop(container) {
    var sx = 0;
    var sy = 0;
    var ox = 0;
    var oy = 0;
    var state = 'up';
    this.addDOMEvent(container, 'mousedown', (e) => {
      sx = e.screenX;
      sy = e.screenY;
      ox = e.offsetX;
      oy = e.offsetY;
      state = 'down';
    });
    this.addDOMEvent(window, 'mousemove', (e) => {
      if(e.target != container) return;
      if(state != 'down') return;
      var x = e.x;
      var y = e.y;
      container.style.left = x - ox + 'px';
      container.style.top = y - oy + 'px';
    });
    this.addDOMEvent(container, 'mouseup', (e) => {
      state = 'up';
    });
    this.addDOMEvent(window, 'mouseup', (e) => {
      state = 'up';
    });
  }

  createMonsterCardContainer() {
    return this.tr.init();
    let c = new Component();
    c.addInner({id: 'monster-cards'});
    let style = html`<style>
      #monster-cards {
        display: inline-block;
        left: 0px;
        left: 0px;
        transform: translateX(-50%);
        background-image: url(sheet_of_old_paper_horizontal.png);
        border: 5px solid rgba(0,0,0,0.2);
        outline: 1px solid rgba(0,0,0,0.2);
        outline-offset: -4px;
        border-radius: 3px;
      }

      ${MonsterCard.style}
    </style>`;
    c.addStyle(style);

    this.container.appendChild(c.tags.outer);
  }

  showMonsterCards() {
    console.log('showMonsterCards')
    let c = document.getElementById('monster-cards');
    c.style.display = 'block';
  }

  hideMonsterCards() {
    console.log('hideMonsterCards')
    let c = document.getElementById('monster-cards');
    c.style.display = 'none';
  }

  start() {
    logger.minimized = false;
    logger.redraw();
    this.createMonsterCardContainer();

    return this.loadSpriteSheets()
    .then(images => {
      this.cacheCanvases();
      this.makeMonsterCards();
      this.drawTerrain();
      this.drawBattleMenu();
    })
    .then(() => {
      this.render();
      this.sp.play('battle_begin');
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

  render() {
    this.clearCanvases();
    // this.drawGrid();
    this.drawMonsters();
    this.drawTerrain();
    this.drawMonsterCards();
  }
}

module.exports = Battle;
