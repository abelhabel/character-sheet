const PL = require('PositionList2d.js');
const Tree = require('Tree.js');
const Component = require('Component.js');
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

const rules = require('upgrade-rules.js');
class Summary {
  constructor() {
    this.lh = 14;
    this.canvas = new Canvas(200, this.lh * Object.keys(rules).length + 2);
  }

  tileStats(item, mods) {
    let r = rules;
    let tile = item.item;
    let {x, y} = item;
    let name = sprites[tile.power.spriteId].name;
    if(!r[name]) return {v: 0, t: 0};
    let v = r[name].value;
    let t = tile.power.tier;
    let m = mods.forEach(m => {
      let d = PL.prototype.distance(m.x, m.y, x, y);
      if(d <= m.item.power.r) {
        console.log('mod')
        v += r[name].mod * m.item.power.value;
        t += r[name].mod * m.item.power.tier;
      }
    })
    v = Math.floor(v);
    t = Math.floor(t);
    let total = v * t;
    return {name, v, t, total};
  }

  render(picked, mods) {
    let r = JSON.parse(JSON.stringify(rules));
    let x = 20;
    let lh = this.lh;
    this.canvas.drawRect(0, 0, this.canvas.w, this.canvas.h, 'black', 'white');
    let ailments = new Set();
    let vigors = new Set();
    mods.forEach(m => {
      if(m.item.ailment) {
        ailments.add(m.item.ailment);
      }
      if(m.item.vigor) {
        vigors.add(m.item.vigor);
      }
    });
    picked.forEach(item => {
      if(!item.item.power || !item.item.power.spriteId) return;
      let name = sprites[item.item.power.spriteId].name;
      if(!r[name]) return;
      let b = this.tileStats(item, mods);
      r[name].result += b.total;
    });

    this.canvas.drawText(x, lh, `Points used: ${picked.length}`, 'white')
    this.canvas.drawText(x, 2*lh, `Vigors: ${Array.from(vigors).join(', ')}`, 'green')
    this.canvas.drawText(x, 3*lh, `Ailments: ${Array.from(ailments).join(', ')}`, 'red')
    let c = 3;
    Object.keys(r).forEach((name, i) => {
      if(!r[name].result) return;
      c++;
      let y = (c +1) * lh;
      this.canvas.drawText(x, y, `${name}: ${r[name].result || 0}`, 'white')
    })
    return this.canvas.canvas;
  }
}

Array.prototype.random = function() {
  return this[Math.floor(Math.random() * this.length)];
}
const modTiers = [0, 1, 2];
const modValues = [0, 1, 2, 3];
const modShapes = ['square', 'circle'];
const modRadii = [1, 2, 3];
class Mod {
  constructor(m = {}) {
    let {bio, stats} = m;
    this.socketable = true;
    this.tpl = m;
    this.bio = {
      name: bio.name,
      sprite: bio.sprite
    };
    this.stats = {
      composite: stats.composite,
      tier: stats.tier,
      value: stats.value,
      r: stats.r,
      shape: stats.shape,
      ailment: stats.ailment,
      vigor: stats.vigor
    }
    this.index = 0;
    this.sprites = this.bio.sprite.map(s => new Sprite(s));
    this._sprite = new CompositeSprite(this.bio.sprite);
  }

  get sprite() {
    if(this.stats.composite) {
      return this._sprite;
    }
    let i = Math.floor(Math.random() * this.bio.sprite.length);
    this.index = i;
    return this.sprites[i];
  }

  get tier() {
    return this.stats.tier;
  }
  get value() {
    return this.stats.value;
  }
  get r() {
    return this.stats.r;
  }
  get shape() {
    return this.stats.shape;
  }
  get ailment() {
    return this.stats.ailment;
  }
  get vigor() {
    return this.stats.vigor;
  }

}

class Mods {
  constructor() {
    this.mods = [];
    this.tw = 64;
    this.th = 64;
    this.w = 4 * this.tw;
    this.h = this.th;
    this.canvas = new Canvas(this.w, this.h);
  }

  add(tpl = skilltreeMods[0]) {
    if(tpl instanceof Mod) {
      this.mods.push(tpl);
    } else {
      this.mods.push(new Mod(tpl));
    }
  }

  take(mod) {
    this.mods.splice(this.mods.indexOf(mod), 1);
    this.render();
  }

  mouseUp(x, y) {
    if(!(x < 0 || x > this.w || y < 0 || y > this.h)) {
      let i = Math.floor(x / 64);
      return this.mods[i];
    }
  }

  render() {
    let {mods, tw, th, canvas} = this;
    canvas.drawRect(0, 0, canvas.w, canvas.h, 'black');
    mods.forEach((m, i) => {
      canvas.drawSprite(m.sprite, i * tw, 8, tw -16, th-16);
    })
    canvas.drawRect(0, 0, canvas.w, canvas.h, false, 'white');
    return canvas.canvas;
  }
}

class SkillTree extends Tree{
  constructor() {
    super(21, 21);
    this.folder = 'skilltree';
    this.name = 'test';
    this.settings = new SkillSetting();
    this.summary = new Summary();
    this.mods = new Mods();
    this.modsX = Math.floor(this.camera.w / 2) - Math.floor(this.mods.w / 2);
    this.modsY = 20;
    this.tileSummaryX = this.modsX + this.mods.w + 20;
    this.tileSummaryY = 20;
    this.tileSummaryW = 128;
    this.tileSummaryH = 80;
    this.keyboard = new Keyboard(Math.random(), {
      1: this.setTier.bind(this, 1),
      2: this.setTier.bind(this, 2),
      3: this.setTier.bind(this, 3),
    });
    this.init();
  }

  init() {
    Tree.prototype.init.call(this);
    this.mods.add(skilltreeMods[0]);
    this.mods.add(skilltreeMods[1]);

    this.settings.render();
    this.keyboard.start();

    this.on('mouse move start', (tile, x, y, e) => {
      this.clearTileSummary(e);
    })
    this.on('mouse move end', (tile, x, y, e) => {
      this.renderTileSummary(e);
    })
    this.on('mouse up', (tile, x, y, e) => {
      let m = this.mods.mouseUp(e.offsetX - this.modsX, e.offsetY - this.modsY)
      if(m) {
        this.mods.take(m);
        this.mouse.follow = m;
      }
    })

    this.on('mouse up follow', (follow, tile, x, y) => {
      if(tile && tile.picked && !tile.power) {
        tile.power = follow;
      } else {
        this.mods.add(follow);
      }
    });
    this.on('tile clicked', (tile, x, y) => {
      // Editor
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
    })
    this.on('render end', (x, y) => {
      this.renderEnd(x, y);
    });
  }

  get modifiers() {
    return this.grid.some(item => item.item.power && item.item.power instanceof Mod);
  }

  inSetting(x, y) {
    let {selectedTile, selectX, selectY, settings} = this;
    if(!selectedTile) return false;
    let sx = selectX - Math.floor(settings.grid.w / 2);
    let sy = selectY - settings.grid.h;
    return this.settings.grid.get(x-sx, y -sy)
  }

  setTier(tier, e) {
    if(!this.selectedTile || !this.selectedTile.power) return;
    this.selectedTile.power.tier = tier;
    this.render(this.selectX, this.selectY);
  }

  clearTileSummary(m) {
    this.canvas.clearRect(
      this.tileSummaryX -1,
      this.tileSummaryY -1,
      this.tileSummaryW + 2,
      this.tileSummaryH +2
    );
  }

  renderTileSummary(m) {
    let {tw, th, pad, selectedTile, highlightedTile, grid, canvas, camera, settings} = this;

    if(highlightedTile && highlightedTile.power) {
      let modifiers = grid.some(item => item.item.power instanceof Mod);
      let {x, y} = this.tpos(m);
      let bonus = this.summary.tileStats({item: highlightedTile,x,y}, modifiers);
      let lines = [bonus.name];
      if(bonus.t) lines.push(`Tier: ${bonus.t}`);
      if(bonus.v) lines.push(`Value: ${bonus.v}`);
      if(bonus.total) lines.push(`Total: ${bonus.total}`);
      this.canvas.drawRect(
        this.tileSummaryX,
        this.tileSummaryY,
        this.tileSummaryW,
        this.tileSummaryH,
        'black', 'white'
      );
      lines.forEach((l, i) => {
        canvas.drawText(this.tileSummaryX +10, 20 +this.tileSummaryY + 15*i, l, 'white');
      })
    }
  }

  renderEnd(x, y) {
    let {tw, th, pad, selectedTile, highlightedTile, grid, canvas, camera, settings} = this;
    let stroke = 'green';
    let modifiers = this.modifiers;
    modifiers.forEach(({item, x, y}) => {
      let affected = [];
      let r = item.power.r || 1;
      if(item.power.shape == 'circle') {
        affected = grid.inCircle(x, y, r);
        canvas.drawCircle(x * tw + Math.floor(tw/2) - camera.x, y * th + Math.floor(th/2) - camera.y, r * tw, false, 'pink');
      } else
      if(item.power.shape == 'square') {
        affected = grid.around(x, y, r);
        canvas.drawRect(x * tw - (tw * r) - camera.x, y * th - (th * r) - camera.y, (r * 2 + 1) * tw, (r * 2 + 1) * th, false, 'pink');
      }
      affected.forEach(({item, x, y}) => {
        canvas.drawRect(x * tw + pad - camera.x, y * th + pad - camera.y, tw - 2*pad, th - 2*pad, null, 'pink');
      })
    })
    let summary = this.summary.render(this.picked, modifiers);
    canvas.drawImage(summary, 0, 0, summary.width, summary.height);
    let mods = this.mods.render();
    canvas.drawImage(mods, this.modsX, this.modsY, mods.width, mods.height);
    return canvas.canvas;
  }
}
SkillTree.folder = 'skilltree';
class ControlPanel extends Component {
  constructor() {
    super(true, 'control-panel');
    this.cc.save = new Component(false, 'save', 'button');
    this.cc.saveName = new Component(false, 'save-name', 'input');
    this.cc.load = new Component(false, 'load', 'button');
    this.cc.loadName = new Component(false, 'save-name', 'select');
    this.cc.novel = new Component(false, 'save', 'button');
    this.init();
  }

  init() {
    let {save, saveName, load, loadName, novel} = this.cc;
    save.append(this.html`<span>Save</span>`);
    load.append(this.html`<span>Load</span>`);
    novel.append(this.html`<span>New</span>`);
    save.listen(false, 'click', e => {
      this.trigger('save', saveName.value);
    })
    load.listen(false, 'click', e => {
      this.trigger('load', loadName.value);
    })
    novel.listen(false, 'click', e => {
      this.trigger('new', e);
    })
    Object.assign(this.tags.outer.style, {
      position: 'fixed',
      top: '0px',
      left: '0px',
      width: '100%',
    })
  }

  render() {
    this.clear();
    let {save, saveName, load, loadName, novel} = this.cc;
    this.append([save, saveName, load, loadName, novel]);
    return this.tags.outer;
  }
}
class Editor extends SkillTree {
  constructor() {
    super();
    this.controls = new ControlPanel();
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
    canvas.drawRect(this.start.x * tw - camera.x, this.start.y * th - camera.y, tw, th, null, 'blue');
    return canvas.canvas;
  }
}
SkillTree.Editor = Editor;
module.exports = SkillTree;
