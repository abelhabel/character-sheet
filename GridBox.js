const Component = require('Component.js');
const PL = require('PositionList2d.js');
class GridBox extends Component {
  constructor(w, h) {
    super();
    this.w = w || 8;
    this.h = h || 2;
    this.list = new PL(this.w, this.h);
    this.selections = new PL(this.w, this.h);
    this.tw = 32;
    this.th = 32;
  }

  export() {
    return this.list._filled().map(item => {
      return {
        x: item.x,
        y: item.y,
        templateId: item.item.template.id,
        model: item.item.constructor.name
      }
    })
  }

  import(list, models) {
    if(!Array.isArray(list)) return;
    list.forEach(item => {
      let Model = models[item.model];
      if(!Model) return;
      let i = Model.create(item.templateId);
      this.list.set(item.x, item.y, i);
    })
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
    this.selectedItems.forEach(item => {
      this.trigger('use inventory item', item);
    })
  }

  drop() {
    this.selectedItems.forEach(item => {
      this.trigger('drop inventory item', item);
    })
  }

  get selectedItems() {
    let out = [];
    this.selections.each(item => {
      if(!item.item) return;
      let i = this.list.get(item.x, item.y);
      if(!i) return;
      out.push({item: i, x: item.x, y: item.y});
    })
    return out;
  }

  move(x, y) {
    let items = this.selections._filled();
    if(items.length != 1) return;
    let item = this.list.get(items[0].x, items[0].y);
    this.list.remove(items[0].x, items[0].y);
    this.list.set(x, y, item);
    this.selections.purge();
    this.render();
  }

  itemByTemplateId(id) {
    return this.list._filled().find(item => {
      return item.item.template.id == id;
    })
  }

  itemsByTemplateId(id) {
    return this.list._filled().filter(item => {
      return item.item.template.id == id;
    })
  }

  itemByName(name) {
    return this.list._filled().find(item => {
      return item.item.bio.name == name;
    })
  }

  render() {
    this.clear();
    this.tags.outer.classList.add('inventory');
    Object.assign(this.tags.outer.style, {
      width: this.list.w * this.tw + 'px',
      height: this.list.h * this.th + 'px'
    });
    this.list.each(item => {
      let selected = this.selections.get(item.x, item.y) ? ' selected' : '';
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
        if(empty) {
          if(this.selections.get(item.x, item.y)) {
            this.selections.remove(item.x, item.y);
          } else {
            this.move(item.x, item.y);
            this.selections.purge();
          }
          return;
        } else {

          if(this.selections.get(item.x, item.y)) {
            this.selections.remove(item.x, item.y);
          } else {
            if(!e.shiftKey) {
              this.selections.purge();
            }
            this.selections.set(item.x, item.y, true);
          }
        }
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

module.exports = GridBox;
