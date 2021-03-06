class Logger {
  constructor() {
    this.history = [];
    this.minimized = true;
    var state = 'out';
    var min = document.createElement('div');
    this.min = min;
    min.textContent = 'minimize';
    Object.assign(min.style, {
      position: 'absolute',
      right: '10px',
      top: '0px',
      cursor: 'pointer'
    })
    min.addEventListener('click', () => {
      this.minimized = !this.minimized;
      this.redraw();
    })
    var sx = 0;
    var sy = 0;
    var ox = 0;
    var oy = 0;
    this.container = document.createElement('div');
    this.container.appendChild(min);
    // this.container.addEventListener('mousedown', (e) => {
    //   if(e.target == min) return;
    //   sx = e.screenX;
    //   sy = e.screenY;
    //   ox = e.offsetX;
    //   oy = e.offsetY;
    //   state = 'down';
    // });
    // window.addEventListener('mousemove', (e) => {
    //   // if(e.target != this.container) return;
    //   if(state != 'down') return;
    //   var x = e.x;
    //   var y = e.y;
    //   this.container.style.left = x - ox + 'px';
    //   this.container.style.top = y - oy + 'px';
    // });
    // this.container.addEventListener('mouseup', (e) => {
    //   state = 'up';
    // });
    // this.container.addEventListener('mouseleave', (e) => {
    //   // state = 'out';
    // });
    Object.assign(this.container.style, {
      position: 'fixed',
      width: '600px',
      maxWidth: '39%',
      height: '120px',
      border: '1px solid black',
      bottom: '0px',
      right: '0px',
      backgroundColor: 'beige',
      zIndex: 200,
      cursor: 'grab',
      overflow: 'hidden',
      overflowY: 'scroll',
      padding: '2px 4px'
    })

    this.log('Logger started');
    resizable(this.container);
    document.body.appendChild(this.container);
    this.redraw();
  }

  hide() {
    this.minimized = true;
    this.redraw();
  }

  show() {
    this.minimized = false;
    this.redraw();
  }

  tag() {
    var d = document.createElement('div');
    return d;
  }

  log() {
    var text = Array.from(arguments).join(' ');
    var html = text.replace(/(fire)/g, "<span style='color:red'>$1</span>")
    .replace(/(air)/g, "<span style='color:cadetblue'>$1</span>")
    .replace(/(water)/g, "<span style='color:blue'>$1</span>")
    .replace(/(force)/g, "<span style='color:purple'>$1</span>")
    .replace(/(earth)/g, "<span style='color:green'>$1</span>")
    .replace(/(rot)/g, "<span style='color:brown'>$1</span>")
    .replace(/(vitality)/g, "<span style='color:orange'>$1</span>")
    var tag = this.tag();
    tag.innerHTML = html;
    this.history.push({text, tag});
    this.container.insertBefore(tag, this.container.firstElementChild);
  }

  redraw() {
    if(this.minimized) {
      this.container.style.height = '23px';
      this.min.textContent = 'maximize';
    } else {
      this.container.style.height = '120px';
      this.min.textContent = 'minimize';
    }
  }
}

module.exports = Logger;
