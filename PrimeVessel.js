const Component = require('Component.js');
const abilityTemplate = require('ability-tpl.js');
const CS = require('CS.js');
const ids = {
  air: {id: '7492bfdc-5766-2346-ab18-2f8b9c83f671', stats: [{type: 'element', val: 'air'}]},
  attack: {id: 'f1fe608b-8727-5e0c-5c98-03053b6b1a0e', stats: [{type: 'source', val: 'attack'}]},
  blessing: {id: 'aa893019-6180-b534-f421-5aabad5b5d2c', stats: [{type: 'source', val: 'blessing'}]},
  circle: {id: 'f5e0823d-a666-420e-1c0f-bcded3df41d9', stats: [
    {type: 'shape', val: 'circle'},
    {type: 'radius', val: () => __roll(1, 3)},
    {type: 'resourceCost', val: 3}
  ]},
  cone: {id: '1f890d9a-a4ac-2695-c67d-82849239d4b4', stats: [
    {type: 'shape', val: 'cone'},
    {type: 'radius', val: () => __roll(2, 4)},
    {type: 'resourceCost', val: 2}
  ]},
  curse: {id: '5901ce52-9bdc-f628-8fc4-1973e20f532c', stats: [{type: 'source', val: 'curse'}]},
  earth: {id: '9af86cfa-1288-0808-0433-319429c5f3b8', stats: [{type: 'element', val: 'earth'}]},
  fire: {id: '192a24a2-5388-12bf-dcb2-d995924ee7d9', stats: [{type: 'element', val: 'fire'}]},
  force: {id: '866db0c8-24e2-adc1-b50a-0240f30d4e99', stats: [{type: 'element', val: 'force'}]},
  highPower: {id: '8d9bb1fd-24fd-4c16-6f06-e45f0e94642c', stats: [
    {type: 'multiplier', val: 1.5},
    {type: 'minPower', val: () => __roll(4, 6)},
    {type: 'maxPower', val: () => __roll(7, 10)},
    {type: 'resourceCost', val: 2}
  ]},
  line: {id: '17b6ff43-11b7-8fab-48d2-36c466ed53fa', stats: [
    {type: 'shape', val: 'line'},
    {type: 'radius', val: () => __roll(2, 8)},
    {type: 'resourceCost', val: 1}
  ]},
  longRange: {id: 'a192fd9b-357d-ce28-0dfb-136413dff640', stats: [
    {type: 'range', val: 10},
    {type: 'multiplier', val: 0.5}
  ]},
  lowPower: {id: '6133a418-b06d-88a3-7dc9-c11b9b965463', stats: [
    {type: 'multiplier', val: 0.5},
    {type: 'minPower', val: 1},
    {type: 'maxPower', val: 2}
  ]},
  mediumPower: {id: '232e1ce3-ab4e-2816-8e20-f35f8373e328', stats: [
    {type: 'multiplier', val: 1},
    {type: 'minPower', val: () => __roll(1, 4)},
    {type: 'maxPower', val: () => __roll(5, 10)},
    {type: 'resourceCost', val: 1}
  ]},
  mediumRange: {id: '3f0a2927-68a8-8819-f623-72d1f66b1e79', stats: [
    {type: 'range', val: 5},
    {type: 'multiplier', val: 0.7}
  ]},
  meleeRange: {id: 'ad610e5c-8794-5980-cbbb-7a772aa18ea4', stats: [{type: 'range', val: 1}]},
  point: {id: '4e66ef56-5301-4834-047a-d0cd61323e87', stats: [{type: 'shape', val: 'point'}]},
  rot: {id: '45c263b4-7053-e0b1-6a4b-3059da133973', stats: [{type: 'element', val: 'rot'}]},
  shortRange: {id: 'c055daa7-636b-0c9b-017d-8deb389a2805', stats: [
    {type: 'range', val: '2'},
    {type: 'multiplier', val: 0.8}
  ]},
  spell: {id: 'afdf73a6-1499-eeef-2163-a8a965cbb3fc', stats: [{type: 'source', val: 'spell'}]},
  square: {id: '90e8a9f8-cc23-4359-2d90-b25f83f5f12e', stats: [
    {type: 'shape', val: 'square'},
    {type: 'radius', val: () => __roll(1, 3)},
    {type: 'resourceCost', val: 4}
  ]},
  vitality: {id: '1da0934c-7f35-fa4d-1af6-becbe41b1d20', stats: [{type: 'element', val: 'vitality'}]},
  water: {id: 'dc15ece5-6dff-9077-fb85-0c7c137dd1f1', stats: [{type: 'element', val: 'water'}]},
  shortDuration: {id: '9bb3f571-e41e-42ba-726e-1a3659f6c948', stats: [
    {type: 'duration', val: 3},
    {type: 'resourceCost', val: 2}
  ]},
  mediumDuration: {id: '00b126f5-3e28-7dd1-eb3b-e8e1bdcb4477', stats: [
    {type: 'duration', val: 3},
    {type: 'resourceCost', val: 4}
  ]},
  longDuration: {id: '9907606a-8a5b-ee1d-d777-2c0927fddc1b', stats: [
    {type: 'duration', val: 3},
    {type: 'resourceCost', val: 6}
  ]}
};
const Sprite = require('Sprite.js');
const icons = require('icons.js');
const _prismaticCloud = icons.find(i => i.bio.name == 'Prismatic Cloud');
const sprites = {
  make: new Sprite(_prismaticCloud.bio.sprite)
};
class PrimeVessel extends Component {
  constructor(items) {
    super();
    this.menuItems = [
      {e: 'Power', glyphs: [ids.lowPower, ids.mediumPower, ids.highPower], picked: null},
      {e: 'Range', glyphs: [ids.meleeRange, ids.shortRange, ids.mediumRange, ids.longRange], picked: null},
      {e: 'Shape', glyphs: [ids.point, ids.line, ids.cone, ids.circle, ids.square], picked: null},
      {e: 'Element', glyphs: [ids.force, ids.water, ids.fire, ids.air, ids.earth, ids.vitality, ids.rot], picked: null},
      {e: 'Source', glyphs: [ids.attack, ids.spell, ids.blessing, ids.curse], picked: null},
      {e: 'Duration', glyphs: [ids.shortDuration, ids.mediumDuration, ids.longDuration], picked: null},
    ];
    this.items = items;
  }

  openGlyphs(mi) {
    let t = new Component(false, 'glyphs');
    let glyphs = this.items.filter(i => mi.glyphs.find(g => g.id == i.item.template.id));
    glyphs.forEach(g => {
      let c = g.item.canvas.clone();
      c.addEventListener('click', e => {
        mi.picked = g;
        t.unmount();
        this.render();
      });
      t.append(c);
    })
    this.append(t.tags.outer);
  }

  craft() {
    let damage = this.menuItems[0].picked;
    let range = this.menuItems[1].picked;
    let area = this.menuItems[2].picked;
    let element = this.menuItems[3].picked;
    let source = this.menuItems[4].picked;
    if(!damage || !range || !area || !element || !source) return;
    let itemsUsed = this.menuItems.filter(mi => mi.picked);
    let stats = itemsUsed.map(mi => {
      return mi.glyphs.find(g => g.id == mi.picked.item.template.id).stats;
    });
    let tpl = new CS(abilityTemplate).default;
    stats.forEach(group => {
      group.forEach(stat => {
        console.log('set', stat.type, 'to', stat.val);
        let val = typeof stat.val == 'function' ? stat.val() : stat.val;
        if(stat.type == 'multiplier') {
          tpl.stats[stat.type] *= val;
        } else
        if(stat.type == 'resourceCost') {
          tpl.stats[stat.type] += val;
        } else {
          tpl.stats[stat.type] = val;
        }
      })
    });
    tpl.bio.name = 'Custom Ability';
    tpl.bio.sprite = _prismaticCloud.bio.sprite;
    this.trigger('crafted ability', tpl, itemsUsed.map(i => i.picked));
  }

  render() {
    this.clear();
    this.tags.outer.id = 'prime-vessel';
    console.log(this)
    let s = -Math.PI/2;
    let e = s + Math.PI*2;
    let range = Math.PI*2;
    let a = range / (this.menuItems.length);
    let r = 100;
    for(let i = 0, c = 0; c < this.menuItems.length; i += a, c += 1) {
      let top = 110 + Math.sin(s+i) * r;
      let left = 110 + Math.cos(s+i) * r;
      let item = html`<div class='menu-item' style='top: ${top}px; left: ${left}px;'></div>`;
      addToolTip(item, this.menuItems[c].e);
      this.menuItems[c].picked && item.appendChild(this.menuItems[c].picked.item.canvas.clone());
      item.addEventListener('click', e => this.openGlyphs(this.menuItems[c]));
      this.append(item);
    }
    let item = html`<div class='menu-item' style='top: 110px; left: 110px;'></div>`;
    addToolTip(item, 'craft ability');
    item.appendChild(sprites.make.canvas.clone());
    item.addEventListener('click', e => this.craft());
    this.append(item);
    return this.tags.outer;
  }
}

module.exports = PrimeVessel;
