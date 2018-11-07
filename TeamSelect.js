const Monster = require('Monster.js');
const MonsterCard = require('MonsterCard.js');
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
        c.innerHTML = out.card.html();
        let image = c.querySelector('.card-image');
        image.appendChild(item.canvas);
        // c.width = 200;
        // c.height = 200;
        c.addEventListener('click', () => {
          let cost = parseInt(item.bio.cost);
          if(cost + this.spent <= this.cash && this.monsters.length < this.max) {
            let existingMonster = this.hasStackableMonster(item);
            if(existingMonster) {
              existingMonster.addStack(1);
            } else {
              this.monsters.push(new Monster(monster.template));

            }
            this.spent += cost;
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
    this.doneButton = document.createElement('button');
    this.doneButton.textContent = 'Done';
    this.doneButton.style.display = 'block';
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
