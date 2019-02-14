const guid = require('guid.js');
const Component = require('Component.js');
const Canvas = require('Canvas.js');
const Sprite = require('Sprite.js');
const Terrain = require('Terrain.js');
const Team = require('Team.js');
const TeamViewer = require('TeamViewer.js');
const SoundPlayer = require('SoundPlayer.js');
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
class ControlPanel extends Component {
  constructor() {
    super(true);
  }

  static get style() {
    return html`<style>
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
    </style>`;
  }

  renderItem(item) {
    let t = html`<div class='control-item'>
    </div>`;
    if(item.g) {
      t.appendChild(item.g.canvas.clone());
    }
    if(item.o) {
      t.appendChild(item.o.canvas.clone());
    }
    if(item.m) {
      item.m.monsters.forEach(m => {
        t.appendChild(m.canvas.clone());
      })
    }
    if(item.d) {
      t.appendChild(item.d.render());
    }
    if(item.t) {
      t.appendChild(html`<div>Transports to: ${item.t.x}, ${item.t.y}</div>`);
    }
    return t;
  }

  render(layers) {
    let {select, dialog, ground, obstacles, monsters, transport} = layers;
    this.clear();
    this.addStyle(ControlPanel.style);
    let c = html`<div id='control-panel'></div>`;
    let items = [];
    select.items.each(item => {
      if(!item.item) return;
      let d = dialog.items.get(item.x, item.y);
      let g = ground.items.get(item.x, item.y);
      let o = obstacles.items.get(item.x, item.y);
      let m = monsters.items.get(item.x, item.y);
      let t = transport.items.get(item.x, item.y);
      items.push({d,g,o,m,t});
    })
    items.forEach(item => {
      let t = this.renderItem(item);
      c.appendChild(t);

    });
    this.append(c);
    return this.tags.outer;
  }
}
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
  constructor(name, w, h, tw, th) {
    this.name = name;
    this.items = new PL(w, h);
    this.canvas = new Canvas(tw * w, th * h);
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
      ground: new Layer('ground', this.w, this.h, this.tw, this.th),
      obstacles: new Layer('obstacles', this.w, this.h, this.tw, this.th),
      select: new Layer('select', this.w, this.h, this.tw, this.th),
      grid: new Layer('grid', this.w, this.h, this.tw, this.th),
      preselect: new Layer('preselect', this.w, this.h, this.tw, this.th),
      dialog: new Layer('dialog', this.w, this.h, this.tw, this.th),
      monsters: new Layer('monsters', this.w, this.h, this.tw, this.th),
      transport: new Layer('transport', this.w, this.h, this.tw, this.th),
      fog: new Layer('fog', this.w, this.h, this.tw, this.th)
    };
    this.layers.fog.items.each(i => this.layers.fog.items.set(i.x, i.y, true));
    this.resources = [

    ];
    this.tags.resources = new Component();
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

      #resources {
        position: fixed;
        top: 0px;
        left: 0px;
        display: inline-block;
        padding: 10px;
        background-image: url(sheet_of_old_paper.png);
        z-index: 10;
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

  addPlayer(p) {
    this.player = p;
    this.movePlayer(this.startPosition.x, this.startPosition.y);
    this.layers.monsters.items.set(this.pp.x, this.pp.y, p.team);
    this.resources.push(new Resource('gold', this.player.gold, goldIcon));
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
      this.walk(this.player.team, path)
      .then(() => {
      })
      .catch(e => {
        console.log('walk error', e);
      });
    }

    // Interactables
    if(!item) return;
    if(item.adventure.event != 'click') return;
    if(obstacles.items.distance(this.pp.x, this.pp.y, mp.x, mp.y) > 1) return;
    console.log(item)
    if(item && item.adventure.action == 'give gold') {
      this.addGold(item.adventure.actionAmount);
      this.sp.play('gold');
      obstacles.items.remove(mp.x, mp.y);
      this.draw(obstacles);
      this.updateResources();
    }
    if(item && item.adventure.action == 'open tavern') {
      this.sp.play('open_book');
      this.trigger('tavern');
    }

    let trans = transport.items.get(mp.x, mp.y);
    if(trans) {
      let empty = obstacles.items.closestEmpty(trans.x, trans.y);
      this.movePlayer(empty.x, empty.y);
      this.draw(monsters);
    }

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
    this.sprite = new Sprite(icon.bio.sprite);
  }

  render() {
    this.clear();
    let t = html`<div id='resources'>
      <span class='icon'></span>
      <span class='amount'>${this.amount}</span>
    </div>`;
    t.querySelector('.icon').appendChild(this.sprite.canvas);
    this.append(t);
    return this.tags.outer;
  }
}

class AdventureEditor extends Adventure {
  constructor(w, h) {
    super(w, h, 12, 12);
    this.cp = new ControlPanel();
  }

  draw(layer) {
    if(layer == this.layers.select) {
      this.renderControlPanel();
    }
    Adventure.prototype.draw.call(this, layer);
  }

  compressLayer(layer) {
    let l = [];
    let pl = new PL(layer.items.w, layer.items.h);
    layer.items.each((item, i) => {
      if(!item.item) return;
      let id = item.item.template.id;
      let index = l.indexOf(id);
      if(!~index) {
        index = l.push(id) - 1;
      }
      pl.set(item.x, item.y, index);
    })
    return {lookup: l, items: pl.items};
  }

  save() {
    let body = {
      name: this.name,
      w: this.w,
      h: this.h,
      startPosition: this.startPosition,
      layers: {
        ground: this.compressLayer(this.layers.ground),
        obstacles: this.compressLayer(this.layers.obstacles),
        monsters: this.compressLayer(this.layers.monsters),
        dialog: this.layers.dialog.items._filled(),
        transport: this.layers.transport.items._filled()
      }
    };
    let id = this.id;
    let url = 'saveAdventure';
    if(id) {
      url += '?id=' + id;
    }
    return fetch(url, {
      method: 'POST',
      body: JSON.stringify(body)
    })
    .then(res => res.text())
    .then(id => {
      this.id = id;
      console.log('saved adventure', id)
    })
  }

  mouseDown(e) {
    if(e.button != 0) return;
    this.mouse.down = e;
  }

  mouseUp(e) {
    if(e.button != 0) return;
    this.mouse.up = e;
    let p = this.tpos(e);
    this.layers.preselect.items.set(p.x, p.y, selectSprite);
    this.select();
  }

  mouseMove(e) {
    if(!this.mouse.down) return;
    this.mouse.move = e;
    this.drawPreSelect();
  }

  deselectAll() {
    this.layers.select.items.purge();
    this.draw(this.layers.select);
    this.removeControlPanel();
  }

  invertSelection() {
    let layer = this.layers.select;
    layer.items.invert(selectSprite);
    this.draw(layer);
  }

  select() {
    let layer = this.layers.select;
    let remove = this.mouse.down.shiftKey || this.mouse.up.shiftKey;
    this.layers.preselect.items.transfer(layer.items, true, remove);
    this.draw(layer);
    this.draw(this.layers.preselect);
    this.mouse.down = null;
    this.mouse.up = null;
    this.mouse.move = null;
  }

  get selected() {
    return this.layers.select.items._filled();
  }

  drawPreSelect() {
    let layer = this.layers.preselect;
    layer.items.purge();
    layer.canvas.clear();
    let s = this.tpos(this.mouse.down);
    let e = this.tpos(this.mouse.move);
    let sx = Math.min(s.x, e.x);
    let sy = Math.min(s.y, e.y);
    let ex = Math.max(s.x, e.x);
    let ey = Math.max(s.y, e.y);
    let tiles = [];
    if(this.mouse.move.ctrlKey) {
      let r = layer.items.squareRadius(sx, sy, ex, ey);
      tiles = layer.items.inRadius(s.x, s.y, r);
    } else {
      tiles = layer.items.inRect(sx, sy, ex, ey);
    }
    tiles.forEach(t => {
      layer.items.set(t.x, t.y, selectSprite);
    })
    this.draw(layer);
  }

  applyTerrain(t, layer) {
    this.layers.select.items.each(item => {
      if(!item.item) return;
      layer.items.set(item.x, item.y, t);
    });
    this.draw(layer);
  }

  zoom(e) {
    e.preventDefault();
    this.zoomed = !this.zoomed;
    if(this.zoomed) {
      this.tw = this.th = 12;
    } else {

      this.tw = this.th = 32;
    }
    this.clear();
    this.render();
  }

  renderControlPanel() {
    // this.unmount(this.cp.tags.outer);
    this.append(this.cp.render(this.layers));
  }

  removeControlPanel() {
    this.cp.unmount();
  }

  remove(layer) {
    this.layers.select.items.each(item => {
      if(!item.item) return;
      layer.items.remove(item.x, item.y);
    });
    this.draw(layer);
  }

  setName(e) {
    this.name = e.target.value;
  }

  addDialog(e) {
    let {dialog, select} = this.layers;
    let selections = select.items._filled();
    if(selections.length != 1) return;
    let item = selections[0];
    let d = dialog.items.get(item.x, item.y) || new Dialog('Add dialog text...', true);
    dialog.items.set(item.x, item.y, d);
    this.renderControlPanel();
  }

  keyup(e) {
    if(e.key == 'Escape') {
      this.deselectAll();
    }
  }

  addMonsters() {
    let tv = new TeamViewer();
    this.append(tv.render());
    tv.on('done', team => {
      tv.unmount();
      let {monsters, select} = this.layers;
      select.items.filled(item => {
        monsters.items.set(item.x, item.y, Team.create(team));
      });
      this.draw(monsters);
    });
    tv.on('close', () => {
      tv.unmount();
    })
  }

  removeMonsters(e) {
    let {monsters} = this.layers;
    this.selected.forEach(item => {
      monsters.items.remove(item.x, item.y);
    })
    this.draw(monsters);
  }

  addStartPosition() {
    let selected = this.selected;
    if(selected.length != 1) return;
    this.startPosition = {x: selected[0].x, y: selected[0].y};
  }

  addTransport(e) {
    let selected = this.selected;
    if(selected.length != 2) return;
    this.layers.transport.items.set(selected[1].x, selected[1].y, selected[0]);
    this.layers.transport.items.set(selected[0].x, selected[0].y, selected[1]);
    this.renderControlPanel();
  }

  removeTransport() {
    let {transport} = this.layers;
    this.selected.forEach(item => {
      transport.items.remove(item.x, item.y);
    })
    this.renderControlPanel();
    this.draw(transport);
  }

  render() {
    this.clear();
    this.addStyle(Adventure.style(this));

    Object.keys(this.layers).forEach(key => {
      this.layers[key]
      if(!this.layers[key].canvas) return;
      this.layers[key].canvas.canvas.id = 'canvas-' + key;
      this.layers[key].canvas.resize(this.w * this.tw, this.h * this.th);
      this.layers[key].items && this.draw(this.layers[key]);
    })

    let a = html`<div class='adventure'></div>`;
    window.addEventListener('keyup', this.keyup.bind(this));
    a.addEventListener('mousedown', this.mouseDown.bind(this));
    a.addEventListener('mouseup', this.mouseUp.bind(this));
    a.addEventListener('mousemove', this.mouseMove.bind(this));
    a.addEventListener('contextmenu', this.zoom.bind(this));
    a.appendChild(this.layers.ground.canvas.canvas);
    a.appendChild(this.layers.obstacles.canvas.canvas);
    a.appendChild(this.layers.select.canvas.canvas);
    a.appendChild(this.layers.grid.canvas.canvas);
    a.appendChild(this.layers.preselect.canvas.canvas);
    a.appendChild(this.layers.monsters.canvas.canvas);

    let foot = html`<div class='foot'>
      <div class='tools' id='ground'><div>Ground</div></div>
      <div class='tools' id='obstacles'><div>Obstacles</div></div>
      <div class='tools' id='obstacles'>
        <div>Controls</div>
        <button id='save-adventure'>Save</button>
        <input id='adventure-name' value='${this.name}'>
        <button id='add-dialog'>Dialog</button>
        <button id='add-monsters'>Add Monsters</button>
        <button id='remove-monsters'>Remove Monsters</button>
        <button id='add-start-position'>Set Start</button>
        <button id='add-transport'>Add Transport</button>
        <button id='remove-transport'>Remove Transport</button>
      </div>
    </div>`;

    foot.querySelector('#save-adventure').addEventListener('click', this.save.bind(this));
    foot.querySelector('#adventure-name').addEventListener('keyup', this.setName.bind(this));
    foot.querySelector('#add-dialog').addEventListener('click', this.addDialog.bind(this));
    foot.querySelector('#add-monsters').addEventListener('click', this.addMonsters.bind(this));
    foot.querySelector('#remove-monsters').addEventListener('click', this.removeMonsters.bind(this));
    foot.querySelector('#add-start-position').addEventListener('click', this.addStartPosition.bind(this));
    foot.querySelector('#add-transport').addEventListener('click', this.addTransport.bind(this));
    foot.querySelector('#remove-transport').addEventListener('click', this.removeTransport.bind(this));
    let ground = foot.querySelector('#ground');
    let obstacles = foot.querySelector('#obstacles');
    terrains.forEach(tpl => {
      let t = new Terrain(tpl);
      let s = t.sprite;
      tpl.canvas = s.canvas;
      if(t.stats.walkable) {
        ground.appendChild(tpl.canvas);
        tpl.canvas.addEventListener('click', e => this.applyTerrain(t, this.layers.ground));
      } else {
        obstacles.appendChild(tpl.canvas);
        tpl.canvas.addEventListener('click', e => this.applyTerrain(t, this.layers.obstacles));
      }
    });

    let deselect = new Sprite(deselectIcon.bio.sprite);
    deselect.canvas.addEventListener('click', this.deselectAll.bind(this) );
    let removeGround = new Sprite(removeIcon.bio.sprite);
    removeGround.canvas.addEventListener('click', e => this.remove(this.layers.ground));
    let removeObstacles = new Sprite(removeIcon.bio.sprite);
    removeObstacles.canvas.addEventListener('click', e => this.remove(this.layers.obstacles));
    let invertSelection = new Sprite(invertIcon.bio.sprite);
    invertSelection.canvas.addEventListener('click', e => this.invertSelection());

    ground.appendChild(removeGround.canvas);
    obstacles.appendChild(deselect.canvas);
    obstacles.appendChild(removeObstacles.canvas);
    obstacles.appendChild(invertSelection.canvas);
    this.append(a);
    this.append(foot);
  }
}

class Transport {
  constructor(p1, p2) {
    this.tiles = [
      {x: p1.x, y: p1.y},
      {x: p2.x, y: p2.y}
    ];
  }
}

Adventure.Editor = AdventureEditor;

module.exports = Adventure;
