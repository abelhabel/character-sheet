const PL = require('PositionList2d.js');
class Arena {
  constructor(t, tw, th) {
    this.template = t;
    this.w = t.ground.w;
    this.h = t.ground.h;
    this.tw = tw;
    this.th = th;
    this.ground = new PL(this.w, this.h);
    this.obstacles = new PL(this.w, this.h);
    this.canvas = {
      ground: null,
      obstacles: null,
      composite: null
    };

    this.fillGround();
    this.fillObstacles();
  }

  fillGround() {
    this.template.ground.items.forEach((sprite, i) => {
      let xy = this.ground.xy(i);
      let x = xy.x;
      let y = xy.y;
      this.ground.set(x, y, {sprite, x, y});
    })
  }

  fillObstacles() {
    console.log(this.template.obstacles.items)
    this.template.obstacles.items.forEach((sprite, i) => {
      if(!sprite) return;
      let xy = this.obstacles.xy(i);
      let x = xy.x;
      let y = xy.y;
      this.obstacles.set(x, y, {sprite, x, y});
    })
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
