const Monster = require('Monster.js');
const Menu = require('Menu.js');
const MonsterCard = require('MonsterCard.js');
const Team = require('Team.js');
const guid = require('guid.js');
const TeamViewer = require('TeamViewer.js');
class TeamSelect  {
  constructor(items, container, tw, th, cash, max, teamNames, onDone, onExit) {
    this.onDone = onDone;
    this.onExit = onExit;
    this.teamNames = teamNames;
    this.items = items.filter(m => !m.bio.summonOnly);
    this.tw = tw;
    this.th = th;
    this.container = container;
    this.cash = cash || 200;
    this.spent = 0;
    this.max = max || 8;
    this.picked = document.createElement('canvas');
    this.picked.width = this.max * this.tw;
    this.picked.height = th;
    this.picked.addEventListener('click', (e) => this.sell(e))
    this.container.appendChild(this.picked);
    this.monsters = [];
    this.maxTeams = this.teamNames.length;
    this.teams = [];
    this.images = {};
    var loading = {};

    this.teamName = html`<input type='text' value='${this.teamNames[this.teams.length ? this.teams.length-1 : 0]}'
      style='padding: 10px;
        border: none;
        font-size: 20px;
        font-weight: bold;
        margin: 4px;
        box-shadow: 0px 2px 4px -1px rgba(0,0,0,0.5);
        border-radius: 4px;
        background-color: rgba(0,0,0,0);
        cursor: inherit;
        background: url(sheet_of_old_paper_horizontal.png);
        text-align: center;'
    >`;
    this.teamName.addEventListener('keyup', e => {
      let i = this.teams.length;
      this.teamNames[i] = this.teamName.value;
    })
    this.sumSpent = html`<div style='user-select:none;color:white;font-size:24px;'></div>`;
    this.container.appendChild(this.sumSpent);
    this.container.appendChild(this.teamName);
    this.selectedFamily = 'all';
    var familySelect = html`<select><option value='all'>All</option></select>`;
    var families = [];
    this.items.forEach(item => {
      if(~families.indexOf(item.bio.family)) return;
      families.push(item.bio.family);
      let o = html`<option value='${item.bio.family}'>${item.bio.family}</option>`;
      familySelect.appendChild(o);
    })

    familySelect.addEventListener('change', e => {
      this.selectedFamily = familySelect.value;
      this.monsterCards.forEach(c => {
        c.cached.style.display = 'inline-block';
        if(this.selectedFamily != 'all' && c.item.bio.family != this.selectedFamily) {
          c.cached.style.display = 'none';
        }
      })
    });

    let preset = html`<button>Choose Preset</button>`;
    preset.addEventListener('click', e => {
      let ts = new TeamViewer('Pick a team');
      ts.on('done', team => {
        let t = Team.create(team);
        console.log('picked preset team', t)
        t.monsters.forEach(m => {
          this.monsters.push(new Monster(m.template, m.stacks));
        })
        this.done();
      });
      ts.render(this.container);
    })
    this.container.appendChild(preset);
    let menu = new Menu([
      {
        text: 'Share',
        hidden: true,
        fn: () => this.share()
      },
      {
        text: 'Done',
        fn: () => this.done()
      },
      {
        text: 'Back',
        hidden: !this.onExit,
        fn: this.onExit
      }
    ]);
    this.container.appendChild(menu.render());
    this.container.appendChild(familySelect);
    this.monsterCards = this.items.map(item => {
      var monster = new Monster(item);
      var card = new MonsterCard(monster);
      var c = document.createElement('div');
      c.style.display = 'inline-block';
      card.state = 'big';
      card.render(c, true);
      c.addEventListener('click', (e) => this.buy(e, item, monster));
      c.addEventListener('mouseover', () => {
        c.style.backgroundColor = 'pink';
      })
      c.addEventListener('mouseout', () => {
        c.style.backgroundColor = 'transparent';
      })
      this.container.appendChild(c);
      return card;
    });

    this.render();
  }

  done() {
    if(!this.monsters.length) {
      window.alert('You need to select at least one unit.');
      return;
    }
    var i = this.teams.push(this.monsters);
    if(this.teams.length == this.maxTeams) {
      if(typeof this.onDone !== 'function') return;
      if(this.maxTeams == 1) {
        let name = this.teamNames[0];
        return this.onDone(Team.fromMonsters(name, this.teams[0]));
      }
      if(this.maxTeams == 2) {
        let name1 = this.teamNames[0];
        let name2 = this.teamNames[1];
        return this.onDone(Team.fromMonsters(name1, this.teams[0]), Team.fromMonsters(name2, this.teams[1]));
      }
    }
    this.teamName.value = this.teamNames[i];
    this.monsters = [];
    this.spent = 0;
    this.render();
  }

  share() {
    let units = this.monsters.map(m => {
      return {
        templateId: m.template.id,
        stacks: m.stacks
      }
    });
    let name = window.prompt('Name:');
    let team = {name, units};
    console.log(JSON.stringify(team));
    console.log(guid());
  }

  sell(e) {
    let split = e.ctrlKey;
    let removeAll = e.shiftKey;
    let i = Math.floor(e.offsetX / this.tw);
    let item = this.monsters[i];
    let c = item.bio.cost;
    if(split) {
      if(this.monsters.length < this.max) {
        let b = Math.floor(item.stacks/2);
        item.addStack(-b);
        this.monsters.push(new Monster(item.template, b));
      }
    } else
    if(removeAll) {
      c = item.stacks * item.bio.cost;
      this.spent -= c;
      this.monsters.splice(i, 1);
    } else
    if(item.stacks > 1) {
      this.spent -= c;
      item.addStack(-1);
    } else {
      this.spent -= c;
      this.monsters.splice(i, 1);
    }

    this.render();
  }

  buy(e, item, monster) {
    let cost = parseInt(item.bio.cost);
    if(cost + this.spent <= this.cash && this.monsters.length < this.max) {
      let existingMonster = this.hasStackableMonster(item);
      let currentStack = existingMonster ? existingMonster.stacks : 0;
      let stacks = e.shiftKey ? item.bio.maxStacks - currentStack : 1;
      if(cost * stacks > this.left) {
        stacks = Math.floor(this.left / cost);
      }
      if(existingMonster) {
        existingMonster.addStack(stacks);
      } else {
        this.monsters.push(new Monster(monster.template, stacks));

      }
      this.spent += cost * stacks;
      this.render();
    }
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
