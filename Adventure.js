const Component = require('Component.js');
const Canvas = require('Canvas.js');
const Sprite = require('Sprite.js');
const Terrain = require('Terrain.js');
const Team = require('Team.js');
const TeamViewer = require('TeamViewer.js');
const PL = require('PositionList2d.js');
const icons = require('icons.js');
const terrains = require('terrains.js');
const teams = require('teams.js');
const selectedIcon = icons.find(i => i.bio.name == 'Hit Background');
const deselectIcon = icons.find(i => i.bio.name == 'Stop');
const removeIcon = icons.find(i => i.bio.name == 'Delete');
const invertIcon = icons.find(i => i.bio.name == 'Invert');
const tileTargetIcon = icons.find(i => i.bio.name == 'Tile Target');
const selectSprite = new Sprite(selectedIcon.bio.sprite);
const tileTargetSprite = new Sprite(tileTargetIcon.bio.sprite);
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
    let t = html`<div class='control-item'></div>`;
    if(item.g) {
      t.appendChild(item.g.canvas.clone());
    }
    if(item.o) {
      t.appendChild(item.o.canvas.clone());
    }
    if(item.m) {
      console.log(item)
      item.m.monsters.forEach(m => {
        t.appendChild(m.canvas.clone());
      })
    }
    if(item.d) {
      console.log('render dialog', item.d)
      t.appendChild(item.d.render());
    }
    return t;
  }

  render(layers) {
    let {select, dialog, ground, obstacles, monsters} = layers;
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
      items.push({d,g,o,m});
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
      ground: {
        name: 'ground',
        items: new PL(this.w, this.h),
        canvas: new Canvas(this.tw * this.w, this.th * this.h),
        animations: [],
      },
      obstacles: {
        name: 'obstacles',
        items: new PL(this.w, this.h),
        canvas: new Canvas(this.tw * this.w, this.th * this.h),
        animations: [],
      },
      select: {
        name: 'select',
        items: new PL(this.w, this.h),
        canvas: new Canvas(this.tw * this.w, this.th * this.h),
        animations: [],
      },
      grid: {
        name: 'grid',
        items: null,
        canvas: new Canvas(this.tw * this.w, this.th * this.h),
        animations: [],
      },
      preselect: {
        name: 'preselect',
        items: new PL(this.w, this.h),
        canvas: new Canvas(this.tw * this.w, this.th * this.h),
        animations: [],
      },
      dialog: {
        name: 'dialog',
        items: new PL(this.w, this.h),
        canvas: null,
        animations: [],
      },
      monsters: {
        name: 'monsters',
        items: new PL(this.w, this.h),
        canvas: new Canvas(this.tw * this.w, this.th * this.h),
        animations: [],
      }
    };
    this.panSpeed = 10;
    this.pans = {x: 0, y: 0};
    this.mouse = {
      up: null,
      down: null,
      move: null
    };
    this.player = null;
    this.pp = {x: 0, y: 0};
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

    return a;
  }

  addPlayer(team) {
    this.player = team;
    this.pp = Object.assign({}, this.startPosition);
    this.layers.monsters.items.set(this.pp.x, this.pp.y, team);
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

  draw(layer) {
    layer.canvas && layer.canvas.clear();
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
    let {obstacles} = this.layers;
    if(obstacles.items.canWalkTo(this.pp.x, this.pp.y, mp.x, mp.y)) {
      let path = obstacles.items.path(this.pp.x, this.pp.y, mp.x, mp.y);
      this.walk(this.player, path)
      .then(() => {
        console.log('walk done');
      })
      .catch(e => {
        console.log('walk error', e);
      });
    }
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

  killTeam(teamId) {
    console.log('killTeam', teamId);
    let {monsters} = this.layers;
    let item = monsters.items.find(item => item.item.id == teamId);
    console.log(item);
    monsters.items.remove(item.x, item.y);
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
        if(item && item != this.player) {
          console.log('battle ahead', item);
          this.trigger('battle', item);
          return done(resolve);
        }
        monsters.items.remove(this.pp.x, this.pp.y);
        this.pp = {x: p[0], y: p[1]};
        monsters.items.set(p[0], p[1], a);
        this.draw(monsters);
        if(!path.length) {
          done(resolve);
        }
      }, 100);

    })
  }

  edgeScrolling() {
    if(this.mouse.leave) return;
    let e = this.mouse.move;
    if(!e) return;
    let x = window.innerWidth - e.offsetX > 0 && e.offsetX > window.innerWidth - 50 ? -1 : (e.offsetX < 50 ? 1 : 0);
    let y = e.offsetY > window.innerHeight - 50 ? -1 : (e.offsetY < 50 ? 1 : 0);
    this.pan(x, y);
  }

  pan(x, y) {
    let a = this.shadow.querySelector('.adventure');
    this.pans.x += this.panSpeed * x;
    this.pans.y += this.panSpeed * y;
    if(Math.abs(this.pans.x) < this.w * this.tw - window.innerWidth && this.pans.x < 0) {
      a.style.left = this.pans.x + 'px';
    }
    if(Math.abs(this.pans.y) < this.h * this.th - window.innerHeight && this.pans.y < 0) {
      a.style.top = this.pans.y + 'px';
    };
  }

  render() {
    this.clear();
    this.addStyle(Adventure.style(this));

    let a = html`<div class='adventure'></div>`;
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

  addStartPosition() {
    let selected = this.selected;
    if(selected.length != 1) return;
    this.startPosition = {x: selected[0].x, y: selected[0].y};
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
        <button id='add-monsters'>Monsters</button>
        <button id='add-start-position'>Set Start</button>
      </div>
    </div>`;

    foot.querySelector('#save-adventure').addEventListener('click', this.save.bind(this));
    foot.querySelector('#adventure-name').addEventListener('keyup', this.setName.bind(this));
    foot.querySelector('#add-dialog').addEventListener('click', this.addDialog.bind(this));
    foot.querySelector('#add-monsters').addEventListener('click', this.addMonsters.bind(this));
    foot.querySelector('#add-start-position').addEventListener('click', this.addStartPosition.bind(this));
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

Adventure.Editor = AdventureEditor;

module.exports = Adventure;
