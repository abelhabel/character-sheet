const Monster = require('Monster.js');
const MonsterCard = require('MonsterCard.js');
class TeamSelect  {
  constructor(items, container, w, h, tw, th, cash, maxTeams, done) {
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
    this.maxTeams = maxTeams || 2;
    this.teams = [];
    this.images = {};
    var loading = {};
    this.imagesLoader = Promise.all(items.map(item => {
      var src = item.bio.sprite.spritesheet;
      if(loading[src]) return Promise.resolve();
      loading[src] = true;
      return new Promise((resolve, reject) => {
        var image = new Image();
        this.images[src] = image;
        image.onload = () => {
          resolve(image);
        }
        image.src = src;
      })
    }));
    this.imagesLoader.then(images => {
      this.cacheCanvases();
      return images;
    })
    .then(images => {
      this.monsterCards = items.map(item => {
        var monster = new Monster(item);
        var out = {
          item: item,
          monster: monster,
          card: new MonsterCard(monster),
          canvas: null,
          w: 200,
          h: 200,
          ct: null,
          hover: false
        };
        var c = document.createElement('div');
        c.style.display = 'inline-block';
        out.card.state = 'big';
        out.card.render(c, true);
        // let image = c.querySelector('.card-image');
        // image.appendChild(item.canvas);
        // c.width = 200;
        // c.height = 200;
        c.addEventListener('click', (e) => {
          let cost = parseInt(item.bio.cost);
          if(cost + this.spent <= this.cash && this.monsters.length < this.max) {
            let existingMonster = this.hasStackableMonster(item);
            let stacks = e.shiftKey ? item.bio.maxStacks - (existingMonster ? existingMonster.stacks : 0): 1;
            if(cost * stacks > this.left) {
              stacks = (this.left / cost);
            }
            if(existingMonster) {
              existingMonster.addStack(stacks);
            } else {
              this.monsters.push(new Monster(monster.template, stacks));

            }
            this.spent += cost * stacks;
            this.render();
          }
        })
        c.addEventListener('mouseover', () => {
          c.style.backgroundColor = 'pink';
        })
        c.addEventListener('mouseout', () => {
          c.style.backgroundColor = 'transparent';
        })
        this.container.appendChild(c);
        return out;
      })
    });

    this.sumSpent = document.createElement('div');
    this.sumSpent.style.userSelect = 'none';
    this.sumSpent.style.color = 'white';
    this.sumSpent.style.fontSize = '24px';
    this.container.appendChild(this.sumSpent);
    this.selectedFamily = 'all';
    var familySelect = document.createElement('select');
    let o = document.createElement('option');
    o.value = 'all';
    o.textContent = 'All';
    familySelect.appendChild(o);
    var families = [];
    items.forEach(item => {
      if(~families.indexOf(item.bio.family)) return;
      families.push(item.bio.family);
      let o = document.createElement('option');
      o.value = item.bio.family;
      o.textContent = item.bio.family;
      familySelect.appendChild(o);
    })

    familySelect.addEventListener('change', e => {
      this.selectedFamily = familySelect.value;
      this.monsterCards.forEach(c => {
        c.card.cached.style.display = 'inline-block';
        if(this.selectedFamily != 'all' && c.monster.bio.family != this.selectedFamily) {
          c.card.cached.style.display = 'none';
        }
      })
    })
    this.doneButton = document.createElement('button');
    this.doneButton.textContent = 'Done';
    this.doneButton.style.display = 'block';
    this.doneButton.style.position = 'fixed';
    this.doneButton.style.left = '10px';
    this.doneButton.style.top = '100px';
    this.doneButton.addEventListener('click', () => {
      var i = this.teams.push(this.monsters);
      this.teams[i-1].forEach(m => m.ai = true)
      if(this.teams.length == this.maxTeams) {
        return typeof done == 'function' && done(this.teams[i-1]);
      }
      this.monsters = [];
      this.spent = 0;
      this.render();
    });
    this.container.appendChild(this.doneButton);
    this.container.appendChild(familySelect);
  }

  get left() {
    return this.cash - this.spent;
  }

  cacheCanvases() {
    this.items.forEach(item => {
      var canvas = document.createElement('canvas');
      canvas.width = this.tw;
      canvas.height = this.th;
      var c = canvas.getContext('2d');
      var sprite = item.bio.sprite;
      var img = this.images[sprite.spritesheet];
      c.drawImage(img, sprite.x, sprite.y, sprite.w, sprite.h, 0, 0, this.tw, this.th);
      item.canvas = canvas;
    })
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
    var ct = this.picked.getContext('2d');
    ct.clearRect(0,0, 2000, this.th);
    this.monsters.forEach((m, i) => {
      var {sprite} = m.bio;
      ct.drawImage(m.canvas, this.tw * i, 0, this.tw, this.th);
      ct.font = '16px monospace';
      ct.fillStyle = 'black';
      ct.fillRect(this.tw * i, this.th - 10, 16, 12)
      ct.fillStyle = 'red';
      ct.fillText(m.stacks, this.tw * i + 1, this.th);
    })
    this.sumSpent.textContent = `Spent: ${this.spent} / ${this.cash} | ${this.monsters.length} / ${this.max} monsters`;
  }
};

module.exports = TeamSelect;
