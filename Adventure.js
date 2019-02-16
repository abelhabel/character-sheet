const guid = require('guid.js');
const Component = require('Component.js');
const Canvas = require('Canvas.js');
const Sprite = require('Sprite.js');
const Terrain = require('Terrain.js');
const Team = require('Team.js');
const TeamViewer = require('TeamViewer.js');
const SoundPlayer = require('SoundPlayer.js');
const AdventureTime = require('AdventureTime.js');
const AdventureMenu = require('AdventureMenu.js');
const PL = require('PositionList2d.js');
const icons = require('icons.js');
const terrains = require('terrains.js');
const teams = require('teams.js');
const selectedIcon = icons.find(i => i.bio.name == 'Hit Background');
const deselectIcon = icons.find(i => i.bio.name == 'Stop');
const removeIcon = icons.find(i => i.bio.name == 'Delete');
const invertIcon = icons.find(i => i.bio.name == 'Invert');
const goldIcon = icons.find(i => i.bio.name == 'Gold');
const tileTargetIcon = icons.find(i => i.bio.name == 'Tile Target');
const selectSprite = new Sprite(selectedIcon.bio.sprite);
const tileTargetSprite = new Sprite(tileTargetIcon.bio.sprite);
const goldSprite = new Sprite(goldIcon.bio.sprite);

class Dialog extends Component {
  constructor(text) {
    super(true);
    this.text = text || '';
  }

  static get style() {
    return html`<style>
      .dialog {
        font-family: Tahoma, sans-serif;
        padding: 10px;
        background-color: beige;
      }
    </style>`;
  }

  setText(e) {
    this.text = e.target.value;
  }

  render() {
    this.clear();
    this.addStyle(Dialog.style);
    let t = html`<div class='dialog'>
      <textarea>${this.text}</textarea>
    </div>`;
    t.querySelector('textarea').addEventListener('keyup', this.setText.bind(this))
    this.append(t);
    return this.tags.outer;
  }
}

class Layer {
  constructor(name, canvas, w, h, tw, th) {
    this.name = name;
    this.items = new PL(w, h);
    this.canvas = canvas && new Canvas(tw * w, th * h);
    this.animations = [];
  }
}

class Adventure extends Component {
  constructor(w, h, tw, th) {
    super(true);
    this.id = '';
    this.name = "Adventure";
    this.tw = tw || 42;
    this.th = th || 42;
    this.w = w;
    this.h = h;
    this.zoomed = true;
    this.startPosition = {x: 0, y: 0};
    this.layers = {
      ground: new Layer('ground', true, this.w, this.h, this.tw, this.th),
      obstacles: new Layer('obstacles', true, this.w, this.h, this.tw, this.th),
      select: new Layer('select', true, this.w, this.h, this.tw, this.th),
      grid: new Layer('grid', true, this.w, this.h, this.tw, this.th),
      preselect: new Layer('preselect', true, this.w, this.h, this.tw, this.th),
      dialog: new Layer('dialog', false, this.w, this.h, this.tw, this.th),
      monsters: new Layer('monsters', true, this.w, this.h, this.tw, this.th),
      transport: new Layer('transport', false, this.w, this.h, this.tw, this.th),
      fog: new Layer('fog', true, this.w, this.h, this.tw, this.th)
    };
    this.layers.fog.items.each(i => this.layers.fog.items.set(i.x, i.y, true));
    this.resources = [

    ];
    this.tags.resources = new Component(false, 'resources');
    this.tags.time = new AdventureTime();
    this.menu = new AdventureMenu();
    this.menu.on('end turn', () => this.tags.time.nextDay());
    this.menu.on('open inventory', () => this.openInventory());
    this.panSpeed = 10;
    this.pans = {x: 0, y: 0};
    this.mouse = {
      up: null,
      down: null,
      move: null
    };
    this.player = null;
    this.pp = {x: 0, y: 0};
    this.sp = new SoundPlayer();
  }

  static style(a) {
    return html`<style>
      .adventure {
        position: relative;
        width: ${a.tw * a.w}px;
        height: ${a.th * a.h}px;
        border: 1px solid black;
        margin-bottom: 64px;
      }
      .adventure canvas {
        position: absolute;
        top: 0px;
        left: 0px;
      }

      #adventure-menu {
        position: fixed;
        top: 0px;
        right: 0px;
        width: 250px;
        height: 250px;
      }

      #adventure-menu .menu-item {
        position: absolute;
        border: 4px solid #13667d;
        width: 40px;
        height: 40px;
        padding: 4px;
        border-radius: 50%;
      }

      * {
        box-sizing: border-box;
      }

      #adventure-menu .menu-item canvas {
        width: 32px;
        height: 32px;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        position: absolute;
      }

      #adventure-menu .menu-item:hover {
        background-image: url(sheet_of_old_paper.png);
      }

      #adventure-menu .center {
        width: 40%;
        height: 40%;
        border-radius: 50%;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        position: absolute;
        border: 4px solid #13667d;
      }

      #adventure-menu .texture {
        background-image: url(sheet_of_old_paper.png);
        background-blend-mode: overlay;
      }

      #adventure-menu .center.menu-item {
        width: 40px;
        height: 40px;
      }

      #inventory {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-image: url(sheet_of_old_paper.png);
        padding: 10px;
        border: 4px solid #13667d;
        box-sizing: content-box;
      }

      #inventory .item {
        display: inline-block;
        vertical-align: top;
      }

      #inventory .item:hover {
        background-color: rgba(0,0,0,0.1);
      }

      #inventory .item.selected {
        background-color: rgba(0,255,0,0.3);
      }

      #inventory .name {
        position: absolute;
        top: -16px;
        left: 0px;
        background-image: url(sheet_of_old_paper.png);
        border-radius: 2px 2px 0px 0px;
      }
      #inventory .actions {
        position: absolute;
        bottom: -16px;
        right: 0px;
        background-image: url(sheet_of_old_paper.png);
        border-radius: 0px 0px 2px 2px;
      }
      #inventory .actions .action {
        display: inline-block;
        user-select: none;
        padding: 2px 4px;
      }
      #inventory .actions .action:hover {
        background-color: rgba(0,0,0,0.1);
      }
      #inventory .close {
        position: absolute;
        top: 2px;
        right: 2px;
        color: white;
        background-color: black;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        text-align: center;
        line-height: 18px;
      }

      .foot {
        position: fixed;
        bottom: 0px;
        background-color: lightgray;
      }

      .tools {
        user-select: none;
        display: inline-block;
        vertical-align: top;
      }
      #control-panel {
        position: fixed;
        top: 0px;
        right: 0px;
        z-index: 1;
        background-color: beige;
        padding: 5px;
      }
      .control-item {
        border: 1px solid black;
        padding: 2px;
      }

      .resources, .time {
        position: fixed;
        top: 0px;
        left: 0px;
        display: inline-block;
        padding: 10px;
        background-image: url(sheet_of_old_paper.png);
        z-index: 10;
      }
      .time {
        left: 64px;
      }


      .resources .resource {
        display: inline-block;
      }

      .message-box {
        position: fixed;
        z-index: 100;
        width: 400px;
        height: 300px;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        background-image: url(sheet_of_old_paper.png);
        border-radius: 10px;
        box-shadow: 1px 5px 7px 0px rgba(0,0,0,0.5);
        font-size: 20px;
        border: 2px solid rgba(72, 61, 10, 0.6);
        padding: 20px;
      }

      .message-box button {
        box-shadow: 0px 2px 4px -1px rgba(0,0,0,0.5);
        background-color: transparent;
        border: none;
        outline: none;
        padding: 10px;
        cursor: inherit;
        border-radius: 4px;
      }

      .message-box button:hover {
        background-color: rgba(0,0,0,0.1);
      }
    </style>`;
  }

  static create(t) {
    let a = new this(t.w, t.h);
    a.id = t.id;
    a.name = t.name;
    a.startPosition = t.startPosition;
    let ter = t.layers.ground.lookup.map(id => {
      let tpl = terrains.find(t => t.id == id);
      let item = new Terrain(tpl);
      return item;
    })
    t.layers.ground.items.forEach((n, i) => {
      let xy = a.layers.ground.items.xy(i);
      if(n === null) return;
      let item = ter[n];
      a.layers.ground.items.set(xy.x, xy.y, item);
    });
    ter = t.layers.obstacles.lookup.map(id => {
      let tpl = terrains.find(t => t.id == id);
      let item = new Terrain(tpl);
      return item;
    })
    t.layers.obstacles.items.forEach((n, i) => {
      let xy = a.layers.obstacles.items.xy(i);
      if(n === null) return;
      let item = ter[n];
      a.layers.obstacles.items.set(xy.x, xy.y, item);
    });
    if(t.layers.monsters) {
      ter = t.layers.monsters.lookup.map(id => {
        let tpl = teams.find(t => t.id == id);
        let item = Team.create(tpl);
        item.aid = guid();
        return item;
      })
      t.layers.monsters.items.forEach((n, i) => {
        let xy = a.layers.monsters.items.xy(i);
        if(n === null) return;
        let item = ter[n];
        a.layers.monsters.items.set(xy.x, xy.y, item);
      });
    }
    if(t.layers.dialog) {
      t.layers.dialog.forEach(item => {
        a.layers.dialog.items.set(item.x, item.y, new Dialog(item.item.text));
      });
    }

    if(t.layers.transport) {
      t.layers.transport.forEach(item => {
        a.layers.transport.items.set(item.x, item.y, item.item);
      });
    }

    return a;
  }

  openInventory() {
    this.append(this.player.inventory.render());
  }

  addObstacle(x, y, item) {
    let {obstacles} = this.layers;
    let empty = obstacles.items.closestEmpty(x, y);
    obstacles.items.set(empty.x, empty.y, item);
    this.draw(obstacles);

  }

  addPlayer(p) {
    this.player = p;
    this.movePlayer(this.startPosition.x, this.startPosition.y);
    this.player.movesLeft = this.player.movement;
    this.layers.monsters.items.set(this.pp.x, this.pp.y, p.team);
    this.resources.push(new Resource('gold', this.player.gold, goldIcon));
    this.tags.time.player = this.player;
    this.draw(this.layers.monsters);
  }

  drawGuides() {
    let c = this.layers.grid.canvas;
    this.layers.ground.items.eachRow((x, y) => {
      if(!y) return;
      c.drawLine(0, y * this.th, this.w * this.tw, y * this.th, '#ccc');
    })
    this.layers.ground.items.eachCol((x, y) => {
      if(!x) return;
      c.drawLine(x * this.tw, 0, x * this.tw, this.h * this.th, '#ccc');
    })
  }

  tpos(e) {
    let x = Math.floor(e.offsetX / this.tw);
    let y = Math.floor(e.offsetY / this.th);
    return {x, y};
  }

  drawOne(layer, x, y) {
    let item = layer.items.get(x, y);
    layer.canvas.clearRect(x, y, this.tw, this.th);
    if(!item) return;
    if(item instanceof Sprite) {
      layer.canvas.drawSprite(item, x * this.tw, y * this.th, this.tw, this.th);
    }
    if(item instanceof Terrain) {
      layer.canvas.drawSprite(item.sprite, x * this.tw, y * this.th, this.tw, this.th);
      if(item.stats.animation) {
        this.animateTerrain({item,x,y}, layer);
      }
    }
    if(item instanceof Team) {
      layer.canvas.drawSprite(item.highestTier.sprite, x * this.tw, y * this.th, this.tw, this.th);
    }
  }

  draw(layer) {
    if(!layer.canvas) return;
    layer.canvas.clear();
    this.clearAnimations(layer);
    if(!layer.items) return;
    layer.items.each(item => {
      if(!item.item) return;
      if(item.item instanceof Sprite) {
        layer.canvas.drawSprite(item.item, item.x * this.tw, item.y * this.th, this.tw, this.th);
      }
      if(item.item instanceof Terrain) {
        layer.canvas.drawSprite(item.item.sprite, item.x * this.tw, item.y * this.th, this.tw, this.th);
        if(item.item.stats.animation) {
          this.animateTerrain(item, layer);
        }
      }
      if(item.item instanceof Team) {
        layer.canvas.drawSprite(item.item.highestTier.sprite, item.x * this.tw, item.y * this.th, this.tw, this.th);
      }
      if(layer.name == 'fog') {
        layer.canvas.drawRect(item.x * this.tw, item.y * this.th, this.tw, this.th);
      }
    });
  }

  clearAnimations(layer) {
    if(!layer.animations) return;
    layer.animations.forEach(a => {
      clearInterval(a);
    });
    layer.animations = [];
  }

  animateTerrain(item, layer) {
    layer.animations[layer.animations.length] = setInterval(() => {
      layer.canvas.clearRect(item.x * this.tw, item.y * this.th, this.tw, this.th);
      layer.canvas.drawSprite(item.item.sprite, item.x * this.tw, item.y * this.th, this.tw, this.th);
    }, item.item.fps);
  }

  previewPath(e) {
    let p = this.tpos(e);
  }

  mouseMove(e) {
    this.mouse.move = e;

    !this.moving && this.highlightMovementTile();
  }

  mouseUp(e) {
    this.mouse.up = e;
    let mp = this.tpos(e);
    let {obstacles, transport, monsters, dialog} = this.layers;
    let item = obstacles.items.get(mp.x, mp.y);

    // Movement
    if(obstacles.items.canWalkTo(this.pp.x, this.pp.y, mp.x, mp.y)) {
      let path = obstacles.items.path(this.pp.x, this.pp.y, mp.x, mp.y);
      path.shift();
      this.walk(this.player.team, path)
      .then(() => {
      })
      .catch(e => {
        console.log('walk error', e);
      });
    }

    // Transportation
    let trans = transport.items.get(mp.x, mp.y);
    if(trans) {
      let empty = obstacles.items.closestEmpty(trans.x, trans.y);
      this.movePlayer(empty.x, empty.y);
      this.draw(monsters);
      this.centerOnPlayer();
    }

    // Dialog
    let d = dialog.items.get(mp.x, mp.y);
    if(d) {
      let dtag = html`<div class='message-box'>
        <p>${d.text}</p>
        <button>Close</button>
      </div>`;
      dtag.querySelector('button').addEventListener('click', () => {
        dtag.parentNode.removeChild(dtag);
      })
      this.append(dtag);
      this.sp.play('open_book');
    }


    // Interactables
    if(!item) return;
    if(item.adventure.event != 'click') return;
    if(obstacles.items.distance(this.pp.x, this.pp.y, mp.x, mp.y) > 1) return;
    if(item.adventure.action == 'give gold') {
      this.addGold(item.adventure.actionAmount);
      this.sp.play('gold');
      obstacles.items.remove(mp.x, mp.y);
      this.draw(obstacles);
      this.updateResources();
    }
    if(item.adventure.action == 'give item') {
      this.player.inventory.add(new Terrain(item.template));
      obstacles.items.remove(mp.x, mp.y);
      this.draw(obstacles);
      this.updateResources();
    }
    if(item.adventure.action == 'open tavern') {
      this.sp.play('open_book');
      this.trigger('tavern');
    }

  }

  addGold(n) {
    this.player.gold += n;
    let r = this.resources.find(r => r.name == 'gold');
    r.amount = this.player.gold;
  }

  updateResources() {
    this.tags.resources.clear();
    this.resources.forEach(r => this.tags.resources.append(r.render()));
  }

  mouseLeave(e) {
    this.mouse.leave = e;
    this.mouse.enter = null;
  }

  mouseEnter(e) {
    this.mouse.leave = null;
    this.mouse.enter = e;
  }

  highlightMovementTile(x, y, i) {
    let mp = this.tpos(this.mouse.move);
    let {monsters, obstacles, select} = this.layers;
    select.canvas.clear();
    let path = obstacles.items.path(this.pp.x, this.pp.y, mp.x, mp.y);
    path.shift();
    let c = select.canvas;
    path.forEach((p, i) => {
      if(!this.player.movesLeft || i > this.player.movesLeft) return;
      c.drawSprite(tileTargetSprite, p[0] * this.tw, p[1] * this.th, this.tw, this.th);
    });
  }

  killTeam(tile) {
    let {monsters} = this.layers;
    let item = monsters.items.remove(tile[0], tile[1]);
    this.draw(monsters);
  }

  walk(a, path) {
    let monsters = this.layers.monsters;
    this.moving = true;
    var int;
    var done = (resolve) => {
      this.moving = false;
      clearInterval(int);
      resolve();
    };
    return new Promise((resolve, reject) => {
      int = setInterval(() => {
        let p = path.shift();
        if(!p) {
          return done(resolve);
        }
        let item = monsters.items.get(p[0], p[1]);
        if(item && item != a) {
          this.trigger('battle', item, p);
          return done(resolve);
        }
        this.movePlayer(p[0], p[1]);
        this.sp.play('move');
        // this.draw(monsters);
        if(!path.length) {
          done(resolve);
        }
      }, 100);

    })
  }

  movePlayer(x, y) {
    if(this.player.movesLeft < 1) return;
    let {monsters, fog} = this.layers;
    monsters.canvas.clearRect(this.pp.x * this.tw, this.pp.y * this.th, this.tw, this.th);
    monsters.items.remove(this.pp.x, this.pp.y);
    this.pp = {x, y};
    monsters.items.set(x, y, this.player.team);
    monsters.canvas.drawSprite(this.player.team.highestTier.sprite, this.pp.x * this.tw, this.pp.y * this.th, this.tw, this.th);
    let reveal = fog.items.inRadius(x, y, this.player.vision);
    reveal.forEach(item => {
      fog.items.set(item.x, item.y, false);
      fog.canvas.clearRect(item.x * this.tw, item.y * this.th, this.tw, this.th);
    });
    this.player.movesLeft -= 1;
    this.tags.time.player && this.tags.time.render();
  }

  centerOnPlayer() {
    let left = this.pp.x * this.tw - window.innerWidth/2;
    left = Math.max(0, left);
    left = Math.min(this.w * this.tw - window.innerWidth, left);
    let top = this.pp.y * this.th - window.innerWidth/2;
    top = Math.max(0, top);
    top = Math.min(this.h * this.th - window.innerHeight, top);
    this.pan(-left / this.panSpeed, -top / this.panSpeed);
  }

  edgeScrolling() {
    if(this.mouse.leave) return;
    let e = this.mouse.move;
    if(!e) return;
    let x = window.innerWidth - e.clientX > 0 && e.clientX > window.innerWidth - 50 ? -1 : (e.clientX < 50 ? 1 : 0);
    let y = window.innerHeight - e.clientY > 0 && e.clientY > window.innerHeight - 50 ? -1 : (e.clientY < 50 ? 1 : 0);
    this.pan(x, y);
  }

  pan(x, y) {
    let a = this.shadow.querySelector('.adventure');
    this.pans.x += this.panSpeed * x;
    this.pans.y += this.panSpeed * y;
    if(this.pans.x > 0) this.pans.x = 0;
    if(this.pans.y > 0) this.pans.y = 0;
    if(this.pans.x < window.innerWidth - this.w * this.tw) {
      this.pans.x = window.innerWidth - this.w * this.tw
    }
    if(this.pans.y < window.innerHeight - this.h * this.th) {
      this.pans.y = window.innerHeight - this.h * this.th;
    };
    a.style.left = this.pans.x + 'px';
    a.style.top = this.pans.y + 'px';
  }

  render() {
    this.clear();
    this.addStyle(Adventure.style(this));

    let a = html`<div class='adventure'></div>`;
    this.tags.resources.id = 'resources';
    this.append(this.tags.resources.tags.outer);
    this.append(this.tags.time.render());
    this.updateResources();
    Object.keys(this.layers).forEach(key => {
      this.layers[key]
      if(!this.layers[key].canvas) return;
      this.layers[key].canvas.canvas.id = 'canvas-' + key;
      this.layers[key].canvas.resize(this.w * this.tw, this.h * this.th);
      this.layers[key].items && this.draw(this.layers[key]);
      a.appendChild(this.layers[key].canvas.canvas);
    })
    a.addEventListener('mousemove', this.mouseMove.bind(this));
    a.addEventListener('mouseup', this.mouseUp.bind(this));
    a.addEventListener('mouseenter', this.mouseEnter.bind(this));
    a.addEventListener('mouseleave', this.mouseLeave.bind(this));
    this.append(a);
    this.append(this.menu.render());
    setInterval(this.edgeScrolling.bind(this), 25);
    this.draw(this.layers.fog);
    return this.tags.outer;
  }


}

class Resource extends Component {
  constructor(name, amount, icon) {
    super();
    this.name = name;
    this.amount = amount || 0;
    this.sprite = icon instanceof Sprite ? icon : new Sprite(icon.bio.sprite);
  }

  render() {
    this.clear();
    let t = html`<div id='resource'>
      <span class='icon'></span>
      <span class='amount'>${this.amount}</span>
    </div>`;
    t.querySelector('.icon').appendChild(this.sprite.canvas);
    this.append(t);
    return this.tags.outer;
  }
}

module.exports = Adventure;
