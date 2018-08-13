class CS {
  constructor(tpl, parent, pools) {
    this.name = tpl.name;
    this.categories = tpl.categories;

    this.parent = parent;
    this.state = {};
    this.categories.forEach(c => {
      this.state[c.exportAs || c.name] = {};
    })
    this.pools = pools || {};
    this.drains = {};
    this.initialPools = {};
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
      console.log(e)

      let inc = e.shiftKey ? 10 : 1;
      let nextVal = 0;
      if(e.offsetX < 20) {
        inc *= -1;
      }
      if(this.drains[c.pool] + inc > this.initialPools[c.pool]) {
        console.log('No more points')
        return;
      }
      if(item.range) {
        nextVal = Math.min(Math.max(currentVal + inc, item.range[0]), item.range[1]);
      }
      if(nextVal == currentVal) return;
      currentVal = nextVal;
      this.setState(c, item, currentVal);
      this.drains[c.pool] += inc;
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

    return o;
  }

  renderSelect(item, c) {
    var o = document.createElement('div');
    o.style.userSelect = 'none';
    var name = document.createElement('div');
    var val = document.createElement('select');
    name.style.display = val.style.display = 'inline-block';
    name.style.height = val.style.height = '40px';
    name.style.lineHeight = val.style.lineHeight = '40px';
    name.style.width = val.style.width = '200px';
    val.style.textAlign = 'center';
    name.textContent = item.name;
    var currentVal = item.initial || '';
    item.values.forEach(v => {
      var o = document.createElement('option');
      o.textContent = o.value = v;
      val.appendChild(o);
    })
    val.value = currentVal;
    this.setState(c, item, currentVal);
    val.addEventListener('change', (e) => {
      currentVal = val.value;
      this.setState(c, item, currentVal);
      console.log(currentVal)
    })

    o.appendChild(name);
    o.appendChild(val);

    return o;
  }

  openSpriteSheet(item, fn) {
    var image = new Image();
    image.style.position = 'absolute';
    image.style.left = '0px';
    image.style.top = '0px';
    image.addEventListener('click', (e) => {
      fn(
        item.w * Math.floor(e.offsetX / item.w),
        item.h * Math.floor(e.offsetY / item.h),
        image
      );
      document.body.removeChild(image);
    })

    image.src = item.src;
    document.body.appendChild(image);
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
      this.openSpriteSheet(item, (x, y, img) => {
        var ct = canvas.getContext('2d');
        ct.clearRect(0, 0, item.w, item.h);
        ct.drawImage(img, x, y, item.w, item.h, 0, 0, item.w, item.h);
        this.setState(c, item, {x: x, y: y, spritesheet: item.src})
      })
    })
    o.appendChild(name);
    o.appendChild(val);
    return o;
  }

  renderCategories() {
    var d = document.createElement('div');
    this.categories.forEach(c => {
      var n = document.createElement('h2');
      n.textContent = c.name;
      d.appendChild(n);
      var o = document.createElement('div');
      d.appendChild(o);
      c.items.forEach(item => {
        switch(item.type) {
          case 'increment':
            return o.appendChild(this.renderIncrement(item, c));
          case 'input':
            return o.appendChild(this.renderInput(item, c));
          case 'select':
            return o.appendChild(this.renderSelect(item, c));
          case 'spritesheet':
            return o.appendChild(this.renderSpriteSelect(item, c));
          default: ''
        }

      })
    })
    return d;
  }

  renderExportButton() {
    var d = document.createElement('div');
    d.style.cursor = 'pointer';
    d.style.width = '100px';
    d.style.height = d.style.lineHeight = '20px';
    d.style.padding = '5px 10px';
    d.style.textAlign = 'center';
    d.style.backgroundColor = 'black';
    d.style.color = 'white';
    d.textContent = 'Export';

    d.addEventListener('click', (e) => {
      console.log(this.state);
      fetch('saveMonster', {
        method: 'POST',
        body: JSON.stringify(this.state)
      })
      .then(res => {
        console.log('saved', res.statusCode);
      })
      .catch(e => {
        console.log('error', e)
      })
    })

    return d;
  }

  render() {

    this.parent.appendChild(this.renderName());
    this.parent.appendChild(this.renderCategories());
    this.parent.appendChild(this.renderExportButton());
  }
}

module.exports = CS;
