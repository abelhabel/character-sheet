const PL = require("PositionList2d.js");
const abilities = require('abilities.js');
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
    this.images = {};
    this.sounds = {};
    this.monsterCards = [];
    this.currentActor = null;
    this.auras = {
      team1: [],
      team2: []
    };
    [...this.team1, ...this.team2].forEach(m => {
      m.passiveAbilities.forEach(a => {
        if((a.stats.shape == 'circle' || a.stats.shape == 'square') && a.stats.targetFamily !== 'self') {
          this.auras[m.team].push(a);
        }
      })
    })
    console.log('AURAS', this.auras)
    this.setEvents();
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
      if(a.selectedAbility && a.selectedAbility.stats.target == 'ground') {
        t = {x, y};
      }
      var targets = this.abilityTargets(a, a.selectedAbility, x, y);

      console.log('clicked:', a.movesLeft)
      if(targets.validTargets) {
        this.attack(a, t);
        mp = 0;
        this.turnOrder.push(a);
        this.act();
      } else
      if(a.movesLeft > 0) {
        var path = this.grid.path(a.x, a.y, x, y);
        path.shift();
        console.log('path', path.length, a.movesLeft, a.tilesMoved);
        if(a.movesLeft < path.length) return;
        var walked = path.length - 1;
        console.log('walk from click()')
        this.walk(a, path)
        .then(() => {
          console.log('WALK DONE')
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
      console.log(a.bio.name, 'defends', a.alive)
      this.turnOrder.push(a);
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
      c.clearRect(0, 0, this.w * this.tw, this.h * this.th);
      c.fillStyle = 'rgba(88, 22, 33, 0.3)';
      c.clearRect(hoverx * this.tw, hovery * this.th, this.tw, this.th);
      c.fillRect(x * this.tw, y * this.th, this.tw, this.th);
      hoverx = x;
      hovery = y;

      if(x > this.w -1 || y > this.h -1) return;
      var path = this.grid.path(a.x, a.y, x, y);
      currentPath.forEach((p) => {
        c.clearRect(p[0] * this.tw, p[1] * this.th, this.tw, this.th);
      })
      path.forEach((p, i) => {
        if(!i) return;
        return this.highlightTile(p[0], p[1], i);
        c.fillStyle = 'rgba(88, 22, 33, 0.3)';
        c.fillRect(p[0] * this.tw, p[1] * this.th, this.tw, this.th);
        c.fillStyle = 'green';
        c.fillText(i, 2 + p[0] * this.tw, 12 + p[1] * this.th);
      })
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
        var targets = this.abilityTargets(a, ability, x, y);
        targets.tiles.forEach((t, i) => {
          this.highlightTile(t.x, t.y, i+1);
        })
        targets.actors.forEach((t, i) => {
          this.highlightAbility(t.x, t.y, ability.canvas);
        })
      }
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
    if(ability.stats.target == 'ground' && out.tiles.length) {
      out.validTargets = true;
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
    c.fillStyle = 'rgba(88, 22, 33, 0.3)';
    c.fillRect(x * this.tw, y * this.th, this.tw, this.th);
    c.fillStyle = 'green';
    c.fillText(i, 2 + x * this.tw, 12 + y * this.th);
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
    abilities.forEach(item => {
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
    this.turnOrder.forEach(item => {
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
  }

  drawMonsterCards() {
    this.monsterCards.forEach(c => {
      c.ct.clearRect(0, 0, c.w, c.h);
      if(!c.item.alive) {
        c.ct.fillStyle = '#aa0000'
        c.ct.fillRect(0, 0, c.w, c.h);
      }
      if(c.item == this.currentActor) {
        c.ct.fillStyle = '#00aa00'
        c.ct.fillRect(0, 0, c.w, c.h);
      }
      c.ct.fillStyle = 'black';
      var {sprite, name} = c.item.bio;
      c.ct.drawImage(c.item.canvas, 10, 10, this.tw, this.th)
      c.ct.fillText(`name: ${name}`, 10, 20 + this.th);
      Object.keys(c.item.stats).forEach((key, i) => {
        let y = this.th + 30 + (i * 10);
        let x = 10;
        let total = (c.item['bonus' + key] || 0) + c.item.stats[key];
        c.ct.fillText(`${key}: ${total}`, x, y);
      })
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
      var sprite = item.bio.sprite;
      var img = this.images[sprite.spritesheet];
      if(item == this.currentActor) {
        c.lineWidth = 4;
        c.strokeStyle = 'red';
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
      c.beginPath();
      c.moveTo(item.x * this.tw, item.y * this.th + 1);
      c.lineTo(item.x * this.tw + (this.tw * item.healthRatio), item.y * this.th + 1);
      c.stroke();
    })
  }

  drawActiveEffects() {
    if(!this.currentActor) return;
    console.log('drawActiveEffects')
    var container = document.getElementById('monster-effects');
    container.innerHTML = '';
    var title = document.createElement('p');
    var description = document.createElement('div');
    title.textContent = 'Effects';
    container.appendChild(title);
    this.currentActor.activeEffects.forEach(e => {
      console.log('ACTIVE EFFECTS', e.ability.bio.name)
      var canvas = document.createElement('canvas');
      canvas.style.cursor = 'pointer';
      let a = e.ability;
      var {w, h} = a.bio.sprite;
      canvas.width = w;
      canvas.height = h;
      var c = canvas.getContext('2d');
      c.drawImage(a.canvas, 0, 0, w, h);

      canvas.addEventListener('click', () => {
        let {source, attribute, element} = a.stats;
        let type = source == 'spell' || source == 'attack' ? `${element} damage` : `${source} - ${attribute}`;
        description.textContent = `${a.bio.name}: ${type} ${e.power}`;
      })

      container.appendChild(canvas);
    });
    container.appendChild(description);
    // var passives = this.currentActor.passiveAbilityBonus;
    // passives.blessing.forEach(e => {
    //   console.log('ACTIVE EFFECTS', e.ability.bio.name)
    //   var canvas = document.createElement('canvas');
    //   let a = e.ability;
    //   var {w, h} = a.bio.sprite;
    //   canvas.width = w;
    //   canvas.height = h;
    //   var c = canvas.getContext('2d');
    //   c.drawImage(a.canvas, 0, 0, w, h);
    //
    //   container.appendChild(canvas);
    // })
  }

  drawAbilities() {
    if(!this.currentActor) return;
    var container = document.getElementById('monster-abilities');
    container.innerHTML = '';
    var title = document.createElement('p');
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
        this.currentActor.selectAbility(a);
        this.drawAbilities();
      })

      if(this.currentActor.selectedAbility && a.bio.name == this.currentActor.selectedAbility.bio.name) {
        c.strokeRect(0, 0, w, h);
      }

      container.appendChild(canvas);
    })
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
    a.bonusdefence = 10;
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
    if(!target.alive) return;
    console.log('EVENT:', event);
    target.triggers.forEach(a => {
      if(a.bio.activation != event) return;
      if(a.stats.duration) {
        var t = a.stats.targetFamily == 'self' ? target : source;
        t.addEffect(this, a, a.roll());
        console.log(t.bio.name, 'added effect', a.bio.name)
      } else {
        console.log('TRIGGER ability', a.bio.name);
        this.attack(target, source, a, true);
      }
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
    console.log(`${a.bio.name} ${c} ${b.bio.name} ${d} (${ability.stats.element}) (${b.totalHealth})`);
    if(!fromEffect) {
      this.trigger('when self is hit', b, a, d, ability);
      this[b.team].forEach(t => {
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
      this[a.team].forEach(t => {
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

  dealAttackDamage(a, b, ability, fromEffect) {
    let df = b.totalStat('defence');
    let at = a.totalStat('attack');
    let stacks = a.stacks;
    let flanks = this.flanks(b) - 1;
    let flankMultiplier = 1 + (flanks / 5);
    let abilityMultiplier = ability.stats.multiplier / 100;
    let roll = this.roll(ability.stats.minPower, ability.stats.maxPower);
    let multiplier = (Math.max(1, at) / Math.max(1, df));
    console.log('stacks', stacks, 'roll', roll, 'multiplier', multiplier, 'flanks', flankMultiplier, 'ability', abilityMultiplier)
    let d = Math.ceil(stacks * multiplier * roll * flankMultiplier * abilityMultiplier);
    this.dealDamage(a, b, d, ability, fromEffect);
    if(!fromEffect) {
      this.trigger('when attack hits', a, b, d, ability);
    }

    return d;
  }

  dealSpellDamage(a, b, ability, fromEffect) {
    let spellResistance = b.totalStat('spellResistance');
    let resistRoll = this.roll(1, 100);
    console.log('resist', resistRoll, 'against spellResistance', spellResistance);
    if(resistRoll < spellResistance) {
      console.log(b.bio.name, 'resisted spell', ability.bio.name);
      return 0;
    }
    let stacks = a.stacks;
    let abilityMultiplier = ability.stats.multiplier / 100;
    let spellPower = 1 + a.totalStat('spellPower') / 10;
    let roll = this.roll(ability.stats.minPower, ability.stats.maxPower);
    let d = Math.ceil(roll * stacks * spellPower * abilityMultiplier);
    console.log('stacks', stacks, 'spellPower', spellPower, 'abilityMultiplier', abilityMultiplier, 'roll', roll);
    this.dealDamage(a, b, d, ability, fromEffect);
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
      console.log('applying effect:', e.ability.bio.name, 'to', a.bio.name);
      e.rounds += 1;
      if(source == 'attack' || source == 'spell') {
        this.dealDamage(e.source, a, e.power, e.ability, true);
      }
    })
  }

  attack(a, b, ability, fromEffect) {
    ability = ability || a.selectedAbility;
    var targets = this.abilityTargets(a, ability, b.x, b.y);

    console.log(`${a.bio.name} picked ability: ${ability.bio.name}`);
    if(!a.canUseAbility(ability)) {
      console.log(`${a.bio.name} is out of mana (${a.totalMana}) for ${ability.bio.name} (${ability.stats.resourceCost})`)
      return;
    }
    a.useAbility(ability);
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
      if(ability.stats.duration && power) {
        t.addEffect(a, ability, power);
        if(ability.stats.effect) {
          t.addEffect(a, ability.stats.effect, power);
        }
      }
      this.playHitAnimation(a, t, ability);
    })
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
        console.log('path', path)
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

  act() {
    var a = this.turnOrder.shift();
    this.undefend(a);
    a.resetMovement();
    console.log('Turn start for', a.bio.name, a.alive)
    console.log(a.totalStat('movement'))
    this.currentActor = a;
    if(!a.canUseAbility(a.selectedAbility)) a.selectAbility(a.selectedAbility);
    this.applyEffects(a);
    this.render();
    var t = this.findTarget(a);
    if(!a.alive) return this.act();
    if(!a.ai) {
      return this.human(a);
    }
    if(!t) {
      this.sounds.victory.play();
      console.log(`${a.team} won the match`);
      return;
    }
    console.log(a.bio.name, 'attacks', t.bio.name)
    var p = this.findClosestTile(a, t);
    var path = this.grid.path(a.x, a.y, p.x, p.y);
    path.shift();
    path.splice(a.movesLeft);
    console.log('walk from act()')
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
        a.live && this.turnOrder.push(a);
        this.render();
        if(this.turnOrder.length) this.act();

      }, 500)
    })

  }

  makeMonsterCards() {
    this.monsterCards = this.turnOrder.map(item => {
      var c = document.createElement('canvas');
      c.width = 200;
      c.height = 200;
      document.body.appendChild(c)
      return {
        item: item,
        canvas: c,
        w: 200,
        h: 200,
        ct: c.getContext('2d')
      }
    })
  }

  createAbilityContainer() {
    var c = document.createElement('div');
    c.id = 'monster-abilities';

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
    this.makeMonsterCards();
    this.createAbilityContainer();
    this.createEffectContainer();
    this.loadSpriteSheets()
    .then(images => {
      this.cacheCanvases();
      this.setPositions();
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
    this.drawGrid();
    this.drawMonsters();
    this.drawTurnOrder();
    this.drawMonsterCards();
    this.drawAbilities();
    this.drawActiveEffects();
  }
}

module.exports = Battle;
