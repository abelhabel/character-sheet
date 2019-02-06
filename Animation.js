const Sprite = require('Sprite.js');
const guid = require('guid.js');
class Animation {
  constructor(sx, sy, ex, ey, sprite, t, endOn = 'travelled', w, h) {
    this.id = guid();
    this.speed = 20;
    this.sx = sx;
    this.sy = sy;
    this.ex = ex;
    this.ey = ey;
    this.endOn = endOn;
    this.pos = {
      x: sx,
      y: sy
    };
    this.alpha = 1;
    this.size = 1;
    this.sprite = sprite;
    this.w = w || this.sprite.w;
    this.h = h || this.sprite.h;
    this.speedStart = typeof t.speedStart == 'number' ? t.speedStart : 0.5;
    this.speedEnd = typeof t.speedEnd == 'number' ? t.speedEnd : 0.5;
    this.speedEase = typeof t.speedEase == 'number' ? t.speedEase : 0.5;
    this.sizeStart = typeof t.sizeStart == 'number' ? t.sizeStart : 1;
    this.sizeEnd = typeof t.sizeEnd == 'number' ? t.sizeEnd : 1;
    this.elevation = typeof t.elevation == 'number' ? t.elevation : 0.5;
    this.elevationStart = typeof t.elevationStart == 'number' ? t.elevationStart : 0.5;
    this.alphaStart = typeof t.alphaStart == 'number' ? t.alphaStart : 1;
    this.alphaEnd = typeof t.alphaEnd == 'number' ? t.alphaEnd : 1;
    this.events = {};
    this.t = 0;
  }

  on(event, fn) {
    let a = this.events[event] || (this.events[event] = []);
    a.push(fn);
  }

  trigger(event) {
    this.events[event].forEach(fn => fn());
  }

  bezier(t, p1, p2, p3) {
    return Math.pow(1 - t, 2) * p1 + 2 * (1-t) * t * p2 + Math.pow(t, 2) * p3;
  }

  get template() {
    let {speedStart, speedEnd, speedEase, sizeStart, sizeEnd, elevation, elevationStart} = this;
    return {speedStart, speedEnd, speedEase, sizeStart, sizeEnd, elevation, elevationStart};
  }

  rotatePointAround(pointX,pointY,originX,originY,angle) {
    return {
      x: Math.cos(angle) * (pointX-originX) - Math.sin(angle) * (pointY-originY) + originX,
      y: Math.sin(angle) * (pointX-originX) + Math.cos(angle) * (pointY-originY) + originY
    };
  }

  get a() {
    let dx = this.ex - this.sx;
    let dy = this.ey - this.sy;
    return Math.atan2(dy, dx);
  }

  get distance() {
    let dx = this.ex - this.sx;
    let dy = this.ey - this.sy;
    return Math.sqrt(dx*dx+dy*dy);
  }

  get travelled() {
    let dx = this.pos.x - this.sx;
    let dy = this.pos.y - this.sy;
    return Math.sqrt(dx*dx+dy*dy);
  }

  move() {
    let {pos, elevationStart, elevation, speedEase,
    speedStart, speedEnd, sizeStart, sizeEnd, speed,
    alphaStart, alphaEnd} = this;
    let distance = this.distance;
    let travelled = this.travelled;
    this.t += 1/60;
    let a = this.a;
    let v = this.bezier(this.t, speedStart, speedEase, speedEnd);
    let vx = speed * Math.cos(a) * v;
    let vy = speed * Math.sin(a) * v;
    pos.x += vx;
    pos.y += vy;
    // let dirx = (Math.abs(this.ex - this.sx) / (this.ex - this.sx)) || 0;
    // let diry = (Math.abs(this.ey - this.sy) / (this.ey - this.sy)) || 0;
    // let distance = Math.abs(this.ex - this.sx);
    // let travelled = Math.abs(pos.x - this.sx);
    // let sx = 1 - (travelled / distance);
    // let ex = 1 - sx;
    // // elevation
    // let t = ex;
    // let tt = this.bezier(t, 0, 1-elevationStart, 1);
    // let height = (this.sy + this.ey) / 2;
    // pos.y = this.bezier(tt, this.sy, height + height * (elevation -0.5), this.ey);
    // // speed
    // let startEase = (1 - speedEase) * 2;
    // let endEase = speedEase * 2;
    // pos.x += dirx * speed * (sx * speedStart * startEase + ex * speedEnd * endEase);
    if(this.endOn == 'travelled' && travelled > distance) {
      return this.stop();
    }
    if(this.t > 1) {
      return this.stop();
    }
    // // size
    this.size = this.bezier(this.t, sizeStart, (sizeStart + sizeEnd)/2, sizeEnd);
    this.alpha = this.bezier(this.t, alphaStart, (alphaStart + alphaEnd)/2, alphaEnd);
  }

  stop() {
    this.reset();
    this.trigger('end');
  }

  playAndEnd(canvas) {
    this.play(canvas);
    return new Promise((resolve, reject) => {
      this.on('end', () => {
        this.ended = true;
        resolve();
      });
    })
  }

  play(canvas) {
    this.move();
    canvas.clear();
    this.draw(canvas);
    !this.ended && window.requestAnimationFrame(() => this.play(canvas));
  }

  reset() {
    this.pos.x = this.sx;
    this.pos.y = this.sy;
    this.t = 0;
  }

  draw(canvas) {
    let {pos, size, sprite} = this;
    let w = this.w || sprite.w;
    let h = this.h || sprite.h;
    canvas.setAlpha(this.alpha);
    canvas.drawSprite(
      this.sprite,
      Math.round(pos.x) + (Math.ceil(w - size * w) / 2),
      Math.round(pos.y) + (Math.ceil(h - size * h) / 2),
      Math.ceil(size * w),
      Math.ceil(size * h)
    );
  }
}

module.exports = Animation;
