class Events {
  constructor() {
    this.events = {};
  }

  on(event, fn) {
    if(!this.events[event]) this.events[event] = [];
    this.events[event].push(fn);
  }

  trigger(event) {
    if(!Array.isArray(this.events[event])) return;
    this.events[event].forEach(fn => fn.apply(null, Array.from(arguments).splice(1)));
  }
}

class Component extends Events {
  constructor(shadow, klass = '') {
    super();
    this.tags = {
      outer: html`<div class='component ${klass}'></div>`,
      inner: null
    };
    if(shadow) {
      this.tags.outer.attachShadow({mode: 'open'});
    }
  }

  get inner() {
    return this.tags.inner;
  }

  unmount() {
    this.tags.outer.parentNode.removeChild(this.tags.outer);
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

  clear() {
    let s = this.shadow;
    while (s.firstChild) {
      s.removeChild(s.firstChild);
    }
  }

  clearInner() {
    let s = this.inner;
    while (s.firstChild) {
      s.removeChild(s.firstChild);
    }
  }

  append(tag) {
    if(this.tags.inner) {
      this.tags.inner.appendChild(tag)
    } else {
      this.shadow.appendChild(tag);
    }
  }

  get shadow() {
    return this.tags.outer.shadowRoot || this.tags.outer;
  }
}

module.exports = Component;
