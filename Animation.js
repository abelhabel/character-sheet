const Sprite = require('Sprite.js');
class Animation {
  constructor(sx, sy, ex, ey, sprite, t) {
    this.speed = 20;
    this.sx = sx;
    this.sy = sy;
    this.ex = ex;
    this.ey = ey;
    this.pos = {
      x: sx,
      y: sy
    };
    this.size = 1;
    this.sprite = sprite;
    this.speedStart = t.speedStart || 0.5;
    this.speedEnd = t.speedEnd || 0.5;
    this.speedEase = t.speedEase || 0.5;
    this.sizeStart = t.sizeStart || 1;
    this.sizeEnd = t.sizeEnd || 1;
    this.elevation = t.elevation || 0.5;
    this.elevationStart = t.elevationStart || 0.5;
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
    speedStart, speedEnd, sizeStart, sizeEnd, speed} = this;
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
    if(this.t > 1 || travelled > distance) {
      this.reset();
      this.trigger('end');
    }
    // // size
    this.size = this.bezier(this.t, sizeStart, (sizeStart + sizeEnd)/2, sizeEnd);
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
    canvas.drawSprite(
      this.sprite,
      Math.round(pos.x) + (Math.ceil(sprite.w - size * sprite.w) / 2),
      Math.round(pos.y) + (Math.ceil(sprite.h - size * sprite.h) / 2),
      Math.ceil(size * sprite.w),
      Math.ceil(size * sprite.h)
    );
  }
}

module.exports = Animation;
