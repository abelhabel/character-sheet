const Component = require('Component.js');
const Canvas = require('Canvas.js');
const Sprite = require('Sprite.js');
const Terrain = require('Terrain.js');
const PL = require('PositionList2d.js');
const icons = require('icons.js');
const terrains = require('terrains.js');
const selectedIcon = icons.find(i => i.bio.name == 'Hit Background');
const deselectIcon = icons.find(i => i.bio.name == 'Stop');
const removeIcon = icons.find(i => i.bio.name == 'Delete');
const invertIcon = icons.find(i => i.bio.name == 'Invert');
const selectSprite = new Sprite(selectedIcon.bio.sprite);
class Adventure extends Component {
  constructor(w, h) {
    super(true);
    this.tw = 12;
    this.th = 12;
    this.w = w;
    this.h = h;
    this.zoomed = true;
    this.layers = {
      ground: {
        items: new PL(this.w, this.h),
        canvas: new Canvas(this.tw * this.w, this.th * this.h)
      },
      obstacles :{
        items: new PL(this.w, this.h),
        canvas: new Canvas(this.tw * this.w, this.th * this.h)
      },
      select: {
        items: new PL(this.w, this.h),
        canvas: new Canvas(this.tw * this.w, this.th * this.h)
      },
      grid: {
        items: null,
        canvas: new Canvas(this.tw * this.w, this.th * this.h)
      },
      preselect: {
        items: new PL(this.w, this.h),
        canvas: new Canvas(this.tw * this.w, this.th * this.h),
      }
    };
    this.mouse = {
      up: null,
      down: null,
      move: null
    };
    this.selectedTile = null;

  }

  static style(a) {
    return html`<style>
      .adventure {
        position: relative;
        width: ${a.tw * a.w}px;
        height: ${a.th * a.h}px;
        border: 1px solid black;
      }
      .adventure canvas {
        position: absolute;
        top: 0px;
        left: 0px;
      }

      .foot {
        position: fixed;
        bottom: 0px;
      }

      .tools {
        user-select: none;
        display: inline-block;
      }
    </style>`;
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

  mouseDown(e) {
    if(e.button != 0) return;
    this.mouse.down = e;
  }

  mouseUp(e) {
    if(e.button != 0) return;
    this.mouse.up = e;
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
    console.log(tiles.length)
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

  draw(layer) {
    layer.canvas.clear();
    layer.items.each(item => {
      if(!item.item) return;
      if(item.item instanceof Sprite) {
        layer.canvas.drawSprite(item.item, item.x * this.tw, item.y * this.th, this.tw, this.th);
      }
      if(item.item instanceof Terrain) {
        layer.canvas.drawSprite(item.item.sprite, item.x * this.tw, item.y * this.th, this.tw, this.th);
      }
    });
  }

  remove(layer) {
    this.layers.select.items.each(item => {
      if(!item.item) return;
      layer.items.remove(item.x, item.y);
    });
    this.draw(layer);
  }

  render() {
    this.clear();
    this.addStyle(Adventure.style(this));

    Object.keys(this.layers).forEach(key => {
      if(!this.layers[key].canvas) return;
      this.layers[key].canvas.resize(this.w * this.tw, this.h * this.th);
      this.layers[key].items && this.draw(this.layers[key]);
    })

    let a = html`<div class='adventure'>

    </div>`;
    a.addEventListener('mousedown', this.mouseDown.bind(this));
    a.addEventListener('mouseup', this.mouseUp.bind(this));
    a.addEventListener('mousemove', this.mouseMove.bind(this));
    a.addEventListener('contextmenu', this.zoom.bind(this));
    a.appendChild(this.layers.ground.canvas.canvas);
    a.appendChild(this.layers.obstacles.canvas.canvas);
    a.appendChild(this.layers.select.canvas.canvas);
    a.appendChild(this.layers.grid.canvas.canvas);
    a.appendChild(this.layers.preselect.canvas.canvas);

    let foot = html`<div class='foot'>
      <div class='tools' id='ground'><div>Ground</div></div>
      <div class='tools' id='obstacles'><div>Obstacles</div></div>
    </div>`;

    let ground = foot.querySelector('#ground');
    let obstacles = foot.querySelector('#obstacles');
    terrains.forEach(tpl => {
      let t = new Terrain(tpl);
      let s = t.sprite;
      tpl.canvas = s.canvas;
      if(t.stats.walkable) {
        ground.appendChild(t.canvas);
        tpl.canvas.addEventListener('click', e => this.applyTerrain(t, this.layers.ground));
      } else {
        obstacles.appendChild(t.canvas);
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

module.exports = Adventure;