const Sprite = require('Sprite.js');
const Slider = require("Slider.js");
const Component = require("Component.js");
const icons = require('icons.js');
const _ability = icons.find(ic => ic.bio.name == 'Ability Book');
const _defend = icons.find(ic => ic.bio.name == 'Defend');
const _wait = icons.find(ic => ic.bio.name == 'Wait');
const _surrender = icons.find(ic => ic.bio.name == 'Surrender');
const _cursor = icons.find(ic => ic.bio.name == 'Ability Cursor');
const _volume = icons.find(ic => ic.bio.name == 'Sound');
const _inventory = icons.find(ic => ic.bio.name == 'Inventory');
const _bg = icons.find(ic => ic.bio.name == 'Ability Background');
const _log = icons.find(ic => ic.bio.name == 'Log');
const sprites = {
  inventory: new Sprite(_inventory.bio.sprite),
  time: new Sprite(_wait.bio.sprite),
  bg: new Sprite(_bg.bio.sprite),
  quests: new Sprite(_log.bio.sprite)
};
class AdventureMenu extends Component {
  constructor() {
    super();
    this.items = [
      {tag: sprites.inventory.canvas, e: 'open inventory'},
      {tag: sprites.quests.canvas, e: 'open quests'}
    ];
  }

  render() {
    this.clear();
    this.tags.outer.id = 'adventure-menu';
    let a = 2*Math.PI / this.items.length;
    let r = 100;
    let s = 0-Math.PI/2 - Math.PI/4;
    let e = 2*Math.PI + s;
    for(let i = s, c = 0; i < e; i += a, c += 1) {
      let top = 100 + Math.sin(i) * r;
      let left = 100 + Math.cos(i) * r;
      let item = html`<div class='menu-item' style='top: ${top}px; left: ${left}px;'></div>`;
      item.appendChild(this.items[c].tag);
      item.addEventListener('click', e => this.trigger(this.items[c].e));
      this.append(item);
    }
    let texture = html`<div class='center texture'></div>`;
    let time = sprites.time.canvas;
    time.addEventListener('click', e => {
      console.log('end turn')
      this.trigger('end turn')
    })
    time.classList.add('center', 'end-turn', 'menu-item');
    time.addEventListener('click', e => {
      console.log('end turn')
      this.trigger('end turn')
    })
    time.classList.add('center', 'end-turn', 'menu-item');
    // this.append(shadow);
    this.append(texture);
    this.append(time);
    return this.tags.outer;
  }
}

module.exports = AdventureMenu;
