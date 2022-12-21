const PL = require('PositionList2d.js');
const Component = require('Component.js');
const {Events} = Component;
const Canvas = require('Canvas.js');
const Camera = require('Camera.js');
const Sprite = require('Sprite.js');
const CompositeSprite = require('CompositeSprite.js');
const Keyboard = require('Keyboard.js');
const storage = require('storage.js');
const icons = require('icons.js');
const skilltreeMods = require('skilltree-mods.js');
const sprites = {};
icons.forEach(i => {
  if(i.bio.name.match(/(Skill|Stat)$/)) {
    sprites[i.id] = new Sprite(i.bio.sprite);
    sprites[i.id].id = i.id;
    sprites[i.id].name = i.bio.name;
  }
});
const colors = {
  canvasBG: '#1a1411',
  tileStroke: '#1a5451',
  tileStrokeHL: '#1aa4a1',
  tileSelected: '#f2be22'
};

class Tile {
  constructor(t = {}) {
    this.highlight = t.highlight || false;
    this.selected = t.selected || false;
    this.power = t.power || null;
    this.picked = t.picked || false;
  }

}

class Power {
  constructor(spriteId, tier) {
    this.spriteId = spriteId;
    this.tier = tier || 1;
  }

  get sprite() {
    return sprites[this.spriteId];
  }
}

class Tree extends Events {
  constructor(w, h, startX, startY) {
    super();
    this.folder = 'skilltree';
    this.name = 'test';
    this.grid = new PL(w, w);
    this._tw = 64;
    this._th = 64;
    this._pad = 16;
    this.mouse = {
      down: null,
      up: null,
      click: null,
      move: null,
      follow: null
    };
    this.selectedTile = null;
    this.selectX = 0;
    this.selectY = 0;
    this.highlightedTile = null;
    this.highlightX = 0;
    this.highlightY = 0;
    this.canvas = new Canvas(window.innerWidth, window.innerHeight);
    this.camera = new Camera(window.innerWidth, window.innerHeight);
    this.start = {
      x: startX || Math.floor(this.grid.w/2),
      y: startY || Math.floor(this.grid.h/2)
    };
    this.center();
  }

  init() {
    this.canvas.canvas.style.backgroundColor = colors.canvasBG;
    this.canvas.canvas.style.position = 'absolute';
    this.canvas.canvas.addEventListener('contextmenu', e => e.preventDefault());
    this.canvas.canvas.addEventListener('mousedown', this.mouseDown.bind(this));
    this.canvas.canvas.addEventListener('mouseup', this.mouseUp.bind(this));
    this.canvas.canvas.addEventListener('mousemove', this.mouseMove.bind(this));
    this.canvas.canvas.addEventListener('click', this.click.bind(this));
    this.canvas.canvas.addEventListener('wheel', this.mouseWheel.bind(this));
    this.canvas.canvas.addEventListener('dblclick', this.doubleClick.bind(this));

    this.grid.each(item => {
      this.grid.set(item.x, item.y, new Tile());
    });

    let t = this.grid.get(this.start.x, this.start.y);
    t.picked = true;
  }

  save() {
    storage.save(this.folder, this.name, this.grid.items);
  }

  static load(name = 'test') {
    let data = storage.load(this.folder, name);
    if(!data) return null
    let st = new this();
    data.data.forEach((s, i) => {
      let {x, y} = st.grid.xy(i);
      if(s.power) {
        let t = st.grid.get(x, y);
        t.power = new Power(s.power.spriteId, s.power.tier);
      }
    })
    return st;
  }

  loadBuild(name) {
    let data = storage.load(this.folder + '-build', this.name);
    if(!data) return null;
    data.data.forEach(p => {
      let tile = this.grid.get(p.x, p.y);
      if(!tile) return;
      tile.picked = true;
    })
  }

  saveBuild(name) {

    storage.save(this.folder + '-build', this.name, this.picked);

  }

  get picked() {
    let picked = [];
    this.grid.filled(({item, x, y}) => {
      if(item.picked) {
        picked.push({item, x, y})
      }
    })
    return picked;
  }

  get pad() {
    return Math.ceil(this._pad * this.camera.zoom);
  }

  get tw() {
    return Math.ceil(this._tw * this.camera.zoom);
  }

  get th() {
    return Math.ceil(this._th * this.camera.zoom);
  }

  get cx() {
    return Math.ceil(this.grid.w / 2) * this.tw - Math.floor(this.camera.w / 2);
  }

  get cy() {
    return Math.ceil(this.grid.h / 2) * this.th - Math.floor(this.camera.h / 2);
  }

  center() {
    this.camera.moveTo(this.cx, this.cy);
  }

  tpos(e, cx = this.camera.x, cy = this.camera.y) {
    let x = Math.floor((cx + e.offsetX) / this.tw);
    let y = Math.floor((cy + e.offsetY) / this.th);
    return {x, y};
  }

  click(e) {

  }

  doubleClick(e) {
    let {x, y} = this.tpos(e);
    let tile = this.grid.get(x, y);
    if(!tile) return;
    this.trigger('tile double click', tile, x, y, e);
    this.render(x, y);
  }

  mouseWheel(e) {
    if(e.deltaY > 0) {
      this.camera.setZoom(-1);
      this.camera.move(-1, -1);
    } else {
      this.camera.setZoom(1);
    }
    this.render();
  }

  mouseDown(e) {
    this.mouse.up = null
    this.mouse.down = {offsetX: e.offsetX, offsetY: e.offsetY, cx: this.camera.x, cy: this.camera.y};
  }

  mouseUp(e) {
    if(e.offsetX == this.mouse.down.offsetX && e.offsetY == this.mouse.down.offsetY) {
      let {x, y} = this.tpos(e);
      let tile = this.grid.get(x, y);
      let around = this.grid.around(x, y, 1).filter(item => item.item && item.item.picked);
      if(this.mouse.follow) {
        this.trigger('mouse up follow', this.mouse.follow, tile, x, y);
        this.mouse.follow = null;
      } else
      if(this.trigger('mouse up', tile, x, y, e)) {

      } else
      if(!this.mouse.follow && tile && tile.power && tile.power.socketable) {
        this.trigger('mouse up socketable', tile, x, y);
        this.mouse.follow = tile.power;
        tile.power = null;
      } else
      if(!this.mouse.follow && tile && around.length) {
        if(tile.picked) {
          let g = new PL(this.grid.w, this.grid.h);
          this.picked.forEach(p => {
            if(p.x == x && p.y == y) return;
            g.set(p.x, p.y, true);
          })
          g.invert(true);
          let canNotWalkTo = around.find(item => {
            if(item.x == x && item.y == y) return false;
            return !g.canWalkTo(this.start.x, this.start.y, item.x, item.y, 'Always');
          })
          if(!canNotWalkTo) {
            tile.picked = false;
          }
        } else {
          tile.picked = true;
        }

      } else {
        this.trigger('tile clicked', tile, x, y);
      }
      this.render();
    }
    this.mouse.down = null;
    this.mouse.move = null;
    this.mouse.up = {offsetX: e.offsetX, offsetY: e.offsetY};
  }

  mouseMove(e) {
    let cx = this.mouse.move ? this.mouse.move.x : 0;
    let cy = this.mouse.move ? this.mouse.move.y : 0;
    let {x, y} = this.tpos(e, cx, cy);
    let tile = this.grid.get(x, y);
    if(!tile) return;
    this.trigger('mouse move start', tile, x, y, e);

    if(this.mouse.down) {
      this.camera.move(-e.movementX / this.camera.zoom, -e.movementY / this.camera.zoom);
      return this.render();

    }
    if(this.mouse.follow) {
      this.clearFollow();
      this.render(x, y);
    }

    if(this.mouse.move) {
      let {x, y} = this.tpos(this.mouse.move);
      let t = this.grid.get(x, y);
      if(this.highlightedTile) {
        this.highlightedTile = null;
        this.render(this.highlightX, this.highlightY);
      }
      if(t) {
        this.highlightedTile = t;
        this.highlightX = x;
        this.highlightY = y;
      } else {
        this.highlightedTile = null;
      }
      this.render(x, y);
    }
    tile.highlight = true;
    this.mouse.move = {
      offsetX: e.offsetX, offsetY: e.offsetY, movementX: e.movementX, movementY: e.movementY,
      cx: this.camera.x, cy: this.camera.y
    };
    this.render(x, y);
    if(this.mouse.follow) {
      this.grid.around(x, y, 1).forEach(item => {
        this.renderTile(item.item, item.x, item.y);
      })
      this.renderFollow();
    }
    this.trigger('mouse move end', tile, x, y, e);
  }

  clearFollow() {
    if(this.mouse.follow && this.mouse.move) {
      let item = this.mouse.follow;
      let {tw, th, pad, selectedTile, highlightedTile, grid, canvas, camera, settings} = this;
      // canvas.clearRect(this.mouse.move.offsetX, this.mouse.move.offsetY, tw, th);
      canvas.clearRect(this.mouse.move.offsetX - item.r*tw, this.mouse.move.offsetY - item.r*th, (item.r * 2 + 1) * tw, (item.r * 2 + 1) * th, false, 'pink');
      let {x, y} = this.tpos(this.mouse.move);
      let affected = grid.around(x, y, item.r + 1);
      affected.forEach(item => this.renderTile(item.item, item.x, item.y))
    }
  }

  renderFollow() {
    if(this.mouse.follow && this.mouse.move) {
      let item = this.mouse.follow;
      let {tw, th, pad, selectedTile, highlightedTile, grid, canvas, camera, settings} = this;
      canvas.drawSprite(item.sprite, this.mouse.move.offsetX, this.mouse.move.offsetY, tw, th);
      let {x, y} = this.tpos(this.mouse.move);
      let r = item.r || 1;
      if(item.shape == 'circle') {
        canvas.drawCircle(this.mouse.move.offsetX, this.mouse.move.offsetY, item.r * tw, false, 'pink');
      } else
      if(item.shape == 'square') {
        canvas.drawRect(this.mouse.move.offsetX - r*tw, this.mouse.move.offsetY - r*th, (r * 2 + 1) * tw, (r * 2 + 1) * th, false, 'pink');
      }
    }
  }

  renderTile(tile, x, y) {
    if(!tile) return;
    if(!this.camera.inView(x * this.tw, y * this.th, this.tw, this.th)) {
      return;
    }
    let {tw, th, pad, selectedTile, highlightedTile, grid, canvas, camera, settings} = this;
    canvas.clearRect(x * tw - camera.x, y * th - camera.y, tw, th);
    if(tile.power) {
      let c = tile.power.tier == 3 ? 'gold' : tile.power.tier == 2 ? 'silver' : 'burlywood';
      canvas.drawCircle(x * tw + pad - camera.x + Math.ceil((tw - 2*pad)/2), y * th + pad - camera.y + Math.ceil((th - 2*pad)/2), Math.ceil((th - 2*pad)/2), c, 'white');
      canvas.drawSprite(tile.power.sprite,x * tw + pad - camera.x, y * th + pad - camera.y, tw - 2*pad, th - 2*pad);
    } else {
      let stroke = tile == highlightedTile ? colors.tileStrokeHL : colors.tileStroke;
      canvas.drawRect(x * tw + pad - camera.x, y * th + pad - camera.y, tw - 2*pad, th - 2*pad, null, stroke);
    }

  }

  render(x, y) {
    let {tw, th, pad, selectedTile, highlightedTile, grid, canvas, camera, settings} = this;
    this.trigger('render start', x, y);
    if(x != undefined && y != undefined) {
      this.renderTile(grid.get(x, y), x, y);
    } else {
      canvas.clear();
      grid.each(({item, x, y}) => {
        this.renderTile(item, x, y)
      });
    }
    let stroke = 'green';
    let picked = this.picked;
    picked.forEach(({x, y}) => {
      let around = this.grid.around(x, y, 1);
      stroke = '#660000';
      around.forEach(({item, x, y}) => {
        if(item.picked) return;
        canvas.drawRect(x * tw + pad - camera.x, y * th + pad - camera.y, tw - 2*pad, th - 2*pad, false, stroke);
      });
      stroke = 'green';
      canvas.drawRect(x * tw + pad - camera.x, y * th + pad - camera.y, tw - 2*pad, th - 2*pad, false, stroke);

    });
    this.trigger('render end', x, y);
    return canvas.canvas;
  }
}

module.exports = Tree;
