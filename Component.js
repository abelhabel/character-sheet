function html(strings, ...values) {
  let out = '';
  strings.forEach((s, i) => {
    out += s + (values[i] == undefined ? '' : values[i]);
  })
  let d = document.createElement('template');
  d.innerHTML = out;
  return d.content.firstElementChild;
}
class Events {
  constructor() {
    this.events = {};
  }

  on(event, fn) {
    if(!this.events[event]) this.events[event] = [];
    this.events[event].push(fn);
  }

  off(event, fn) {
    if(!this.events[event]) return;
    let index = this.events[event].indexOf(fn);
    if(!~index) return;
    this.events[event].splice(index, 1);
  }

  trigger(event) {
    if(!Array.isArray(this.events[event])) return;
    this.events[event].forEach(fn => fn.apply(null, Array.from(arguments).splice(1)));
  }
}

class Component extends Events {
  constructor(shadow, klass = '', tagName = 'div') {
    super();
    this.tags = {
      outer: html`<${tagName} class='component ${klass}'></${tagName}>`,
      inner: null
    };
    this.cc = {};
    if(shadow) {
      this.tags.outer.attachShadow({mode: 'open'});
    }
  }

  get inner() {
    return this.tags.inner;
  }

  addClass(c) {
    this.tags.outer.classList.add(c);
  }

  removeClass(c) {
    this.tags.outer.classList.remove(c);
  }

  listen(selector, event, fn) {
    if(!selector) {
      this.tags.outer.addEventListener(event, fn);
    } else {
      this.shadow.querySelector(selector).addEventListener(event, fn);
    }
  }

  removeListener(selector, event, fn) {
    if(!selector) {
      this.tags.outer.removeEventListener(event, fn);
    } else {
      let t = this.shadow.querySelector(selector);
      t && this.shadow.querySelector(selector).removeEventListener(event, fn);
    }
  }

  q(selector) {
    return this.shadow.querySelector(selector);
  }

  html(strings, ...values) {
    let out = '';
    strings.forEach((s, i) => {
      out += s + (values[i] == undefined ? '' : values[i]);
    })
    let d = document.createElement('template');
    d.innerHTML = out;
    return d.content.firstElementChild;
  }

  unmount() {
    if(this.tags.outer.parentNode) {
      try {
        if(this.tags.outer.parentNode.shadowRoot) {
          this.tags.outer.parentNode.shadowRoot.removeChild(this.tags.outer);
        } else {
          this.tags.outer.parentNode.removeChild(this.tags.outer);
        }
      } catch(e) {
        //ignore
      }
    }
  }

  get mounted() {
    let elem = this.tags.outer;
    do {
      if (elem == document.documentElement) {
         return true;
      }
    } while (elem = elem.parentNode)
    return false;
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

  clearIn(selector) {
    let s = this.q(selector);
    while (s && s.firstChild) {
      s.removeChild(s.firstChild);
    }
  }

  remove(tag) {
    try {
      if(tag instanceof Component) {
        this.shadow.removeChild(tag.tags.outer);
      } else {
        this.shadow.removeChild(tag);
      }
    } catch (e) {
      // ignore
    }
  }

  append(tag) {
    if(!tag) return;
    if(Array.isArray(tag)) {
      return tag.forEach(t => this.append(t));
    }
    if(tag instanceof Component) {
      tag = tag.render();
    }
    if(this.tags.inner) {
      this.tags.inner.appendChild(tag)
    } else {
      this.shadow.appendChild(tag);
    }
  }

  appendIn(selector, tag) {
    if(Array.isArray(tag)) {
      return tag.forEach(t => this.appendIn(selector, t));
    }
    if(tag instanceof Component) {
      tag = tag.render();
    }
    let child = this.q(selector);
    if(!child) return;
    child.appendChild(tag);
  }

  get shadow() {
    return this.tags.outer.shadowRoot || this.tags.outer;
  }

  render() {
    return this.tags.outer;
  }
}

class Fragment extends DocumentFragment {
  constructor() {
    super();
    Object.setPrototypeOf(this, Fragment.prototype);
    this.tags = {};
  }

  get shadow() {
    return this;
  }
}

Fragment.prototype.append = Component.prototype.append;
Fragment.prototype.appendIn = Component.prototype.appendIn;
Fragment.prototype.q = Component.prototype.q;
Fragment.prototype.listen = Component.prototype.listen;
Fragment.prototype.addStyle = Component.prototype.addStyle;
Component.Fragment = Fragment;
module.exports = Component;
