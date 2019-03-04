const Component = require('Component.js');
const CardList = require('CardList.js');
const Equipment = require('Equipment.js');
const Menu = require('Menu.js');
class Armory extends Component {
  constructor(items, cash) {
    super();
    this.items = items;
    this.picked = [];
    this.cash = parseInt(cash);
    this.spent = 0;
    this.cards = new CardList([], true, 8);
    this.pickedCards = new CardList([], true, 8);
    this.slots = ['all', 'hand', 'head', 'body', 'waist', 'wrists', 'feet', 'neck', 'finger'];
    this.filter = ['hand', 'head', 'body', 'waist', 'wrists', 'feet', 'neck', 'finger'];
  }

  pick(item) {
    let cost = parseInt(item.bio.cost);

    if(cost + this.spent > this.cash) return;
    this.spent += cost;
    this.picked.push(item);
    this.render();
  }

  unpick(i) {
    let item = this.picked[i];
    let cost = parseInt(item.bio.cost);
    this.spent -= cost;
    this.picked.splice(i, 1);
    this.render();
  }

  static get style() {
    return html`<style>
      .cash-flow {
        width: 100%;
        height: 64px;
        background-image: url(sheet_of_old_paper.png);
        padding: 20px;
        font-size: 24px;
      }
      .equipment {
        width: 420px;
        height: 620px;
        padding: 20px;
        border-radius: 10px;
        box-shadow: inset 0px 0px 11px 4px rgba(0,0,0,0.61);
        background-image: url(sheet_of_old_paper.png);
        border: 5px solid rgba(0,0,0,0);
        text-align: center;
      }

      .card-list {
        height: 100%;
      }
      .for-sale, .bought {
        display: inline-block;
      }
      .windows {
        display: flex;
        justify-content: space-evenly;
        padding-top: 40px;
      }

      .slots {
        font-size: 14px;

      }

      .slots .slot {
        background-color: #999;
        padding: 2px 4px;
        margin: 2px;
        border-radius: 4px;
      }
      .slots .slot:hover {
        outline: 1px solid black;
      }
      .slots .slot.show {
        background-color: #ccc;
      }

    </style>`;
  }

  toggleFilter(slot) {
    this.cards.offset = 0;
    if(slot == 'all') {
      this.filter = ['hand', 'head', 'body', 'waist', 'wrists', 'feet', 'neck', 'finger'];
    } else {
      this.filter = [slot];
    }
    this.render();
  }

  render() {
    this.clear();
    this.addStyle(Equipment.style);
    this.addStyle(Armory.style);
    let menu = new Menu([
      {
        text: 'Buy',
        fn: () => this.trigger('done')
      },
      {
        text: 'Cancel',
        fn: () => this.trigger('close')
      }
    ]);
    let t = html`<div>
      <div class='cash-flow'>
        Cash: ${this.cash} Spent: ${this.spent}
        <span class='slots'></span>
      </div>
      <div class='windows'>
        <div class='for-sale'>

        </div>
        <div class='bought'></div>
      </div>
    </div>`;
    let slots = t.querySelector('.slots');
    this.slots.forEach(s => {
      let selected = ~this.filter.indexOf(s);
      let d = html`<span class='slot ${selected ? 'show' : 'hide'}'>${s}</span>`;
      d.addEventListener('click', this.toggleFilter.bind(this, s));
      slots.appendChild(d);
    })
    let cards = this.items.filter(i => ~this.filter.indexOf(i.bio.slot))
    .map(i => {
      let t = i.renderStoreItem();
      t.addEventListener('click', this.pick.bind(this, i));
      return t;
    });
    let cl = this.cards;
    cl.cards = cards;
    cl.tags.outer.classList.add('equipment');
    let picked = this.pickedCards;
    picked.cards = this.picked.map((p, i) => {
      let c = p.renderStoreItem();
      c.addEventListener('click', this.unpick.bind(this, i));
      return c;
    });
    picked.tags.outer.classList.add('equipment');
    t.querySelector('.for-sale').appendChild(cl.render());
    t.querySelector('.bought').appendChild(picked.render());
    this.append(t);
    this.append(menu.render());
    return this.tags.outer;
  }
}

module.exports = Armory;
