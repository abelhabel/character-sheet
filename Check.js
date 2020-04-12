const Component = require('Component.js');

class Check extends Component {
  constructor(type, subtype, value, reward, passive, description) {
    super(true, 'check');
    this.type = type || '';
    this.subtype = subtype || '';
    this.value = parseInt(value || 0);
    this.reward = reward || '';
    this.passive = passive || '';
    this.description = description || '';
    this.text = this.toString();
    this.roll = 0;
    this.tiles = [];
    this.decorationChange = '';
  }

  addTile(plane, x, y) {
    this.tiles.push({plane, x, y});
  }

  get passed() {
    return this.roll && this.roll > this.value;
  }

  get failed() {
    return this.roll && this.roll <= this.value;
  }

  static create(t = {}) {
    let c = new Check(t.type, t.subtype, t.value, t.reward, t.passive, t.description);
    return c;
  }

  toString() {
    if(!this.type || !this.subtype || !this.value) return '';
    return `type:${this.type},subtype:${this.subtype},value:${this.value},reward:${this.reward ? 'yes' : ''},passive:${this.passive ? 'yes' : ''},description:${this.description}`;
  }

  parse() {
    this.text.split(',').forEach(keyval => {
      let kv = keyval.split(':');
      if(kv[0] == 'passive') {
        kv[1] = !!kv[1];
      } else
      if(kv[0] == 'value') {
        kv[1] = parseInt(kv[1]);
      }
      this[kv[0]] = kv[1];
    })
  }

  _roll(adventure) {
    let bonus = adventure.player.checkLevel(this);
    adventure.rand.next();
    adventure.rand.between(1, 10);
    this.roll = Math.floor(adventure.rand.n + bonus);
    let state = this.passed ? 'passed' : 'failed';
    logger.log(`Player ${state} ${this.subtype} check. (${this.roll} / ${this.value})`);
    this.trigger('roll', this.roll);
  }

  renderAdventureDialog(adventure) {
    let c = new Component(false, 'message-box');
    let bonus = adventure.player.checkLevel(this);
    let m = '';
    let r = '';
    if(this.passed) {
      m = `Result: ${this.roll}. Check Passed!`;
    } else
    if(this.failed) {
      m = `Result: ${this.roll}. Check Failed!`;
    } else {
      m = `Roll ${this.subtype} above ${this.value} to pass this ${this.subtype} check. Your bonus is: ${bonus}`;
      r = `<button id='roll'>${this.roll ? this.roll : 'Roll!'}</button>`;
    }
    let t = html`<div>
      <p>${this.description ? this.description + '<br><br>': ''}${m}</p>
      ${r}
      <button id='close'>Close</button>
    </div>`;
    c.append(t);
    let roll = () => {
      this._roll(adventure);
      c.trigger('roll', this.roll);
      c.removeListener('#roll', 'click', roll);
      c.render();
    };
    let close = (e) => {
      c.removeListener('#roll', 'click', roll);
      c.removeListener('#close', 'click', close);
      c.unmount();
    };
    r && c.listen('#roll', 'click', roll);
    c.listen('#close','click', close);
    return c;
  }

  render() {


    return this.tags.outer;
  }
}

class CheckEditor extends Check {
  constructor(type, subtype, value, reward, passive, description) {
    super(type, subtype, value, reward, passive, description);
  }

  render() {
    this.clear();
    let t = html`<textarea>${this.toString()}</textarea>`;
    t.addEventListener('keyup', e => {
      this.text = t.value;
      this.parse();
    })
    this.append(t);
    return this.tags.outer;
  }
}
Check.Editor = CheckEditor;
module.exports = Check;
