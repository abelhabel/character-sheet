const Slider = require('Slider.js');
const Sprite = require('Sprite.js');
var noop = function() {};
class CS {
  constructor(tpl, parent, pools, onUpdateState) {
    this.name = tpl.name;
    this.categories = tpl.categories;

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

  renderName() {
    var name = document.createElement('h1');
    name.textContent = this.name;
    return name;
  }

  setState(c, i, v) {
    this.state[c.exportAs || c.name][i.exportAs || i.name] = v;
    this.onUpdateState(c, i, v);
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
    this.setState(c, item, currentVal);
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
    this.setState(c, item, currentVal);
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
    this.setState(c, item, currentVal);
    val.addEventListener('change', (e) => {
      currentVal = val.checked;

      console.log('changed binary', currentVal)
      this.setState(c, item, currentVal);
    })

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
    this.setState(c, item, currentVal);
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
    name.style.display = val.style.display = 'inline-block';
    name.style.verticalAlign = val.style.verticalAlign = 'top';
    name.style.lineHeight = '40px';
    name.style.width = '200px';
    val.style.textAlign = 'left';
    val.style.maxWidth = '400px';
    val.style.backgroundColor = 'darkgray';
    val.style.padding = '10px';
    name.textContent = item.name;
    var currentVal = [];
    this.setState(c, item, currentVal);
    var tags = [];
    item.values.forEach(v => {
      var d = document.createElement('div');
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
      };
      d.addEventListener('click', () => {
        let index = currentVal.indexOf(v);
        if(!~index) {
          d.style.backgroundColor = 'black';
          currentVal.push(v);
        } else {
          d.style.backgroundColor = 'gray';
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
        v.filter(n => ~v.indexOf(n))
        currentVal = Array.from(new Set(v));
        console.log('updating multiselect', currentVal)
        tags.forEach(t => {
          if(~currentVal.indexOf(t.textContent)) {
            t.style.backgroundColor = 'black';
          } else {
            t.style.backgroundColor = 'gray';
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
    item.values.forEach(v => {
      var o = document.createElement('option');
      o.textContent = o.value = v;
      options.push(o);
      val.appendChild(o);
    })
    val.value = currentVal;
    this.setState(c, item, currentVal);
    val.addEventListener('change', (e) => {
      if(item.multiple) {
        currentVal = Array.from(val.selectedOptions).map(o => o.value);
      } else {
        currentVal = val.value;
      }
      this.setState(c, item, currentVal);
      console.log(currentVal)
    })

    o.appendChild(name);
    o.appendChild(val);
    this.selectTags.push({
      name: item.name,
      cname: c.name,
      update: (v) => {
        currentVal = v;
        val.value = v;
        if(item.multiple && Array.isArray(v)) {
          options.forEach(o => {
            if(~v.indexOf(o.value)) {
              o.selected = true;
            }
          })
        }
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
    var selected = [];
    if(typeof fn == 'function') {
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
        console.log(sprite);
        this.setState(c, item, sprite)
      })
    })
    o.appendChild(name);
    o.appendChild(val);
    this.spritesheetTags.push({
      name: item.name,
      cname: c.name,
      update: (v) => {
        let sprite = new Sprite(v);
        console.log(sprite, c)
        let img = sprite.canvas;
        console.log('update', item.name, v)
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

  renderExportButton() {
    var d = document.createElement('div');
    CS.applyStyle(d, CS.buttonCss);
    d.textContent = 'Export';

    d.addEventListener('click', (e) => {
      console.log(this.state);
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
    Object.keys(monster).forEach(cname => {
      if(typeof monster[cname] !== 'object') return;
      let category = this.categories.find(c => (c.exportAs || c.name) == cname);
      Object.keys(monster[cname]).forEach(key => {
        let item = category.items.find(i => (i.exportAs || i.name) == key);
        if(!item) return;
        let value = monster[cname][key];
        let listName = item.type + 'Tags';
        let tag = this[item.type + 'Tags'].find(t => t.name == item.name && category.name == t.cname);
        if(tag && typeof tag.update == 'function') tag.update(value);
        this.setState(category, item, value);
      })
    });
    this.importingId = monster.id;
  }

  render() {

    this.parent.appendChild(this.renderName());
    this.parent.appendChild(this.renderCategories());
    this.parent.appendChild(this.renderExportButton());
    this.parent.appendChild(this.renderImportButton());
  }
}

module.exports = CS;
