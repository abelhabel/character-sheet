const Component = require('Component.js');

class AdventureMessage extends Component {
  constructor(t) {
    super(true, 'message-box');
    this.title = t.title || '';
    this.text = t.text || '';
    this.prompt = t.prompt || '';
    this.buttons = t.buttons || [];
  }

  static get style() {
    return html`<style>
      #title {
        text-align: left;
        font-size: 20px;
      }
      #description {
        text-align: left;
        font-size: 16px;
      }
      #prompt {
        text-align: right;
        font-size: 16px;
      }
      button {
        text-align: right;
        box-shadow: 0px 2px 4px -1px rgba(0,0,0,0.5);
        background-color: transparent;
        border: none;
        outline: none;
        padding: 10px;
        cursor: inherit;
        border-radius: 4px;
      }
      button:hover {
        background-color: rgba(0,0,0,0.1);
      }
    </style>`;
  }

  render() {
    this.clear();
    let f = new Component.Fragment();
    f.append(AdventureMessage.style);
    let t = html`<div>
      <div id='title'>${this.title}</div>
      <div id='description'>${this.text}</div>
      <div id='prompt'>${this.prompt}</div>
      <div class='buttons'></div>
    </div>`;
    f.append(t);
    this.buttons.forEach(b => {
      let c = html`<button>${b.text}</button>`;
      c.addEventListener('click', b.fn);
      f.appendIn('.buttons', c);
    })
    this.append(f);
    return this.tags.outer;
  }
}

module.exports = AdventureMessage;
