const PL = require('PositionList2d.js');
const Sprite = require('Sprite.js');
const icons = require('icons.js');
class Arena {
  constructor(t, tw, th) {
    this.template = t;
    this.w = t.ground.w;
    this.h = t.ground.h;
    this.tw = tw;
    this.th = th;
    this.ground = new PL(this.w, this.h);
    this.obstacles = new PL(this.w, this.h);
    this.highlights = new PL(this.w, this.h);
    let icon = icons.find(i => i.bio.name == 'Tile Target');
    this.highlightSprite = new Sprite(icon.bio.sprite);
    this.canvas = {
      ground: null,
      obstacles: null,
      composite: null
    };
    this.highlightedTiles = [];
    this.fillGround();
    this.fillObstacles();
  }

  highlight(x, y) {
    this.highlights.set(x, y, true);
  }

  delight(x, y) {
    this.highlights.remove(x, y);
  }

  fillGround() {
    this.template.ground.items.forEach((s, i) => {
      if(!s) return;
      let xy = this.ground.xy(i);
      let x = xy.x;
      let y = xy.y;
      let sprite = new Sprite(s);
      this.ground.set(x, y, {sprite, x, y});
    })
  }

  fillObstacles() {
    this.template.obstacles.items.forEach((s, i) => {
      if(!s) return;
      let xy = this.obstacles.xy(i);
      let x = xy.x;
      let y = xy.y;
      let sprite = new Sprite(s);
      this.obstacles.set(x, y, {sprite, x, y});
    })
  }

  drawHighlight(x, y) {
    var c = this.canvas.obstacles.getContext('2d');
    c.drawImage(this.highlightSprite.canvas, x * this.tw, y * this.th, this.tw, this.th);
  }

  drawObstacles() {
    let {w, h, tw, th} = this;
    let c = this.canvas.obstacles.getContext('2d');
    c.clearRect(0, 0, w * tw, h * th);
    this.obstacles.filled(({item, x, y}) => {
      let sprite = item.sprite;
      if(!sprite) return;
      let img = sprite.canvas;
      c.drawImage(img, x*tw, y*th, tw, th);
      let hl = this.highlights.get(x, y);
      if(hl) this.drawHighlight(x, y);
    });
    this.drawComposite();
  }

  drawComposite() {
    let {w, h, tw, th} = this;
    let c = this.canvas.composite.getContext('2d');
    c.drawImage(this.canvas.ground, 0, 0, w * tw, h * th);
    c.drawImage(this.canvas.obstacles, 0, 0, w * tw, h * th);
  }

  render() {
    let {w, h, tw, th} = this;
    let canvas = document.createElement('canvas');
    canvas.width = this.w * this.tw;
    canvas.height = this.h * this.th;
    let c = canvas.getContext('2d');
    c.clearRect(0, 0, w*tw, h*th);
    this.ground.filled(({item, x, y}) => {
      let sprite = item.sprite;
      let img = sprite.canvas;
      c.drawImage(img, x*tw, y*th, tw, th);
    });
    this.canvas.ground = canvas;

    canvas = document.createElement('canvas');
    canvas.width = this.w * this.tw;
    canvas.height = this.h * this.th;
    c = canvas.getContext('2d');
    c.clearRect(0, 0, w*tw, h*th);
    this.obstacles.filled(({item, x, y}) => {
      let sprite = item.sprite;
      if(!sprite) return;
      let img = sprite.canvas;
      c.drawImage(img, x*tw, y*th, tw, th);
    });
    this.canvas.obstacles = canvas;

    canvas = document.createElement('canvas');
    canvas.width = this.w * this.tw;
    canvas.height = this.h * this.th;
    c = canvas.getContext('2d');
    c.drawImage(this.canvas.ground, 0, 0, w * tw, h * th);
    c.drawImage(this.canvas.obstacles, 0, 0, w * tw, h * th);
    this.canvas.composite = canvas;
    return canvas;
  }


}

module.exports = Arena;
