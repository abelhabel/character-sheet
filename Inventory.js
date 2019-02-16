const Component = require('Component.js');
const PL = require('PositionList2d.js');
class Inventory extends Component {
  constructor() {
    super();
    this.list = new PL(8, 2);
    this.tw = 32;
    this.th = 32;
  }

  add(item) {
    let e = this.list.firstEmpty();
    if(!e) return;
    this.list.set(e.x, e.y, item);
  }

  remove(item) {
    this.list.remove(item.x, item.y);
    this.render();
  }

  use() {
    if(!this.selected) return;
    this.trigger('use inventory item', this.selected);
    this.selected = null;
  }

  drop() {
    if(!this.selected) return;
    this.trigger('drop inventory item', this.selected);
    this.selected = null;
  }

  move(x, y) {
    this.list.remove(this.selected.x, this.selected.y);
    this.list.set(x, y, this.selected.item);
    this.selected = null;
    this.render();
  }

  render() {
    this.clear();
    this.tags.outer.id = 'inventory';
    Object.assign(this.tags.outer.style, {
      width: this.list.w * this.tw + 'px',
      height: this.list.h * this.th + 'px'
    });
    this.list.each(item => {
      let selected = this.selected && item.x == this.selected.x && item.y == this.selected.y ? ' selected' : '';
      let t = html`<div class='item${selected}' style='width:${this.tw}px;height:${this.th}px;'></div>`;
      if(item.item) {
        t.appendChild(item.item.canvas.clone(this.tw, this.th));
        t.addEventListener('mouseenter', e => {
          this.tags.name.textContent = item.item.bio.name;
        });
        t.addEventListener('mouseleave', e => {
          this.tags.name.textContent = '';
        });
      }
      t.addEventListener('click', e => {
        let empty = !this.list.get(item.x, item.y);
        if(empty && this.selected) {
          this.move(item.x, item.y);
          return;
        }
        this.selected = this.selected && item.x == this.selected.x && item.y == this.selected.y ? null : item;
        this.render();
      });
      this.append(t);
    })

    this.tags.name = html`<div class='name'></div>`;
    this.append(this.tags.name);
    this.tags.actions = html`<div class='actions'></div>`;
    this.tags.use = html`<div class='action'>Use</div>`;
    this.tags.use.addEventListener('click', this.use.bind(this));
    this.tags.actions.appendChild(this.tags.use);
    this.tags.drop = html`<div class='action'>Drop</div>`;
    this.tags.drop.addEventListener('click', this.drop.bind(this));
    this.tags.actions.appendChild(this.tags.drop);
    let close = html`<div class='close'>X</div>`;
    close.addEventListener('click', e => this.unmount());
    this.append(close);
    this.append(this.tags.actions);
    return this.tags.outer;
  }
}

module.exports = Inventory;
