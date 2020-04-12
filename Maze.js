const PL = require('PositionList2d.js');
const Monster = require('Monster.js');
const Team = require('Team.js');
const Component = require('Component.js');
const monsters = require('monsters.js');
const monstersByTier = [[], [], [], [], []];
monsters.forEach(m => {
  if(m.bio.summonOnly || m.bio.leader) return;
  monstersByTier[m.bio.tier - 1].push(m);
});
class Room {
  constructor(w, h, rand, circle) {
    this.w = w;
    this.h = h;
    this.rand = rand;
    this.id = this.rand.random();
    this.connectsTo = [];
    this.cells = [];
    this.encounters = [];
    this.exits = [];
    this.maxTier = Math.ceil(this.rand.random() * 5);
    this.difficulty = Math.ceil(this.rand.random() * 5);
  }

  addExit(c, corridor) {
    this.exits.push({exit: c, corridor});
  }

  get cx() {
    let xmin = Math.min.apply(null, this.cells.map(c => c.x));
    return xmin + Math.floor(this.w / 2);
  }

  get cy() {
    let ymin = Math.min.apply(null, this.cells.map(c => c.y));
    return ymin + Math.floor(this.h / 2);
  }

  get sx() {
    return this.cells[0].x;
  }

  get sy() {
    return this.cells[0].y;
  }

  addMonsters() {
    let {maxTier, difficulty} = this;
    console.log(maxTier, difficulty)
    let s = maxTier * difficulty;
    let tiers = monstersByTier;
    let family;
    let multi = 1;
    let units = [];
    if(maxTier > 4) {
      let a = family ? tiers[4].filter(b => b.bio.family == family) : tiers[4];
      let tpl = a[Math.floor(this.rand.random() * a.length)];
      if(tpl) {
        units.push({
          stacks: difficulty * multi,
          templateId: tpl.id
        });
        multi += 1;
        family = tpl.bio.family;
      }
    }
    if(maxTier > 3) {
      let a = family ? tiers[3].filter(b => b.bio.family == family) : tiers[3];
      let tpl = a[Math.floor(this.rand.random() * a.length)];
      if(tpl) {
        units.push({
          stacks: difficulty * multi,
          templateId: tpl.id
        })
        multi += 1;
        family = tpl.bio.family;
      }
    }
    if(maxTier > 2) {
      let a = family ? tiers[2].filter(b => b.bio.family == family) : tiers[2];
      let tpl = a[Math.floor(this.rand.random() * a.length)];
      if(tpl) {
        units.push({
          stacks: difficulty * multi,
          templateId: tpl.id
        })
        multi += 1;
        family = tpl.bio.family;
      }
    }
    if(maxTier > 1) {
      let a = family ? tiers[1].filter(b => b.bio.family == family) : tiers[1];
      let tpl = a[Math.floor(this.rand.random() * a.length)];
      units.push({
        stacks: difficulty * multi,
        templateId: tpl.id
      })
      multi += 1;
      family = tpl.bio.family;
    }
    if(maxTier > 0) {
      let a = family ? tiers[0].filter(b => b.bio.family == family) : tiers[0];
      let tpl = a[Math.floor(this.rand.random() * a.length)];
      if(tpl) {
        units.push({
          stacks: difficulty * multi,
          templateId: tpl.id
        })
        multi += 1;
        family = tpl.bio.family;
      }
    }
    let team = Team.create({
      name: this.id,
      units: units,
      max: 600
    });
    let p = {
      x: this.cx,
      y: this.cy
    };
    this.encounters.push({pos: p, team: team});
  }

  connect(room, corridor) {
    if(!this.connectsTo.find(a => a.room == room)) {
      this.connectsTo.push({room, corridor});
    }
    if(!room.connectsTo.find(a => a.room == this)) {
      room.connectsTo.push({room: this, corridor});
    }
  }

  isConnectedTo(room) {
    return this.connectsTo.find(a => a.room == room);
  }

  add(item) {
    if(item.x == undefined || item.y == undefined) return;
    this.cells.push(item);
  }

  has(x, y) {
    return ~this.cells.find(item => item.x == x && item.y == y);
  }

  random() {
    return this.cells[Math.floor(this.rand.random() * this.cells.length)];
  }

  corners() {
    return [
      this.cells[0],
      this.cells[this.h],
      this.cells[this.h * this.w - this.h + 1],
      this.cells[this.h * this.w]
    ];
  }

  edges() {
    let sx = this.sx;
    let sy = this.sy;
    let cells = [];
    this.cells.forEach(c => {
      let x = c.x - sx;
      let y = c.y - sy;
      if(x == 0 && y > 0 && y < this.h-1) {
        // left edge
        cells.push({x: c.x -1, y: c.y, ex: -1, ey: 0});
      }
      if(x == this.w-1 && y > 0 && y < this.h-1) {
        // right edge
        cells.push({x: c.x + 1, y: c.y, ex: 1, ey: 0});
      }
      if(y == 0 && x > 0 && x < this.w-1) {
        // top edge
        cells.push({x: c.x, y: c.y - 1, ex: 0, ey: -1});
      }
      if(y == this.h-1 && x > 0 && x < this.w-1) {
        // bottom edge
        cells.push({x: c.x, y: c.y + 1, ex: 0, ey: 1});
      }
    })
    return cells;
  }

  outerEdges() {
    let sx = this.sx - 1;
    let sy = this.sy - 1;
    let cells = [];
    for(var x = sx; x < sx + this.w+2; x++) {
      let y = sy;
      cells.push({x, y});
      y = sy + this.h+1;
      cells.push({x, y});
    }
    for(var y = sy; y < sy + this.h + 2; y++) {
      let x = sx;
      cells.push({x, y});
      x = sx + this.w + 1;
      cells.push({x, y});
    }
    return cells;
  }

  closestCells(room) {
    let out = [null, null];
    let d = 10000;
    this.edges().forEach(c1 => {
      room.edges().forEach(c2 => {
        let x = Math.abs(c2.x - c1.x);
        let y = Math.abs(c2.y - c1.y);
        let l = x + y;
        if(l < d) {
          d = l;
          out[0] = c1;
          out[1] = c2;
        }
      })
    })

    return out;
  }

  adjacentExit(e) {
    return this.exits.find(a => {
      let x = Math.abs(a.x - e.x);
      let y = Math.abs(a.y - e.y);
      let l = x + y;
      return l < 2;
    })
  }
}
class Maze {
  constructor(name = '', maxTier = 1, difficulty = 1, rand) {
    this.name = name;
    this.maxTier = maxTier;
    this.difficulty = difficulty;
    this.rand = rand;
    this.grid = new PL(40, 40);
    this.rooms = [];
  }

  get sx() {
    return this.rooms[0] ? this.rooms[0].sx : Math.floor(this.grid.w/2);
  }

  get sy() {
    return this.rooms[0] ? this.rooms[0].sy : Math.floor(this.grid.h/2);
  }

  centerOut() {
    let cx = Math.round(this.grid.w / 2);
    let cy = Math.round(this.grid.h / 2);
    let ncx = cx;
    let ncy = cy;
    let rooms = 8;
    let a = Math.PI / (rooms/2);
    let na = 0;
    let arm = Math.ceil(this.rand.random() * 15) + 10;
    let count = rooms;
    let r = Math.ceil(this.rand.random() * 3) + 2;
    this.grid.inRadius(ncx, ncy, r).forEach(({item, x, y}) => {
      this.grid.set(x, y, Maze.l.ground);
    });
    while(count > 0) {


      ncx = Math.floor(cx + Math.cos(na) * arm);
      ncy = Math.floor(cy + Math.sin(na) * arm);

      this.grid.inLOS(cx, cy, ncx, ncy).forEach(({item, x, y}) => {
        this.grid.set(x, y, Maze.l.ground);
      })
      arm = Math.ceil(this.rand.random() * 15) + 10;
      r = Math.ceil(this.rand.random() * 3) + 2;
      this.grid.inRadius(ncx, ncy, r).forEach(({item, x, y}) => {
        this.grid.set(x, y, Maze.l.ground);
      });
      na += a;
      count -= 1;
    }
    this.grid.each(({item, x, y}) => {
      if(item) return;
      this.grid.set(x, y, Maze.l.obstacle);
    })
  }

  generate() {
    let x = 0;
    let y = 0;
    let done = false;
    let hg = 0;
    let secx = 3;
    let secy = 3;
    let bw = Math.ceil(this.grid.w/secx);
    let bh = Math.ceil(this.grid.h/secy);
    let maxw = bw - 4;
    let maxh = bh - 4;
    for(var i = 0; i < this.grid.w; i += bw) {
      for(var j = 0; j < this.grid.h; j += bh) {
        this.grid.set(i, j, 0);
        if(this.rand.random() > 1) continue;
        let w = Math.floor(this.rand.random() * (maxw)) + 1;
        let h = Math.floor(this.rand.random() * (maxh)) + 1;
        if(w < 3) w = 3;
        if(h < 3) h = 3;
        let room = new Room(w, h, this.rand);
        room.difficulty = this.difficulty;
        room.maxTier = this.maxTier;
        this.rooms.push(room);
        let minox = 2;
        let minoy = 2;
        let maxox = maxw - minox;
        let maxoy = maxh - minoy;
        let ox = this.rand.next().between(minox, maxox).floor().n;
        let oy = this.rand.next().between(minoy, maxoy).floor().n;
        this.grid.inRect(ox + i+1, oy + j+1, ox + i + w, oy + j + h)
        .forEach(item => {
          this.grid.set(item.x, item.y, 1);
          room.add({item: 1, x: item.x, y: item.y});
        })
      }
    }
  }


  addMonsters() {
    this.rooms.forEach(room => {
      room.addMonsters(this.difficulty, this.maxTier);
    })
  }

  connectRandomRooms(c = 3) {
    let empty = new PL(this.grid.w, this.grid.h);
    this.grid.each(item => {
      if(item.item == 1) {
        empty.set(item.x, item.y, 1);
      }
    });
    this.rooms.forEach(room => {
      room.outerEdges().forEach(e => {
        empty.set(e.x, e.y, 1);
      })
    })
    for(var i = 0; i < c; i++) {
      let room = this.rooms[Math.floor(this.rand.random() * this.rooms.length)];
      let connectTo = this.rooms[Math.floor(this.rand.random() * this.rooms.length)];
      if(connectTo == room) return;
      if(!connectTo) {
        return;
      }
      if(room.isConnectedTo(connectTo)) {
        return;
      }
      let cells = room.closestCells(connectTo);
      let item1 = room.adjacentExit(cells[0]) || cells[0];
      let item2 = connectTo.adjacentExit(cells[1]) || cells[1];
      let path = empty.path(item1.x + item1.ex, item1.y + item1.ey, item2.x + item2.ex, item2.y + item2.ey);
      if(!path.length) return;
      let fork = path.findIndex(c => {
        if(this.grid.get(c[0], c[1]) == 2) {
          return true;
        }
      })
      if(~fork) {
        console.log('found fork')
        // path.splice(fork+1);
      }
      let corridor = [];
      corridor.rooms = [room, connectTo];
      corridor.exits = [item1, item2];
      room.addExit(item1, corridor);
      connectTo.addExit(item2, corridor);
      path.find(p => {

        corridor.push({x: p[0], y: p[1]});
      })
      room.connect(connectTo, corridor);
    }
  }

  connectRooms() {
    let empty = new PL(this.grid.w, this.grid.h);
    this.grid.each(item => {
      if(item.item == 1) {
        empty.set(item.x, item.y, 1);
      }
    });
    this.rooms.forEach(room => {
      room.outerEdges().forEach(e => {
        empty.set(e.x, e.y, 1);
      })
    })
    this.rooms.forEach((room, i) => {
      let connectTo = this.rooms[i + 1]
      if(connectTo == room) return;
      if(!connectTo) {
        return;
      }
      if(room.isConnectedTo(connectTo)) {
        return;
      }
      let cells = room.closestCells(connectTo);
      let item1 = room.adjacentExit(cells[0]) || cells[0];
      let item2 = connectTo.adjacentExit(cells[1]) || cells[1];
      let path = empty.path(item1.x + item1.ex, item1.y + item1.ey, item2.x + item2.ex, item2.y + item2.ey);
      let fork = path.findIndex(c => {
        if(this.grid.get(c[0], c[1]) == 2) {
          return true;
        }
      })
      if(~fork) {
        // path.splice(fork+1);
      }
      let corridor = [];
      corridor.rooms = [room, connectTo];
      corridor.exits = [item1, item2];
      room.addExit(item1, corridor);
      connectTo.addExit(item2, corridor);
      path.find(p => {
        corridor.push({x: p[0], y: p[1]});
      })
      room.connect(connectTo, corridor);

    })
  }

  renderCenter() {
    let out = '';
    this.grid.each(({item, x, y}) => {
      if(!x) {
        out += '\n';
      }
      if(item == Maze.l.ground) {
        out += '  ';
      } else
      if(item == Maze.l.obstacle) {
        out += ' -';
      }
      else {
        out += ' ?'
      }
    })
    console.log(out);
  }

  render() {
    console.log(' a b c d e f g h i j k l m n o p q r s t u v')
    let terminal = new PL(this.grid.w, this.grid.h);
    this.rooms.forEach(room => {
      room.cells.forEach(item => {
        terminal.set(item.x, item.y, 1);
      });
      room.connectsTo.forEach(a => {
        a.corridor.forEach(p => {
          let nextTo = this.grid.inx(p.x, p.y, 1);
          let rooms = nextTo.filter(a => a == 1);
          let corridors = nextTo.filter(a => a == 2);
          terminal.set(p.x, p.y, 2);

        });

      })
      // room.outerEdges().forEach(e => {
      //   terminal.set(e.x, e.y, 4);
      // })
      room.exits.forEach(({exit, corridor}) => {
        terminal.set(exit.x, exit.y, 3);
      })
    })
    let out = '';
    terminal.each(({item, x, y}) => {
      if(!x) {
        out += '\n';
      }
      if(item == 4) {
        out += ' e';
      } else
      if(item == 3) {
        out += ' +';
      } else
      if(item == 2) {
        out += ' -';
      } else
      if(item == 1) {
        out += ' x';
      } else {
        out += '  ';
      }
    });

    console.log(out);
    console.log('---------------------------------')
  }
}

Maze.l = {
  ground: 1,
  obstacle: 2,
  exit: 3,
  monster: 4,
  treasure: 5,
  loot: 6,
  upgrade: 7,
  decoration: 8,

};


class Editor {
  constructor(name = 'Random Dungeon', maxTier = 1, difficulty = 1) {
    this.name = name;
    this.maxTier = maxTier;
    this.difficulty = difficulty;
  }

  static create(m) {
    return new Editor(m.name, m.maxTier, m.difficulty);
  }

  render() {
    let c = new Component(true);
    let t = html`<div>
      <input id='name' value='${this.name}' placeholder='name'>
      <input id='maxTier' type='number' value='${this.maxTier}' placeholder='max tier'>
      <input id='difficulty' type='number' value='${this.difficulty}' placeholder='difficulty'>
    </div>`;
    c.append(t);
    c.listen('#name', 'keyup', e => {
      this.name = e.target.value;
    });
    c.listen('#maxTier', 'change', e => {
      this.maxTier = parseInt(e.target.value);
    });
    c.listen('#difficulty', 'change', e => {
      this.difficulty = parseInt(e.target.value)
    });

    t = null;
    return c.tags.outer;
  }
}
Maze.Editor = Editor;
module.exports = Maze;
