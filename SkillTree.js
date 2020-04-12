const PL = require('PositionList2d.js');
const Canvas = require('Canvas.js');
const Camera = require('Camera.js');
const Sprite = require('Sprite.js');
const Keyboard = require('Keyboard.js');
const storage = require('storage.js');
const icons = require('icons.js');
const sprites = {};
icons.forEach(i => {
  if(i.bio.name.match(/(Skill|Stat)$/)) {
    sprites[i.id] = new Sprite(i.bio.sprite);
    sprites[i.id].id = i.id;
    sprites[i.id].name = i.bio.name;
  }
});
console.log(Object.keys(sprites).length)
const colors = {
  canvasBG: '#1a1411',
  tileStroke: '#1a5451',
  tileStrokeHL: '#1aa4a1',
  tileSelected: '#f2be22'
};

class Tile {
  constructor() {
    this.highlight = false;
    this.selected = false;
    this.power = null;
  }

}

class Power {
  constructor(spriteId, tier) {
    this.spriteId = spriteId;
    this.tier = tier || 1;
  }
}

class SkillSetting {
  constructor() {
    this.grid = new PL(5, 5);
    this.tw = 64;
    this.th = 64;
    this.canvas = new Canvas(this.grid.w * this.tw, this.grid.h * this.th);
    this.init();
  }

  init() {
    Object.keys(sprites).forEach((id, i) => {
      this.grid.items[i] = sprites[id];
    })
  }

  renderTile(tile, x, y) {
    if(!tile) return;
    let {tw, th, canvas} = this;
    canvas.clearRect(x*tw, y*th, tw, th);
    canvas.drawRect(x*tw, y*th, tw, th)
    canvas.drawSprite(tile, x*tw, y*th, tw, th);
  }

  render() {
    this.grid.each(({item, x, y}) => {
      this.renderTile(item, x, y);
    });
    return this.canvas.canvas;
  }
}

class SkillTree {
  constructor() {
    this.grid = new PL(21, 21);
    this._tw = 64;
    this._th = 64;
    this._pad = 16;
    this.mouse = {
      down: null,
      up: null,
      click: null,
      move: null
    };
    this.selectedTile = null;
    this.selectX = 0;
    this.selectY = 0;
    this.highlightedTile = null;
    this.highlightX = 0;
    this.highlightY = 0;
    this.canvas = new Canvas(window.innerWidth, window.innerHeight);
    this.camera = new Camera(window.innerWidth, window.innerHeight);
    this.settings = new SkillSetting();
    this.keyboard = new Keyboard(Math.random(), {
      1: this.setTier.bind(this, 1),
      2: this.setTier.bind(this, 2),
      3: this.setTier.bind(this, 3),
    });
    this.init();
    this.center();
  }

  save() {
    storage.save('skilltree', 'test', this.grid.items);
  }

  static load() {
    let data = storage.load('skilltree', 'test');
    console.log(data)
    if(!data) return null
    let st = new SkillTree();
    st.grid.items = data.data.map(s => {
      let t = new Tile();
      if(s.power) {
        t.power = new Power(s.power.spriteId, s.power.tier);
      }
      return t;
    });
    return st;
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

  init() {
    this.canvas.canvas.style.backgroundColor = colors.canvasBG;
    this.canvas.canvas.style.position = 'absolute';
    this.canvas.canvas.addEventListener('mousedown', this.mouseDown.bind(this));
    this.canvas.canvas.addEventListener('mouseup', this.mouseUp.bind(this));
    this.canvas.canvas.addEventListener('mousemove', this.mouseMove.bind(this));
    this.canvas.canvas.addEventListener('click', this.click.bind(this));
    this.canvas.canvas.addEventListener('wheel', this.mouseWheel.bind(this));
    this.canvas.canvas.addEventListener('dblclick', this.doubleClick.bind(this));

    this.grid.each(item => {
      this.grid.set(item.x, item.y, new Tile());
    });

    this.settings.render();
    this.keyboard.start();
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
    tile.power = null;
    this.render(x, y);
  }

  mouseWheel(e) {
    if(e.deltaY > 0) {
      this.camera.setZoom(-1);
    } else {
      this.camera.setZoom(1);
    }
    this.render();
  }

  mouseDown(e) {
    this.mouse.up = null
    this.mouse.down = {offsetX: e.offsetX, offsetY: e.offsetY, cx: this.camera.x, cy: this.camera.y};
  }

  inSetting(x, y) {
    let {selectedTile, selectX, selectY, settings} = this;
    if(!selectedTile) return false;
    let sx = selectX - Math.floor(settings.grid.w / 2);
    let sy = selectY - settings.grid.h;
    let w = settings.grid.w;
    let h = settings.grid.h;
    return this.settings.grid.get(x-sx, y -sy)
    return !(x < sx || y < sy || x > sx + w || y > sy + h);
  }

  setTier(tier, e) {
    if(!this.selectedTile || !this.selectedTile.power) return;
    this.selectedTile.power.tier = tier;
    this.render(this.selectX, this.selectY);
  }

  mouseUp(e) {
    if(!this.mouse.move || this.mouse.move.cx == this.mouse.down.cx && this.mouse.move.cy && this.mouse.down.cy) {
      let {x, y} = this.tpos(e);
      let tile = this.grid.get(x, y);
      // if(!tile) return;
      if(this.selectedTile == tile) {
        this.selectedTile = null;
      } else {
        let s = this.inSetting(x, y);
        if(s) {
          if(this.selectedTile.power) {
            this.selectedTile.power.spriteId = s.id;
          } else {
            this.selectedTile.power = new Power(s.id, 1);
          }
        } else {
          this.selectedTile = tile;
          this.selectX = x;
          this.selectY = y;
        }
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
    if(this.mouse.down) {
      this.camera.move(-e.movementX, -e.movementY);
      this.render();

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
  }

  renderTile(tile, x, y) {
    if(!tile) return;
    if(!this.camera.inView(x * this.tw, y * this.th, this.tw, this.th)) {
      return;
    }
    let {tw, th, pad, selectedTile, highlightedTile, grid, canvas, camera, settings} = this;
    let cx = Math.ceil(this.grid.w / 2);
    let cy = Math.ceil(this.grid.h / 2);
    let alpha = grid.distance(x, y, cx, cy);
    canvas.clearRect(x * tw - camera.x, y * th - camera.y, tw, th);
    if(tile.power) {
      let p = Math.ceil(8 / tile.power.tier) * camera.zoom;
      let c = tile.power.tier == 3 ? 'gold' : tile.power.tier == 2 ? 'silver' : 'burlywood';
      // canvas.drawRect(x * tw + pad - camera.x, y * th + pad - camera.y, tw - 2*pad, th - 2*pad, c);
      canvas.drawCircle(x * tw + pad - camera.x + Math.ceil((tw - 2*pad)/2), y * th + pad - camera.y + Math.ceil((th - 2*pad)/2), Math.ceil((th - 2*pad)/2), c, 'white');
      canvas.drawSprite(sprites[tile.power.spriteId],x * tw + pad - camera.x, y * th + pad - camera.y, tw - 2*pad, th - 2*pad);
    } else {
      let stroke = tile == selectedTile ? colors.tileSelected : tile == highlightedTile ? colors.tileStrokeHL : colors.tileStroke;
      canvas.drawRect(x * tw + pad - camera.x, y * th + pad - camera.y, tw - 2*pad, th - 2*pad, null, stroke);
    }

  }

  render(x, y) {
    let {tw, th, pad, selectedTile, highlightedTile, grid, canvas, camera, settings} = this;
    if(x != undefined && y != undefined) {
      this.renderTile(grid.get(x, y), x, y);
    } else {
      canvas.clear();
      grid.each(({item, x, y}) => {
        this.renderTile(item, x, y)
      });
    }
    if(selectedTile) {
      let sx = this.selectX - Math.floor(settings.grid.w / 2);
      let sy = this.selectY - settings.grid.h;
      canvas.clearRect(sx * tw - camera.x, sy * th - camera.y, tw * settings.grid.w, th * settings.grid.h)
      canvas.drawImage(settings.canvas.canvas, sx * tw - camera.x, sy * th - camera.y, tw * settings.grid.w, th * settings.grid.h)
    }
    return canvas.canvas;
  }
}

module.exports = SkillTree;
