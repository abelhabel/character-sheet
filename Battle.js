const PL = require("PositionList2d.js");
class Battle {
  constructor(team1, team2, w, h, tw, th, board, order, effects) {
    this.team1 = team1;
    this.team2 = team2;
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
    this.order = order;
    this.turnOrder = [];
    this.grid = new PL(w, h);
    this.images = {};
    this.sounds = {};
    this.monsterCards = [];
    this.currentActor = null;
    this.setEvents();
  }

  setEvents() {

    var moved = false;
    var attacked = false;
    var mp = 0;
    var actor = null;
    this.board.addEventListener('click', (e) => {
      let a = this.currentActor;
      if(actor != a) mp = a.stats.movement;
      actor = a;
      let x = Math.floor(e.offsetX / this.tw);
      let y = Math.floor(e.offsetY / this.th);
      var t = this.grid.get(x, y);
      if(t) {
        if(t.nameAndFamily.family != a.nameAndFamily.family) {
          if(this.inRange(a, t)) {
            this.attack(a, t);
            mp = 0;
            this.turnOrder.push(a);
            this.act();
          }
        }
      } else
      if(mp > 0) {
        var path = this.grid.path(a.x, a.y, x, y);
        var walked = path.length - 1;
        this.walk(a, path)
        .then(() => {
          mp -= walked
          console.log(mp, a.stats.movement)
        });
      }
    })

    var b = document.createElement('button');
    b.textContent = 'End Turn';
    this.endTurnButton = b;
    b.addEventListener('click', () => {
      if(this.currentActor.ai) return;
      mp = 0;
      this.turnOrder.push(this.currentActor);
      this.act();
    })
    document.body.appendChild(b);
  }

  loadSpriteSheets() {
    var sheets = [];
    var items = this.turnOrder.filter(item => {
      var s = item.nameAndFamily.sprite.spritesheet;
      if(!~sheets.indexOf(s)) {
        sheets.push(s);
        return item;
      }
    });
    var loads = items.map(item => {
      return this.openSpriteSheet(item);
    });
    return Promise.all(loads)
  }

  openSpriteSheet(item) {
    return new Promise((resolve, reject) => {
      var image = new Image();
      image.onload = (e) => {
        this.images[item.nameAndFamily.sprite.spritesheet] = image;
        resolve(image);
      }
      image.src = item.nameAndFamily.sprite.spritesheet;

    })
  }

  setTurnOrder() {
    this.turnOrder = [...this.team1, ...this.team2].sort((a, b) => {
      return a.stats.initiative > b.stats.initiative ? -1 : 1;
    })
    return this;
  }

  drawGrid() {
    var canvas = this.board;
    var c = canvas.getContext('2d');
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
    this.team1.forEach((item, i) => {
      let y = Math.floor(i / w);
      let x = w + (i % w);
      item.x = x;
      item.y = y;
      this.grid.setItem(item);
    })
    this.team2.forEach((item, i) => {
      let y = this.h - Math.floor(i / w) - 1;
      let x = w + (i % w);
      item.x = x;
      item.y = y;
      this.grid.setItem(item);
    })
  }

  cacheCanvases() {
    this.turnOrder.forEach(item => {
      var canvas = document.createElement('canvas');
      canvas.width = this.tw;
      canvas.height = this.th;
      var c = canvas.getContext('2d');
      var sprite = item.nameAndFamily.sprite;
      var img = this.images[sprite.spritesheet];
      // c.clearRect(item.x * this.tw, item.y * this.th, this.tw, this.th);
      c.drawImage(img, sprite.x, sprite.y, this.tw, this.th, 0, 0, this.tw, this.th);
      item.canvas = canvas;
    })
  }

  drawMonsterCards() {
    this.monsterCards.forEach(c => {
      c.ct.clearRect(0, 0, c.w, c.h);
      if(c.item.stats.health < 1) {
        c.ct.fillStyle = '#aa0000'
        c.ct.fillRect(0, 0, c.w, c.h);
      }
      if(c.item == this.currentActor) {
        c.ct.fillStyle = '#00aa00'
        c.ct.fillRect(0, 0, c.w, c.h);
      }
      c.ct.fillStyle = 'black';
      var {sprite, name} = c.item.nameAndFamily;
      c.ct.drawImage(c.item.canvas, 10, 10, this.tw, this.th)
      c.ct.fillText(`name: ${name}`, 10, 20 + this.th);
      Object.keys(c.item.stats).forEach((key, i) => {
        let y = this.th + 30 + (i * 10);
        let x = 10;
        c.ct.fillText(`${key}: ${c.item.stats[key]}`, x, y);
      })
    })
  }

  playHitAnimation(a, b) {
    var counter = 10;
    var c = this.effects.getContext('2d');

    var int = setInterval(() => {
      c.clearRect(a.x * this.tw, a.y * this.th, this.tw, this.th);
      c.clearRect(b.x * this.tw, b.y * this.th, this.tw, this.th);
      counter -= 1;
      if(counter < 1) {
        return clearInterval(int);
      }
      c.fillStyle = `rgba(255, 255, 0, ${counter / 10})`;
      c.fillRect(a.x * this.tw, a.y * this.th, this.tw, this.th);
      c.fillStyle = `rgba(255, 0, 0, ${counter / 10})`;
      c.fillRect(b.x * this.tw, b.y * this.th, this.tw, this.th);
    }, 50);
  }

  drawMonsters() {
    var canvas = this.board;
    var c = canvas.getContext('2d');
    this.grid._list().forEach(item => {
      var sprite = item.nameAndFamily.sprite;
      var img = this.images[sprite.spritesheet];
      if(item == this.currentActor) {
        c.lineWidth = 4;
        c.strokeStyle = 'red';
        c.strokeRect(item.x * this.tw, item.y * this.th, this.tw, this.th);
      }
      c.lineWidth = 1;
      c.strokeStyle = 'black';
      c.drawImage(item.canvas, item.x * this.tw, item.y * this.th, this.tw, this.th);
    })
  }

  drawTurnOrder() {
    var canvas = this.order;
    var c = canvas.getContext('2d');
    this.turnOrder.forEach((item, i) => {
      var sprite = item.nameAndFamily.sprite;
      var img = this.images[sprite.spritesheet];
      // c.clearRect(item.x * this.tw, item.y * this.th, this.tw, this.th);
      c.drawImage(item.canvas, i * this.tw, 0, this.tw, this.th);
    })
  }

  findTarget(a) {
    return this.turnOrder.find(item => {
      return item.nameAndFamily.family != a.nameAndFamily.family;
    })
  }

  findClosestTarget(p) {
    return this.turnOrder.filter(item => {
      return item.nameAndFamily.family != p.nameAndFamily.family;
    })
    .sort((a, b) => {
      let d1 = this.grid.distance(a.x, a.y, p.x, p.y);
      let d2 = this.grid.distance(b.x, b.y, p.x, p.y);
      return d1 > d2 ? 1 : -1;
    })[0];
  }

  findWeakestTarget(p) {
    return this.turnOrder.filter(item => {
      return item.nameAndFamily.family != p.nameAndFamily.family;
    })
    .sort((a, b) => {
      let d1 = a.stats.defence + a.stats.health;
      let d2 = b.stats.defence + a.stats.health;
      return d1 > d2 ? 1 : -1;
    })[0];
  }

  roll(a, b) {
    return Math.ceil(a + Math.random() * (b-a));
  }

  flanks(b) {
    return this.grid.around(b.x, b.y, 1)
    .filter(m => {
      return m.item && m.item.nameAndFamily.family != b.nameAndFamily.family
    }).length;

  }

  attack(a, b) {
    this.playHitAnimation(a, b);
    this.sounds.attack.play();
    let flanks = this.flanks(b) - 1;
    let flankMultiplier = 1 + (flanks / 5);
    let roll = this.roll(a.stats.minDamage, a.stats.maxDamage);
    let multiplier = (a.stats.attack / b.stats.defence)
    console.log('roll', roll, 'multiplier', multiplier, 'flanks', flankMultiplier)
    let d = Math.round(multiplier * roll * flankMultiplier);
    b.stats.health -= d;
    console.log(`${a.nameAndFamily.name} hits ${b.nameAndFamily.name} for ${d} damage (${b.stats.health})`);
    let alive = b.stats.health > 0;
    if(!alive) this.kill(b);
  }

  kill(a) {
    this.sounds.death.play();
    var i = this.turnOrder.findIndex(item => item == a);
    this.turnOrder.splice(i, 1);
    this.grid.remove(a.x,a.y);
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
    return d <= a.stats.range + 0.42;
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
        a.x = p[0];
        a.y = p[1];
        this.grid.setItem(a);
        this.render();
        this.sounds.move.play();
        if(!path.length) {
          clearInterval(int);
          resolve();
        }
      }, 300);

    })
  }

  human(a) {

  }

  act() {
    var a = this.turnOrder.shift();
    this.currentActor = a;
    this.render();
    var t = this.findClosestTarget(a);
    if(!t) {
      this.sounds.victory.play();
      console.log(`${a.nameAndFamily.family} won the match`);
      return;
    }
    if(!a.ai) {
      return this.human(a);
    }
    console.log(a.nameAndFamily.name, 'attacks', t.nameAndFamily.name)
    var p = this.findClosestTile(a, t);
    var path = this.grid.path(a.x, a.y, p.x, p.y);
    path.shift();
    path.splice(a.stats.movement);
    var action = this.inRange(a, t) ? Promise.resolve() : this.walk(a, path);
    action.then(() => {
      setTimeout(() => {
        if(this.inRange(a, t)) {
          this.attack(a, t);
        }
        this.turnOrder.push(a);
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

  start() {
    this.loadSounds();
    this.setTurnOrder();
    this.makeMonsterCards();
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
  }
}

module.exports = Battle;
