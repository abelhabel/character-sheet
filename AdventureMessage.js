const Component = require('Component.js');

class AdventureMessage extends Component {
  constructor(t) {
    super(false, 'message-box');
    this.title = t.title || '';
    this.text = t.text || '';
    this.buttons = t.buttons || [];
  }

  static get style() {
    return html`<style>
    </style>`;
  }

  render() {
    let t = html`<div>
      <div>${this.title}</div>
      <div>${this.text}</div>
    </div>`;
    this.buttons.forEach(b => {
      let c = html`<button>${b.text}</button>`;
      c.addEventListener('click', b.fn);
      t.appendChild(c);
    })
    this.append(t);
    return this.tags.outer;
  }
}

module.exports = AdventureMessage;
