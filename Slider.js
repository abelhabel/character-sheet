class Slider {
  constructor(name, initial, state, key, hideLabel) {
    this.name = name;
    this.hideLabel = hideLabel;
    this.value = initial || 50;
    this.width = 200;
    this.buttonWidth = 64;
    this.mouseRange = [this.buttonWidth/2, this.width - this.buttonWidth/2];
    this.leftRange = [this.buttonWidth/2, this.width - this.buttonWidth/2];
    this.state = state || {};
    this.stateKey = key;
    this.state[this.stateKey] = this.v;
    this.tags = {
      container: null,
      slider: null,
      button: null
    }
  }

  get v() {
    return this.value /100;
  }

  get left() {
    return this.value - (100 * this.buttonWidth /2) / this.width ;
  }

  import(v) {
    this.value = Math.round(100 * v);
    this.update();
  }

  valueChanged(e) {
    let x = Math.min(e.offsetX, this.width);
    x = Math.max(x, 0);
    x = this.translateRange(x, [0, this.width], this.mouseRange);
    this.value = this.translateRange(x, this.mouseRange, [0, 100]);
    this.state[this.stateKey] = this.v;
    this.update();
  }

  translateRange(oldValue, o, n) {
    var oldRange = (o[1] - o[0]);
    var newRange = (n[1] - n[0]);
    var newValue = (((oldValue - o[0]) * newRange) / oldRange) + n[0];
    return newValue;
  }

  dragndrop() {
    var ox = 0;
    var state = 'up';
    let container = this.tags.slider;
    container.addEventListener('mousedown', (e) => {
      ox = e.offsetX;
      state = 'down';
    });
    container.addEventListener('mousemove', (e) => {
      if(e.target != container) return;
      if(state != 'down') return;
      this.valueChanged(e);
    });
    // container.addEventListener('mouseup', (e) => {
    //   state = 'up';
    // });
    container.addEventListener('mouseup', (e) => {
      // if(e.target != container) return;
      state = 'up';
      if(state != 'down') return;
      // this.valueChanged(e);
    });
  }

  update() {
    this.tags.button.textContent = parseInt(this.value);
    let x = this.translateRange(this.value, [0, 100], this.leftRange);
    this.tags.button.style.left = x + 'px';
  }

  render() {
    this.tags.container = html`<div>
      <p
        style='
          font-weight: bold;
          display: ${this.hideLabel ? 'none' : 'block'}
        '
      >
        ${this.name}
      </p>
      <div
        style='
          width: ${this.width}px;
          background-color: blue;
        '
      >
        <button
          style='
            position: relative;
            left: ${this.value}%;
            width: ${this.buttonWidth}px;
            transform: translateX(-50%);
            pointer-events: none;
            user-select: none;
          '
        >${this.value}</button>
      </div>
    </div>`;
    this.tags.slider = this.tags.container.querySelector('div');
    this.tags.button = this.tags.container.querySelector('button');
    this.dragndrop();
    return this.tags.container;
  }
}

module.exports = Slider;
