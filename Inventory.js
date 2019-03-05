const GridBox = require('GridBox.js');
const PrimeVessel = require('PrimeVessel.js');
const SoundPlayer = require('SoundPlayer.js');
const sp = new SoundPlayer();
class Inventory extends GridBox {
  constructor() {
    super(8, 8);
    this.slots = [
      {name: 'hand', item: null},
      {name: 'hand', item: null},
      {name: 'head', item: null},
      {name: 'body', item: null},
      {name: 'waist', item: null},
      {name: 'wrists', item: null},
      {name: 'feet', item: null},
      {name: 'neck', item: null},
      {name: 'finger', item: null},
      {name: 'finger', item: null},
    ];
  }

  export() {
    return {
      slots: this.slots.map(s => {
        return {name: s.name, item: s.item && s.item.template.id};
      }),
      list: GridBox.prototype.export.call(this)
    };
  }

  import(inv, models) {
    inv.slots.forEach((s, i) => {
      if(!s.item) return;
      this.slots[i].item = models.Equipment.create(s.item);
    });
    GridBox.prototype.import.call(this, inv.list, models);
  }

  get equipped() {
    return this.slots.filter(s => s.item);
  }

  get equippedIds() {
    return this.equipped.map(e => e.template.id);
  }

  renderSlot(slot) {
    let t = html`<div class='dolly-slot'>
      <div class='slot-name'>${slot.name}</div>
      <div class='slot-item'></div>
    </div>`;
    if(slot.item) {
      t.querySelector('.slot-item').appendChild(slot.item.sprite.canvas.clone());
    }
    t.addEventListener('click', e => {
      if(this.selectedItems.length != 1) return;
      let item = this.selectedItems[0];
      if(item.item.bio.slot != slot.name) return;
      this.list.remove(item.x, item.y);

      let slots = this.slots.filter(s => s.name == slot.name);
      let slotsTaken = 0;
      slots.forEach(s => {
        if(!s.item) return;
        slotsTaken += s.item.bio.slots;
      });
      // if the one to move takes up 2 slots, remove all equipped in slot
      // else remove only the current one
      if(item.item.bio.slots == 2) {
        slots.forEach(s => {
          this.add(s.item);
          s.item = null;
        })
      } else {
        this.add(slot.item);
      }
      // if the item in current slot takes up 2, remove it
      if(slotsTaken == 2) {
        slots.forEach(s => {
          this.add(s.item);
          s.item = null;
        })
      }
      slot.item = item.item;
      sp.play('inventory_place');
      this.selections.purge();
      this.trigger('equipment changed', this.equipped);
      this.render();
    });
    t.addEventListener('contextmenu', e => {
      e.preventDefault();
      if(!slot.item) return;
      this.add(slot.item);
      slot.item = null;
      this.selections.purge();
      sp.play('inventory_pick');
      this.trigger('equipment changed', this.equipped);
      this.render();
    })
    return t;
  }

  render() {
    GridBox.prototype.render.call(this);
    let t = html`<div class='inventory-dolly'></div>`;
    let d = html`<div class='inventory-item-info'></div>`;
    this.selectedItems.forEach(item => {
      let a = html`<div>${item.item.description}</div>`;
      d.appendChild(a);
    });
    this.slots.forEach(s => t.appendChild(this.renderSlot(s)));
    this.append(t);
    this.append(d);
    let pv = new PrimeVessel(this.list._filled());
    pv.on('crafted ability', (tpl, items) => this.trigger('crafted ability', tpl, items));
    this.append(pv.render());
    return this.tags.outer;
  }

}

module.exports = Inventory;
