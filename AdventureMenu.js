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
const _inventory = icons.find(ic => ic.bio.name == 'GridBox');
const _bg = icons.find(ic => ic.bio.name == 'Ability Background');
const _log = icons.find(ic => ic.bio.name == 'Log');
const _cs = icons.find(ic => ic.bio.name == 'Character Sheet');
const _bowl = icons.find(ic => ic.bio.name == 'Bowl');
const _equipment = icons.find(ic => ic.bio.name == 'Equipment');
const sprites = {
  inventory: new Sprite(_inventory.bio.sprite),
  time: new Sprite(_wait.bio.sprite),
  bg: new Sprite(_bg.bio.sprite),
  quests: new Sprite(_log.bio.sprite),
  cs: new Sprite(_cs.bio.sprite),
  craft: new Sprite(_bowl.bio.sprite),
  equipment: new Sprite(_equipment.bio.sprite)
};
class AdventureMenu extends Component {
  constructor() {
    super();
    this.items = [
      {tag: sprites.quests.canvas, e: 'open quests'},
      {tag: sprites.cs.canvas, e: 'open team'},
      {tag: sprites.craft.canvas, e: 'open crafting'},
      {tag: sprites.equipment.canvas, e: 'open inventory'}
    ];
    this.view = 'menu';
  }

  render() {
    this.clear();
    this.tags.outer.id = 'adventure-menu';
    let r = 100;
    let s = -Math.PI/2;
    let e = s + Math.PI;
    let range = Math.PI;
    let a = range / (this.items.length);
    let showHide = html`<div id='show-hide'>Show/Hide</div>`;
    showHide.addEventListener('click', e => {
      if(this.view != 'menu') {
        this.view = 'menu';
        this.tags.outer.classList.remove('hidden');
      } else {
        this.view = 'showhide';
        this.tags.outer.classList.add('hidden');
      }
      this.render();
    })
    this.append(showHide);
    if(this.view != 'menu') return this.tags.outer;
    for(let i = 0, c = 0; i < range; i += a, c += 1) {
      let top = 100 + Math.sin(s+i) * r;
      let left = 100 + Math.cos(s+i) * r;
      let item = html`<div class='menu-item' style='top: ${top}px; left: ${left}px;'></div>`;
      addToolTip(this.items[c].tag, this.items[c].e);
      item.appendChild(this.items[c].tag);
      item.addEventListener('click', e => this.trigger(this.items[c].e));
      this.append(item);
    }
    let texture = html`<div class='center texture'></div>`;
    let time = sprites.time.canvas;
    addToolTip(time, 'end turn');
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
