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
    if(Array.isArray(event)) return event.forEach(e => this.on(e, fn));
    if(!this.events[event]) this.events[event] = [];
    this.events[event].push(fn);
  }

  off(event, fn) {
    if(!this.events[event]) return;
    let index = this.events[event].indexOf(fn);
    if(~index) {
      this.events[event].splice(index, 1);
    } else {
      this.events[event] = [];
    }
  }

  trigger(event) {
    if(!Array.isArray(this.events[event])) return;
    this.events[event].forEach(fn => fn.apply(null, Array.from(arguments).splice(1)));
    return this.events[event].length;
  }
}

class Component extends Events {
  constructor(shadow = false, klass = '', tagName = 'div') {
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

  listen(selector, event, fn, capture = false) {
    if(Array.isArray(event)) {
      event.forEach(e => this.listen(selector, e, fn, capture));
    } else
    if(selector instanceof HTMLElement) {
      selector.addEventListener(event, fn, capture);
    } else
    if(!selector) {
      this.tags.outer.addEventListener(event, fn, capture);
    } else {
      this.shadow.querySelector(selector).addEventListener(event, fn, capture);
    }
  }

  listenAll(selector, event, fn, capture = false) {
    if(Array.isArray(selector)) {
      selector.forEach(s => this.listen(s, event, fn, capture));
    } else {
      Array.from(this.shadow.querySelectorAll(selector))
      .forEach(node => {
        node.addEventListener(event, fn, capture);
      })
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

  prepend(tag) {
    if(!tag) return;
    if(Array.isArray(tag)) {
      return tag.forEach(t => this.prepend(t));
    }
    if(tag instanceof Component) {
      tag = tag.render();
    }
    if(this.tags.inner) {
      this.tags.inner.prepend(tag)
    } else {
      this.shadow.prepend(tag);
    }
  }

  appendIn(selector, tag) {
    if(Array.isArray(tag)) {
      return tag.forEach(t => this.appendIn(selector, t));
    }
    if(tag instanceof Component) {
      tag = tag.render();
    }
    if(selector instanceof HTMLElement) {
      selector.appendChild(tag);
    } else {
      let child = this.q(selector);
      if(!child) {
        console.warn('Child not found.');
        return;
      }
      child.appendChild(tag);
    }
  }

  prependIn(selector, tag) {
    if(Array.isArray(tag)) {
      return tag.forEach(t => this.prependIn(selector, t));
    }
    if(tag instanceof Component) {
      tag = tag.render();
    }
    let child = this.q(selector);
    if(!child) return;
    child.prepend(tag);
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
Fragment.prototype.prepend = Component.prototype.prepend;
Fragment.prototype.appendIn = Component.prototype.appendIn;
Fragment.prototype.prependIn = Component.prototype.prependIn;
Fragment.prototype.q = Component.prototype.q;
Fragment.prototype.listen = Component.prototype.listen;
Fragment.prototype.listenAll = Component.prototype.listenAll;
Fragment.prototype.addStyle = Component.prototype.addStyle;
Component.Fragment = Fragment;
Component.Events = Events;
module.exports = Component;
