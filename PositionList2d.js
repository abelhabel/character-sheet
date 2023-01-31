class PositionList2d {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.items = [];
    for(var y = 0; y < this.h; y++) {
      for(var x = 0; x < this.w; x++) {
        this.items.push(null);
      }
    }
  }

  static create(pl) {
    let n = new PositionList2d(pl.w, pl.h);
    n.items = Array.from(pl.items);
    return n;
  }

  static combine(lists) {
    let pl = new PositionList2d(lists[0].w, lists[0].h);
    for(var y = 0; y < pl.h; y++) {
      for(var x = 0; x < pl.w; x++) {
        lists.forEach(l => {
          if(pl.get(x, y)) return;
          pl.set(x, y, l.get(x, y))
        });
      }
    }
    return pl;
  }

  transfer(pl, setOnly, unset) {
    if(this.w != pl.w || this.h != pl.h) return;
    for(var y = 0; y < this.h; y++) {
      for(var x = 0; x < this.w; x++) {
        let i = this.w * y + x;
        if(setOnly && !this.items[i]) continue;
        if(unset) {
          pl.items[i] = null;
        } else {
          pl.items[i] = this.items[i];
        }
        this.items[i] = null;
      }
    }
  }

  invert(item) {
    for(var y = 0; y < this.h; y++) {
      for(var x = 0; x < this.w; x++) {
        let i = this.w * y + x;
        if(!this.items[i]) {
          this.items[i] = item;
        } else {
          this.items[i] = null;
        }
      }
    }
  }

  purge() {
    for(var y = 0; y < this.h; y++) {
      for(var x = 0; x < this.w; x++) {
        this.items[this.w * y + x] = null;
      }
    }
  }

  addCopy(o) {
    for(var y = 0; y < this.h; y++) {
      for(var x = 0; x < this.w; x++) {
        this.items[this.w * y + x] = Object.assign({x,y}, o);
      }
    }
  }

  fill(list) {
    list.forEach(item => {
      this.setItem(item);
    })
  }

  fillAll(item) {
    for(var y = 0; y < this.h; y++) {
      for(var x = 0; x < this.w; x++) {
        this.items[this.w * y + x] = item;
      }
    }
  }

  steps(x1, y1, x2, y2) {
    var dx = Math.abs(x1 - x2);
    var dy = Math.abs(y1 - y2);
    return dx + dy;
  }

  squareRadius(x1, y1, x2, y2) {
    var dx = Math.abs(x1 - x2);
    var dy = Math.abs(y1 - y2);
    return Math.max(dx, dy);
  }

  distance(x1, y1, x2, y2) {
    var dx = Math.abs(x1 - x2);
    var dy = Math.abs(y1 - y2);
    return Math.sqrt(dx * dx + dy * dy);
  }

  closest(x, y, test) {
    let radius = 1;
    let maxRadius = Math.max(this.w, this.h);
    let tile;
    let a = this.get(x, y);
    for(let i  = 1; i < maxRadius; i++) {
      let tiles = this.around(x, y, i);
      tile = tiles.find(t => t.item && (test ? test(t.item) : true));
      if(tile && tile.item != a) break;
    }
    return tile;
  }

  furthest(x, y, test) {
    let radius = 1;
    let maxRadius = Math.max(this.w, this.h);
    let tile;
    let a = this.get(x, y);
    for(let i  = 1; i < maxRadius; i++) {
      let tiles = this.around(x, y, i);
      tile = tiles.find(t => t.item && (test ? test(t.item) : true));
      if(tile && tile.item != a) break;
    }
    return tile;
  }

  closestEmpty(x, y, test, maxRadius = 5) {
    let radius = 1;
    let tile;
    let tiles = this.around(x, y, maxRadius);
    tiles.sort((a, b) => {
      let d1 = this.steps(x, y, a.x, a.y);
      let d2 = this.steps(x, y, b.x, b.y);
      if(d1 == d2) return 0;
      if(d1 < d2) return -1;
      return 1;
    })
    tile = tiles.find(t => {
      if(t.item) return false;
      return test ? test(t.x, t.y) : true;
    })
    return tile;
  }

  from(cx, cy, r, fn) {
    for(var y = cy - r; y <= cy + r; y++) {
      if(y < 0 || y > this.h-1) continue;
      for(var x = cx - r; x <= cx + r; x++) {
        let dx = Math.abs(cx - x);
        let dy = Math.abs(cy - y);
        let d = Math.sqrt(dx*dx + dy*dy);
        if(x < 0 || x > this.w-1) continue;
        fn(this.get(x, y), x, y, d);
      }
    }
  }

  inLine(x1, y1, x2, y2, l) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    var a = Math.atan2(dy, dx);
    var targets = [];
    for(var step = 0; step < l; step++) {
      let x = Math.round(x2 + step * Math.cos(a));
      let y = Math.round(y2 + step * Math.sin(a));
      if(x < 0 || y < 0) continue;
      if(x >= this.w || y >= this.h) continue;
      let t = this.get(x, y);
      targets.push({item: t, x:x, y:y});
    }
    return targets;
  }

  inWall(x1, y1, x2, y2, l) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    var a = Math.atan2(dy, dx) + Math.PI/2;
    var targets = [];
    for(var step = -l; step <= l; step++) {
      let x = Math.round(x2 + step * Math.cos(a));
      let y = Math.round(y2 + step * Math.sin(a));
      if(x < 0 || y < 0) continue;
      if(x >= this.w || y >= this.h) continue;
      let t = this.get(x, y);
      targets.push({item: t, x:x, y: y});
    }
    return targets;
  }

  inLOS(x1, y1, x2, y2) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    var a = Math.atan2(dy, dx);
    var l = this.distance(x1, y1, x2, y2);
    var targets = [];
    for(var step = 0; step < l; step++) {
      let x = Math.round(x1 + step * Math.cos(a));
      let y = Math.round(y1 + step * Math.sin(a));
      if(x < 0 || y < 0) continue;
      if(x >= this.w || y >= this.h) continue;
      let t = this.get(x, y);
      targets.push({item: t, x:x, y: y});
    }
    return targets;
  }


  rotate(v, radians) {
    var cos = Math.cos(radians);
    var sin = Math.sin(radians);
    var nx = cos * v.x + sin * v.y;
    var ny = cos * v.y - sin * v.x;
    return {x: nx, y: ny};
  }

  inCone(x1, y1, x2, y2, l) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    var a = Math.PI/2 - Math.atan2(dy, dx);
    var targets = [];
    for(var step = 0; step < l; step++) {
      let d = step + 1;
      for(var step2 = 0; step2 < d*2 -1; step2++) {
        let p = Math.floor((d*2 -1) / 2);
        let x = (step2 - p);
        let y = (step);
        targets.push({item: null, x, y});
      }
    }
    let m = new Map();
    targets.forEach(t => {
      let p = this.rotate(t, a);
      t.x = x2 + Math.round(p.x);
      t.y = y2 + Math.round(p.y);
      t.item = this.get(t.x, t.y);
      m.set(t.item, t);
    })
    return Array.from(m.values());
  }

  around(cx, cy, r = 1) {
    var out = [];
    for(var y = cy - r; y <= cy + r; y++) {
      if(y < 0 || y > this.h-1) continue;
      for(var x = cx - r; x <= cx + r; x++) {
        if(x < 0 || x > this.w-1) continue;
        out.push({item: this.get(x, y), x:x, y: y});
      }
    }
    return out;
  }

  inRect(sx, sy, ex, ey) {
    var out = [];
    for(var y = sy; y <= ey; y++) {
      if(y < 0 || y > this.h-1) continue;
      for(var x = sx; x <= ex; x++) {
        if(x < 0 || x > this.w-1) continue;
        out.push({item: this.get(x, y), x:x, y: y});
      }
    }
    return out;
  }

  inx(cx, cy) {
    return [
      cy - 1 > -1 ? this.get(cx, cy - 1) : null,
      cx + 1 < this.w ? this.get(cx + 1, cy) : null,
      cy + 1 < this.h ? this.get(cx, cy + 1) : null,
      cx - 1 > -1 ? this.get(cx - 1, cy) : null
    ];
  }

  inRadius(cx, cy, r = 1) {
    var out = [];
    for(var y = cy - r; y <= cy + r; y++) {
      if(y < 0 || y > this.h-1) continue;
      for(var x = cx - r; x <= cx + r; x++) {
        if(x < 0 || x > this.w-1) continue;
        if(this.steps(cx, cy, x, y) > r) continue;
        out.push({item: this.get(x, y), x:x, y: y});
      }
    }
    return out;
  }

  onRadius(cx, cy, r = 1) {
    var out = [];
    for(var y = cy - r; y <= cy + r; y++) {
      if(y < 0 || y > this.h-1) continue;
      for(var x = cx - r; x <= cx + r; x++) {
        if(x < 0 || x > this.w-1) continue;
        if(this.steps(cx, cy, x, y) != r) continue;
        out.push({item: this.get(x, y), x:x, y: y});
      }
    }
    return out;
  }

  inCircle(cx, cy, r = 1) {
    var out = [];
    for(var y = cy - r; y <= cy + r; y++) {
      if(y < 0 || y > this.h-1) continue;
      for(var x = cx - r; x <= cx + r; x++) {
        if(x < 0 || x > this.w-1) continue;
        let d = this.distance(cx, cy, x, y);
        if(d <= r) out.push({item: this.get(x, y), x:x, y: y});
      }
    }
    return out;
  }

  get(x, y) {
    if(x < 0 || x > this.w-1 || y < 0 || y > this.h-1) return null;
    return this.items[this.w * y + x];
  }

  set(x, y, item) {
    if(x < 0 || x > this.w-1 || y < 0 || y > this.h-1) return null;
    return this.items[this.w * y + x] = item;
  }

  setItem(item) {
    if(!item) return;
    return this.items[this.w * item.y + item.x] = item;
  }

  remove(x, y) {
    this.items[this.w * y + x] = null;
  }

  xy(index) {
    // this.w * y + x = index
    // this.w * y + index % this.w = index
    return {x: index % this.w, y: (index - index % this.w) / this.w};
  }

  forEach(fn) {
    this.items.forEach((item, i) => {
      fn(item, i, i % this.w, i % this.h)
    });
  }

  loop(fn) {
    for(var y = 0; y < this.h; y++) {
      for(var x = 0; x < this.w; x++) {
        fn(x, y);
      }
    }
  }

  each(fn) {
    for(var y = 0; y < this.h; y++) {
      for(var x = 0; x < this.w; x++) {
        fn({item: this.get(x, y), x, y});
      }
    }
  }

  find(fn) {
    for(var y = 0; y < this.h; y++) {
      for(var x = 0; x < this.w; x++) {
        let item = this.get(x, y);
        if(item && fn({item, x, y})) {
          return {item, x, y};
        }
      }
    }
  }

  eachRow(fn) {
    let x = 0;
    for(var y = 0; y < this.h; y++) {
      fn(x, y);
    }
  }

  eachCol(fn) {
    let y = 0;
    for(var x = 0; x < this.w; x++) {
      fn(x, y);
    }
  }

  canWalkTo(sx, sy, ex, ey, diagonal = 'Never') {
    if(this.steps(sx, sy, ex, ey) == 1 && !this.get(ex, ey)) return true;
    if(this.path(sx, sy, ex, ey, diagonal).length > 1) return true;
    return false;
  }

  map() {
    let out = [];
    for(var y = 0; y < this.h; y++) {
      for(var x = 0; x < this.w; x++) {
        let item = this.get(x, y);
        item && out.push(fn({item, x, y}));
      }
    }
    return out;
  }

  some(fn) {
    let out = [];
    for(var y = 0; y < this.h; y++) {
      for(var x = 0; x < this.w; x++) {
        let item = this.get(x, y);
        if(item && fn({item, x, y})) {
          out.push({item, x, y});
        }
      }
    }
    return out;
  }


  filled(fn) {
    for(var y = 0; y < this.h; y++) {
      for(var x = 0; x < this.w; x++) {
        let item = this.get(x, y);
        item && fn({item, x, y});
      }
    }
  }

  _filled(fn) {
    let out = [];
    for(var y = 0; y < this.h; y++) {
      for(var x = 0; x < this.w; x++) {
        let item = this.get(x, y);
        item && out.push({item, x, y});
      }
    }
    return out;
  }

  firstEmpty(fn) {
    for(var y = 0; y < this.h; y++) {
      for(var x = 0; x < this.w; x++) {
        if(!this.get(x, y)) return {x,y};
      }
    }
  }

  get matrix() {
    var grid = new PF.Grid(this.w, this.h);
    for(var y = 0; y < this.h; y++) {
      for(var x = 0; x < this.w; x++) {
        let item = this.get(x, y);
        grid.setWalkableAt(x, y, !item)
      }
    }
    return grid;
  }

  path(sx, sy, ex, ey, diagonal = 'Never') {
    return new PF.AStarFinder({diagonalMovement: PF.DiagonalMovement[diagonal]}).findPath(sx, sy, ex, ey, this.matrix);
  }

  pathToAdjacent(sx, sy, ex, ey) {
    let out;
    let r = 1;
    for(var sy = ey - r; sy <= ey + r; sy++) {
      if(sy < 0 || sy > this.h-1) continue;
      for(var sx = ex - r; sx <= ex + r; sx++) {
        if(sx < 0 || sx > this.w-1) continue;
        let path = this.path(sx, sy, ex, ey);
        if(!out || out.length > path.length) {
          out = path;
        }
      }
    }
    return out;
  }

  _list() {
    return this.items.filter(item => item);
  }

  get count() {
    return this._list.length;
  }

  filter(fn) {
    return this.items.filter(fn);
  }
}

module.exports = PositionList2d;
