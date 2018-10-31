const Monster = require('Monster.js');
class TeamSelect  {
  constructor(items, container, w, h, tw, th, cash, done) {
    this.items = items;
    this.w = w;
    this.h = h;
    this.tw = tw;
    this.th = th;
    this.container = container;
    this.cash = cash || 200;
    this.spent = 0;
    this.max = 8;
    this.picked = document.createElement('canvas');
    this.picked.width = 2000;
    this.picked.height = th;
    this.picked.addEventListener('click', (e) => {
      let i = Math.floor(e.offsetX / this.tw);
      let item = this.monsters[i];
      let c = item.bio.cost;
      this.spent -= c;
      if(item.stacks > 1) {
        item.addStack(-1);
      } else {
        this.monsters.splice(i, 1);
      }
      this.render();
    })
    this.container.appendChild(this.picked);
    this.monsters = [];
    this.teams = [];
    this.images = [];
    items.forEach(item => {
      if(~this.images.indexOf(item.bio.sprite.spritesheet)) return;
      this.images.push(item.bio.sprite.spritesheet);
    })
    this.imagesLoader = Promise.all(this.images.map(src => {
      return new Promise((resolve, reject) => {
        var image = new Image();
        image.onload = () => {
          resolve(image);
        }
        image.src = src;
      })
    }));
    this.monsterCards = items.map(item => {
      var out = {
        item: item,
        canvas: null,
        w: 200,
        h: 200,
        ct: null,
        hover: false
      };
      var c = document.createElement('canvas');
      c.width = 200;
      c.height = 200;
      c.addEventListener('click', () => {
        let cost = parseInt(item.bio.cost);
        console.log('cost', cost, this.spent, this.cash)
        if(cost + this.spent <= this.cash && this.monsters.length < this.max) {
          let existingMonster = this.hasStackableMonster(item);
          console.log('existingMonster', existingMonster)
          if(existingMonster) {
            existingMonster.addStack(1);
          } else {
            let monster = new Monster(item);
            this.monsters.push(monster);

          }
          this.spent += cost;
          this.render();
        }
      })
      c.addEventListener('mouseover', () => {
        c.style.backgroundColor = '#776611';
      })
      c.addEventListener('mouseout', () => {
        c.style.backgroundColor = 'transparent';
      })
      this.container.appendChild(c);
      out.canvas = c;
      out.ct = c.getContext('2d');
      return out;
    })
    this.sumSpent = document.createElement('div');
    this.sumSpent.style.userSelect = 'none'
    this.container.appendChild(this.sumSpent);
    this.doneButton = document.createElement('button');
    this.doneButton.textContent = 'Done';
    this.doneButton.addEventListener('click', () => {
      var i = this.teams.push(this.monsters);
      this.teams[i-1].forEach(m => m.ai = true)
      if(this.teams.length == 2) {
        return done();
      }
      this.monsters = [];
      this.spent = 0;
      this.render();
    });
    this.container.appendChild(this.doneButton);
  }

  hasStackableMonster(item) {
    return this.monsters.find(m => m.bio.name == item.bio.name && this.canStack(m))
  }

  canStack(monster) {
    return monster.stacks < monster.bio.maxStacks;
  }

  hasMonster(item) {
    return this.monsters.find(m => m.bio.name == item.bio.name);
  }

  render() {
    console.log('render')
    this.imagesLoader.then(images => {
      this.monsterCards.forEach(c => {
        if(c.hover) {
          c.ct.fillStyle = '#776611'
          c.ct.fillRect(0, 0, c.w, c.h);
        } else {
          c.ct.clearRect(0, 0, c.w, c.h);
        }
        if(c.item.stats.health < 1) {
          c.ct.fillStyle = '#aa0000'
          c.ct.fillRect(0, 0, c.w, c.h);
        }
        if(c.item == this.currentActor) {
          c.ct.fillStyle = '#00aa00'
          c.ct.fillRect(0, 0, c.w, c.h);
        }
        c.ct.fillStyle = 'black';
        var {sprite, name, cost} = c.item.bio;
        var image = new Image();
        image.src = sprite.spritesheet;
        // c.ct.drawImage(c.canvas, 10, 10, this.tw, this.th)
        c.ct.drawImage(image, sprite.x, sprite.y, sprite.w, sprite.h, 0, 0, this.tw, this.th);
        c.ct.fillText(`name: ${name}`, 10, 20 + this.th);
        c.ct.fillText(`cost: ${cost}`, 10, 30 + this.th);
        Object.keys(c.item.stats).forEach((key, i) => {
          let y = this.th + 40 + (i * 10);
          let x = 10;
          let total = (c.item['bonus' + key] || 0) + c.item.stats[key];
          c.ct.fillText(`${key}: ${total}`, x, y);
        })
      })
      console.log('rerender')
    });
    var ct = this.picked.getContext('2d');
    ct.clearRect(0,0, 2000, this.th);
    this.monsters.forEach((m, i) => {
      var {sprite} = m.bio;
      var image = new Image();
      image.src = sprite.spritesheet;
      ct.drawImage(image, sprite.x, sprite.y, sprite.w, sprite.h, this.tw * i, 0, this.tw, this.th);
      console.log('stacks', m.stacks);
      ct.font = '16px monospace';
      ct.fillStyle = 'black';
      ct.fillRect(this.tw * i, this.th - 10, 16, 12)
      ct.fillStyle = 'red';
      ct.fillText(m.stacks, this.tw * i + 1, this.th);
    })
    this.sumSpent.textContent = `${this.spent} / ${this.cash}`;
  }
};

module.exports = TeamSelect;
