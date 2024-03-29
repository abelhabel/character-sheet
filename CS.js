const Slider = require('Slider.js');
const Sprite = require('Sprite.js');
const guid = require('guid.js');
var noop = function() {};
window.__tags = {};
class Increment {
  constructor(val) {
    this.val = val || 0;
    this.id = guid();
    this.tag = null;
  }

  render(container) {
    let outer = html`<div></div>`;
    let shadow = outer.attachShadow({mode: 'open'});
    let style = html`<style>
    * {
      box-sizing: border-box;
    }
    .increment {
      position: relative;
      width: 100px;
      height: 100px;
      border-radius: 50%;
      overflow: hidden;
      background: none;
    }
    .half {
      display: inline-block;
      width: 50%;
      height: 100%;
      vertical-align: top;
      float: left;
    }
    .half:hover {
      background-color: rgba(0,0,0,0.5);
    }
    .value {
      position: absolute;
      width: 50px;
      height: 50px;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      border: 2px solid white;
      border-radius: 50%;
      color: white;
      background: url(${fg.png});
      text-align: center;
      line-height: 46px;
      font-size: 1.5em;
    }
    </style>`;
    window.__tags[this.id] = (inc) => {
      this.increment(inc);
    }
    this.inner = html`<div class='increment'>
      <div class='half' onclick="__tags['${this.id}'](-1)"></div>
      <div class='half' onclick="__tags['${this.id}'](1)"></div>
      <div class='value'>${this.val}</div>
    </div>`;
    if(this.tag) {
      container.replaceChild(outer, this.tag);
    } else {
      container.appendChild(outer);
    }
    shadow.appendChild(style);
    shadow.appendChild(this.inner);
    this.tag = outer;
    return outer;
  }

  increment(n) {
    this.val += Number(n);
    this.inner.querySelector('.value').textContent = this.val;
  }
}

class CS {
  constructor(tpl, parent, pools, onUpdateState, hidePersistence) {
    this.name = tpl.name;
    this.categories = tpl.categories;
    this.tests = tpl.tests || [];
    this.hidePersistence = hidePersistence;

    this.library = tpl.library;
    this.folder = tpl.folder;
    this.queryCommand = tpl.queryCommand;

    this.parent = parent;
    this.state = {};
    this.categories.forEach(c => {
      this.state[c.exportAs || c.name] = {};
    })
    this.pools = pools || {};
    this.drains = {};
    this.initialPools = {};

    this.onUpdateState = onUpdateState || noop;

    this.inputTags = [];
    this.selectTags = [];
    this.multiselectTags = [];
    this.incrementTags = [];
    this.spritesheetTags = [];
    this.binaryTags = [];
    this.textTags = [];
    this.sliderTags = [];
    this['spritesheet-paletteTags'] = [];
    Object.keys(this.pools).forEach(k => {
      this.drains[k] = 0;
      this.initialPools[k] = this.pools[k];
    });
  }

  renderTests() {
    let o = document.createElement('div');

    this.tests.forEach(test => {
      let b = document.createElement('button');
      b.textContent = test.name;
      b.addEventListener('click', e => {
        test.run(this.state);
      })
      o.appendChild(b);
    })
    return o;
  }

  renderName() {
    var name = document.createElement('h1');
    name.textContent = this.name;
    return name;
  }

  setState(c, i, v, internal) {
    this.state[c.exportAs || c.name][i.exportAs || i.name] = v;
    !internal && this.onUpdateState(c, i, v);
  }

  renderSlider(item, c) {
    var o = document.createElement('div');
    o.style.userSelect = 'none';
    var name = document.createElement('div');
    var val = document.createElement('div');
    var proxy = new Proxy({}, {
      set: (o, k, v) => {
        this.setState(c, item, v);
        return val;
      }
    })
    let slider = new Slider(item.name, item.initial, proxy, item.exportAs);
    val.appendChild(slider.render());

    o.appendChild(name);
    o.appendChild(val);
    this.sliderTags.push({
      name: item.name,
      cname: c.name,
      update: (v) => {
        slider.import(v);
      }
    });
    return o;
  }

  renderIncrement(item, c) {
    var o = document.createElement('div');
    o.style.userSelect = 'none';
    var name = document.createElement('div');
    var val = document.createElement('div');
    name.style.display = val.style.display = 'inline-block';
    name.style.height = val.style.height = '40px';
    name.style.lineHeight = val.style.lineHeight = '40px';
    name.style.width = '200px';
    val.style.width = '40px';
    val.style.cursor = 'pointer';
    val.style.textAlign = 'center';
    val.style.backgroundColor = 'gray';
    name.textContent = item.name;
    var currentVal = item.initial || 0;
    val.textContent = currentVal;
    this.setState(c, item, currentVal, true);
    val.addEventListener('click', (e) => {
      let cost = item.cost || 1;
      let inc = item.step || 1;
      if(e.shiftKey) inc *= 10;
      let nextVal = 0;
      if(e.offsetX < 20) {
        inc *= -1;
      }
      if(this.drains[c.pool] + (inc * cost) > this.initialPools[c.pool]) {
        console.log('No more points')
        return;
      }
      if(item.range) {
        nextVal = Math.min(Math.max(currentVal + inc, item.range[0]), item.range[1]);
      }
      if(nextVal == currentVal) return;
      currentVal = nextVal;
      this.setState(c, item, currentVal);
      this.drains[c.pool] += (inc * cost);
      val.textContent = currentVal;
    })

    val.addEventListener('mousemove', (e) => {
      if(e.offsetX < 20) {
        val.style.backgroundColor = 'red';
      } else {
        val.style.backgroundColor = 'green';
      }
    })

    val.addEventListener('mouseout', (e) => {
      val.style.backgroundColor = 'gray';
    })

    o.appendChild(name);
    o.appendChild(val);
    this.incrementTags.push({
      name: item.name,
      cname: c.name,
      update: (v) => {
        currentVal = v;
        val.textContent = v;
      }
    });
    return o;
  }

  renderText(item, c) {
    var o = document.createElement('div');
    o.style.userSelect = 'none';
    var name = document.createElement('div');
    var val = document.createElement('textarea');
    name.style.display = val.style.display = 'inline-block';
    name.style.height = val.style.height = '40px';
    name.style.lineHeight = val.style.lineHeight = '40px';
    name.style.width = val.style.width = '200px';
    val.style.textAlign = 'center';
    name.textContent = item.name;
    var currentVal = item.initial || '';
    val.value = currentVal;
    this.setState(c, item, currentVal, true);
    val.addEventListener('keyup', (e) => {
      if(item.maxCharacters && val.value.length > item.maxCharacters) {
        val.value = currentVal;
      } else {
        currentVal = val.value;
      }
      this.setState(c, item, currentVal);
    })

    o.appendChild(name);
    o.appendChild(val);
    this.textTags.push({
      name: item.name,
      cname: c.name,
      update: (v) => {
        currentVal = v;
        val.value = v;
      }
    });
    return o;
  }

  renderBinary(item, c) {
    var o = document.createElement('div');
    o.style.userSelect = 'none';
    var name = document.createElement('div');
    var val = document.createElement('input');
    name.style.display = val.style.display = 'inline-block';
    name.style.height = val.style.height = '40px';
    name.style.lineHeight = val.style.lineHeight = '40px';
    name.style.width = val.style.width = '200px';
    name.textContent = item.name;
    val.type = 'checkbox';
    var currentVal = item.initial || false;
    this.setState(c, item, currentVal, true);
    val.addEventListener('change', (e) => {
      currentVal = val.checked;
      this.setState(c, item, currentVal);
    })
    val.checked = currentVal;
    o.appendChild(name);
    o.appendChild(val);
    this.binaryTags.push({
      name: item.name,
      cname: c.name,
      update: (v) => {
        currentVal = v;
        val.checked = v;
      }
    });
    return o;
  }

  renderInput(item, c) {
    var o = document.createElement('div');
    o.style.userSelect = 'none';
    var name = document.createElement('div');
    var val = document.createElement('input');
    name.style.display = val.style.display = 'inline-block';
    name.style.height = val.style.height = '40px';
    name.style.lineHeight = val.style.lineHeight = '40px';
    name.style.width = val.style.width = '200px';
    val.style.textAlign = 'center';
    name.textContent = item.name;
    var currentVal = item.initial || '';
    val.value = currentVal;
    this.setState(c, item, currentVal, true);
    val.addEventListener('keyup', (e) => {
      if(item.maxCharacters && val.value.length > item.maxCharacters) {
        val.value = currentVal;
      } else {
        currentVal = val.value;
      }
      this.setState(c, item, currentVal);
    })

    o.appendChild(name);
    o.appendChild(val);
    this.inputTags.push({
      name: item.name,
      cname: c.name,
      update: (v) => {
        currentVal = v;
        val.value = v;
      }
    });
    return o;
  }

  renderMultipleSelect(item, c) {
    var o = document.createElement('div');
    o.style.userSelect = 'none';
    var name = document.createElement('div');
    var val = document.createElement('div');
    let collapse = document.createElement('div');
    name.style.display = val.style.display = 'inline-block';
    name.style.verticalAlign = val.style.verticalAlign = 'top';
    name.style.lineHeight = '40px';
    name.style.width = '200px';
    val.style.textAlign = 'left';
    val.style.maxWidth = '400px';
    val.style.backgroundColor = 'darkgray';
    val.style.padding = '10px';
    name.textContent = item.name;
    let collapsed = true;
    collapse.textContent = 'Expand';
    val.appendChild(collapse);

    var currentVal = [];
    this.setState(c, item, currentVal, true);
    var tags = [];
    collapse.addEventListener('click', e => {
      if(!collapsed) {
        collapse.textContent = 'Expand';
        tags.forEach(d => {
          if(d.classList.contains('selected')) {
            d.style.display = 'inline-block';
          } else {
            d.style.display = 'none';
          }
        })
      } else {
        collapse.textContent = 'Collapse';
        tags.forEach(d => {
          d.style.display = 'inline-block';
        })
      }
      collapsed = !collapsed;
    })
    item.values.forEach(o => {
      let v = item.get ? item.get(o) : o;
      var d = document.createElement('div');
      d.className = 'ability-tag';
      Object.assign(d.style, {
        display: 'inline-block',
        backgroundColor: 'gray',
        color: 'white',
        padding: '2px 4px',
        borderRadius: '2px',
        lineHeight: '1em',
        marginRight: '4px',
        marginBottom: '4px',
        cursor: 'pointer',
        fontWeight: 'bold',
        fontFamily: 'monospace'
      });
      d.textContent = v;
      var selected = v == item.initial;
      if(selected) {
        d.style.backgroundColor = 'black';
      } else {
        if(collapsed) {
          d.style.display = 'none';
        }
      }
      d.addEventListener('click', () => {
        let vi = item.set ? item.set(v) : v;
        let index = currentVal.indexOf(vi);
        if(!~index) {
          d.classList.add('selected');
          d.style.backgroundColor = 'black';
          currentVal.push(vi);
        } else {
          d.classList.remove('selected');
          d.style.backgroundColor = 'gray';
          if(collapsed) {
            d.style.display = 'none';
          }
          currentVal.splice(index, 1);
        }
        this.setState(c, item, currentVal);

      })
      tags.push(d);
      val.appendChild(d);
    })
    o.appendChild(name);
    o.appendChild(val);
    this.multiselectTags.push({
      name: item.name,
      cname: c.name,
      update: (v) => {
        console.log(v)
        v = item.get ? v.map(a => item.get(a)) : v;
        v.filter(n => ~v.indexOf(n))
        currentVal = Array.from(new Set(v));
        tags.forEach(t => {
          if(~currentVal.indexOf(t.textContent)) {
            t.classList.add('selected');
            t.style.backgroundColor = 'black';
            t.style.display = 'inline-block';
          } else {
            t.classList.remove('selected');
            t.style.backgroundColor = 'gray';
            if(collapsed) {
              t.style.display = 'none';
            } else {
              t.style.display = 'inline-block';
            }
          }
        })
      }
    });
    return o;
  }

  renderSelect(item, c) {
    if(item.multiple) return this.renderMultipleSelect(item, c);
    var o = document.createElement('div');
    o.style.userSelect = 'none';
    var name = document.createElement('div');
    var val = document.createElement('select');
    if(item.multiple) val.size = item.values.length;
    val.multiple = item.multiple;
    name.style.display = val.style.display = 'inline-block';
    name.style.height = val.style.height = item.multiple ? 'auto' : '40px';
    name.style.verticalAlign = val.style.verticalAlign = 'top';
    name.style.lineHeight = val.style.lineHeight = '40px';
    name.style.width = val.style.width = '200px';
    val.style.textAlign = 'center';
    name.textContent = item.name;
    var currentVal = item.initial || '';
    var options = [];
    item.values.forEach(d => {
      let v = item.get ? item.get(d) : d;
      var o = document.createElement('option');
      o.textContent = o.value = v;
      options.push(o);
      val.appendChild(o);
    })
    val.value = currentVal;
    this.setState(c, item, currentVal, true);
    val.addEventListener('change', (e) => {
      currentVal = item.set ? item.set(val.value) : val.value;
      this.setState(c, item, currentVal);
      if(item.onSelect) item.onSelect(currentVal);
    })

    o.appendChild(name);
    o.appendChild(val);
    this.selectTags.push({
      name: item.name,
      cname: c.name,
      update: (v) => {
        currentVal = item.get ? item.get(v) : v;
        val.value = currentVal;
      }
    });
    return o;
  }

  openSpriteSheet(item, fn, onload) {
    var image = new Image();
    image.style.position = 'absolute';
    image.style.left = '0px';
    image.style.top = '0px';
    image.style.backgroundColor = 'gray';
    let scale = 1;
    var selected = [];
    if(typeof fn == 'function') {
      image.addEventListener('contextmenu', e => {
        e.preventDefault();
        scale = scale == 1 ? 2 : 1;
        image.style.width = `${image.naturalWidth * scale}px`;
      })
      image.addEventListener('click', (e) => {
        selected.push([
          item.w * Math.floor(e.offsetX / item.w),
          item.h * Math.floor(e.offsetY / item.h),
          image
        ])
        if(!e.shiftKey) {
          fn(selected);
          document.body.removeChild(image);
        }
      })
      document.body.appendChild(image);
    }
    if(typeof onload == 'function') {
      image.onload = () => onload(image);
    }

    image.src = item.src;
  }

  renderSpriteSelect(item, c) {
    var o = document.createElement('div');
    o.style.userSelect = 'none';
    var name = document.createElement('div');
    var val = document.createElement('div');
    var canvas = document.createElement('canvas');
    val.appendChild(canvas);
    name.style.display = val.style.display = 'inline-block';
    name.style.height = val.style.height = '40px';
    name.style.lineHeight = val.style.lineHeight = '40px';
    name.style.width = '200px';
    val.style.width = '40px';
    val.style.cursor = 'pointer';
    val.style.textAlign = 'center';
    val.style.backgroundColor = 'gray';
    name.textContent = item.name;
    canvas.width = item.w;
    canvas.height = item.h;
    canvas.style.marginTop = '4px';
    val.style.border = '1px solid black';

    val.addEventListener('click', (e) => {
      this.openSpriteSheet(item, (selected) => {
        var [x, y, img] = selected[0];
        var ct = canvas.getContext('2d');
        ct.clearRect(0, 0, item.w, item.h);
        ct.drawImage(img, x, y, item.w, item.h, 0, 0, item.w, item.h);
        var sprite = {x: x, y: y, spritesheet: item.src, w: item.w, h: item.h};
        this.setState(c, item, sprite)
      })
    })
    o.appendChild(name);
    o.appendChild(val);
    this.spritesheetTags.push({
      name: item.name,
      cname: c.name,
      update: (v) => {
        if(!v) return;
        let sprite = new Sprite(v);
        let img = sprite.canvas;
        var ct = canvas.getContext('2d');
        ct.clearRect(0, 0, item.w, item.h);
        ct.drawImage(img, 0, 0, item.w, item.h);
          // this.setState(c, item, {x: x, y: y, spritesheet: item.src, w: item.w, h: item.h})
      }
    });
    return o;
  }

  renderSpritePaletteSelect(item, c) {
    var o = document.createElement('div');
    o.style.userSelect = 'none';
    var name = document.createElement('div');
    var val = document.createElement('div');
    var canvas = document.createElement('canvas');
    val.appendChild(canvas);
    name.style.display = val.style.display = 'inline-block';
    name.style.height = val.style.height = '40px';
    name.style.lineHeight = val.style.lineHeight = '40px';
    name.style.width = '200px';
    val.style.width = '40px';
    val.style.cursor = 'pointer';
    val.style.textAlign = 'center';
    val.style.backgroundColor = 'gray';
    name.textContent = item.name;
    canvas.width = item.w;
    canvas.height = item.h;
    canvas.style.marginTop = '4px';
    val.style.border = '1px solid black';

    var drawSprites = (selected) => {
      let w = selected.length * item.w;
      let h = item.h;
      val.style.width = w + 'px';
      canvas.width = w;
      canvas.height = h;
      var ct = canvas.getContext('2d');
      ct.clearRect(0, 0, w, h);
      var sprites = [];
      selected.forEach((s, i) => {
        var [x, y, img] = s;
        ct.drawImage(img, x, y, item.w, item.h, i * item.w, 0, item.w, item.h);
        var sprite = {x: x, y: y, spritesheet: item.src, w: item.w, h: item.h};
        sprites.push(sprite);
      })
      this.setState(c, item, sprites)
    }

    val.addEventListener('click', (e) => {
      this.openSpriteSheet(item, drawSprites)
    })
    o.appendChild(name);
    o.appendChild(val);
    this['spritesheet-paletteTags'].push({
      name: item.name,
      cname: c.name,
      update: (v) => {
        if(!v) return;
        this.openSpriteSheet(item, false, (img) => {
          let selected = v.map(s => [s.x, s.y, img]);
          drawSprites(selected);
        }, true)
      }
    });
    return o;
  }

  renderCategories() {
    var d = document.createElement('div');
    this.categories.forEach(c => {
      var n = document.createElement('h2');
      n.textContent = c.name;
      if(c.pool) {
        n.textContent += ` ${this.drains[c.pool] / this.initialPools[c.pool]}`
      }
      d.appendChild(n);
      var o = document.createElement('div');
      d.appendChild(o);
      c.items.forEach(item => {
        switch(item.type) {
          case 'increment':
            return o.appendChild(this.renderIncrement(item, c));
          case 'input':
            return o.appendChild(this.renderInput(item, c));
          case 'text':
            return o.appendChild(this.renderText(item, c));
          case 'select':
            return o.appendChild(this.renderSelect(item, c));
          case 'slider':
            return o.appendChild(this.renderSlider(item, c));
          case 'multiselect':
            return o.appendChild(this.renderMultipleSelect(item, c));
          case 'spritesheet':
            return o.appendChild(this.renderSpriteSelect(item, c));
          case 'spritesheet-palette':
            return o.appendChild(this.renderSpritePaletteSelect(item, c));
          case 'binary':
            return o.appendChild(this.renderBinary(item, c));
          default: ''
        }

      })
    })
    return d;
  }

  static get buttonCss() {
    return {
      cursor: 'pointer',
      width: '100px',
      height: '20px',
      lineHeight: '20px',
      padding: '5px 10px',
      textAlign: 'center',
      backgroundColor: 'black',
      color: 'white',
      userSelect: 'none'
    }
  }

  static applyStyle(t, s) {
    Object.keys(s).forEach(b => t.style[b] = s[b]);
  }

  save() {
    var id = this.importingId ? `?id=${this.importingId}` : '';
    var qc = this.queryCommand || 'saveMonster';
    var body = JSON.stringify(this.state);
    fetch(qc + id, {
      method: 'POST',
      body: body
    })
    .then(res => res.text())
    .then(id => {
      var monsters = require(this.library);
      var monster = JSON.parse(body);
      monster.id = id;
      monsters.push(monster);
      this.importingId = id;
      this.importingLabel.textContent = `Now editing ${monster.bio.name}. Click here to stop editing. (id = ${monster.id})`;
      console.log('saved');
    })
    .catch(e => {
      console.log('error', e)
    })
  }

  renderExportButton() {
    var d = document.createElement('div');
    CS.applyStyle(d, CS.buttonCss);
    d.textContent = 'Export';

    d.addEventListener('click', (e) => {
      this.save();
    })

    return d;
  }

  renderImportButton() {
    var monsters = require(this.library) || [];

    monsters.sort((a, b) => a.bio.name > b.bio.name ? 1 : -1);
    var n = document.createElement('div');
    CS.applyStyle(n, CS.buttonCss);
    n.style.display = 'inline-block';
    n.textContent = 'Next';
    var d = document.createElement('div');
    CS.applyStyle(d, CS.buttonCss);
    d.style.display = 'inline-block';
    d.textContent = 'Import';
    var select = document.createElement('select');
    let o = document.createElement('option');
    o.textContent = '---';
    o.value = 'none';
    select.appendChild(o);
    var currentIndex = 0;
    monsters.forEach((m, i) => {
      let o = document.createElement('option');
      o.textContent = m.bio.name;
      o.value = m.id;
      o.listIndex = i;
      select.appendChild(o);
    });
    var label = document.createElement('span');
    label.style.cursor = 'pointer';
    this.importingLabel = label;
    label.addEventListener('click', () => {
      this.importingId = 0;
      label.textContent = '';
    })
    d.addEventListener('click', (e) => {
      currentIndex = monsters.findIndex(m => m.id == select.value);;
      let monster = monsters[currentIndex];
      label.textContent = `Now editing ${monster.bio.name}. Click here to stop editing. (id = ${monster.id})`;
      this.import(monster);
    })
    n.addEventListener('click', e => {
      currentIndex += 1;
      let monster = monsters[currentIndex];
      select.value = monster.id;
      label.textContent = `Now editing ${monster.bio.name}. Click here to stop editing. (id = ${monster.id})`;
      this.import(monster);
    })
    var c = document.createElement('div');
    c.style.padding = '10px';
    c.style.border = '3px dashed';
    c.style.marginTop = '3px';

    c.appendChild(select);
    c.appendChild(n);
    c.appendChild(d);
    c.appendChild(label);
    return c;
  }

  import(monster) {
    this.categories.forEach(c => {
      let cKey = c.exportAs || c.name;
      c.items.forEach(item => {
        let iKey = item.exportAs || item.name;
        // pick monster value first if it does not have key
        // use default value from template
        let value = monster[cKey] && monster[cKey].hasOwnProperty(iKey) ? monster[cKey][iKey] : item.initial;
        let listName = item.type + 'Tags';
        let tag = this[item.type + 'Tags'].find(t => t.name == item.name && c.name == t.cname);
        if(tag && typeof tag.update == 'function') tag.update(value);
        this.setState(c, item, value, true);
      })
    })
    this.importingId = monster.id;
  }

  get default() {
    this.categories.forEach(c => {
      c.items.forEach(item => {
        this.setState(c, item, item.initial, true);
      })
    });
    return this.state;
  }

  render() {

    this.parent.appendChild(this.renderName());
    this.parent.appendChild(this.renderCategories());
    this.parent.appendChild(this.renderTests());
    if(!this.hidePersistence) {
      this.parent.appendChild(this.renderExportButton());
      this.parent.appendChild(this.renderImportButton());
    }
  }
}

module.exports = CS;
