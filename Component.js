class Component {
  constructor() {
    this.tags = {
      outer: html`<div class='component'></div>`,
      inner: null
    };
    this.tags.outer.attachShadow({mode: 'open'});
  }

  get inner() {
    return this.tags.inner;
  }

  addInner(o = {}) {
    let tag = html`<div class='inner'></div>`;
    if(o.id) tag.id = o.id;
    this.tags.inner = tag;
    this.shadow.appendChild(tag);
  }

  addStyle(style) {
    if(!this.shadow.firstElementChild) {
      return this.shadow.appendChild(style);
    }
    this.shadow.insertBefore(style, this.shadow.firstElementChild);
  }

  get shadow() {
    return this.tags.outer.shadowRoot;
  }
}

module.exports = Component;
