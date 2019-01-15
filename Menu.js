class Menu {
  constructor(items, nested) {
    this.items = items;
    this.nested = nested;
    this.tags = {
      outer: null,
      menu: null
    };
    this.init(this.items);
  }

  hide(item) {
    item.visible = false;
    item.hidden = true;
  }

  show(item) {
    item.visible = true;
    item.hidden = false;
  }

  click(e, item) {
    item.open = !item.open;
    if(typeof item.fn == 'function') item.fn(e, item);
    this.render();
  }

  init(items = [], visible = true, open = false) {
    items.forEach(item => {
      item.visible = item.hidden ? false : visible;
      item.open = item.open ? true : open;
      if(Array.isArray(item.items)) {
        this.init(item.items, false, false);
      }
    })
  }

  renderItem(item) {
    let i;
    if(item.link) {
      i = html`<a href='${item.link}' target='_blank'><div class='menu-item'>${item.text}</div></a>`;
    } else {
      i = html`<span><div class='menu-item'>${item.text}</div></span>`;
    }
    i.querySelector('.menu-item')
    .addEventListener('click', e => this.click(e, item));
    return i;
  }

  renderItems(items) {
    let c = html`<div></div>`;
    items.forEach(item => {
      if(!item.visible) return;
      let m = this.renderItem(item);
      c.appendChild(m);
      if(item.open && Array.isArray(item.items)) {
        let menu = new Menu(item.items, true);
        c.appendChild(menu.render());
      }
    });
    return c;
  }

  update() {
    if(this.tags.outer) {
      let n = this.render();
    }
  }

  render() {
    if(this.tags.outer) {
      let shadow = this.tags.outer.shadowRoot;
      let menu = html`<div class='menu${this.nested ? '-nested' : ''}'></div>`;
      let items = this.renderItems(this.items);
      menu.appendChild(items);
      shadow.replaceChild(menu, this.tags.menu);
      this.tags.menu = menu;
    } else {
      let outer = html`<div></div>`;
      let style = html`<style>
      a {
        text-decoration: none;
        color: inherit;
        pointer: inherit;
      }
      .menu {
        width: 300px;
        position: absolute;
        left: 10px;
        bottom: 10px;
        background: url(sheet_of_old_paper_horizontal.png);
        z-index: 1002;
        user-select: none;
        color: black;
      }
      .menu-item {
        padding: 10px;
        border: none;
        font-size: 20px;
        font-weight: bold;
        margin: 4px;
        box-shadow: 0px 2px 4px -1px rgba(0,0,0,0.5);
        border-radius: 4px;
        background-color: rgba(0,0,0,0);
        cursor: inherit;
      }
      .menu-item:hover {
        background-color: rgba(0,0,0,0.1);
      }
      .menu-nested {
        padding-left: 15px;
        opacity: 0.8;
      }
      </style>`;
      let shadow = outer.attachShadow({mode: 'open'});
      let menu = html`<div class='menu${this.nested ? '-nested' : ''}'></div>`;
      let items = this.renderItems(this.items);
      menu.appendChild(items);
      shadow.appendChild(style);
      shadow.appendChild(menu);
      this.tags.outer = outer;
      this.tags.menu = menu;
      return outer;
    }
  }
}

module.exports = Menu;
