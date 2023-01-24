const Component = require('Component.js');
const Slider = require('Slider.js');
class AdventureOptions extends Component {
  constructor(t = {}) {
    super(true);
    this.config = {
      autoEnd: t.hasOwnProperty('autoEnd') ? t.autoEnd : true,
      soundVolume: t.hasOwnProperty('soundVolume') ? t.soundVolume : 0.3,
      showHelpOnStart: t.hasOwnProperty('showHelpOnStart') ? t.showHelpOnStart : true,
    };
    console.log(this.config.soundVolume)
    this._config = new Proxy(this.config, {
      set: (o, key, val) => {
        this.config[key] = val;
        this.trigger('config changed', {key, val});
        return true;
      }
    })
  }

  render() {
    this.clear();
    this.addStyle(html`<style>
      input {

      }
    </style>`);
    this.tags.outer.id = 'adventure-options';
    let t = html`<div>
      <div>
        <label for='auto-end'>End turn automatically</label>
        <input id='auto-end' type='checkbox'>
      </div>
      <div>
        <label for='show-help'>Show help on start</label>
        <input id='show-help' type='checkbox'>
      </div>

    </div>`;
    this.config.showHelpOnStart
    let ae = t.querySelector('#auto-end');
    let sh = t.querySelector('#show-help');
    ae.checked = this.config.autoEnd;
    sh.checked = this.config.showHelpOnStart;
    ae.addEventListener('click', e => this._config.autoEnd = !!e.target.checked);
    sh.addEventListener('click', e => this._config.showHelpOnStart = !!e.target.checked);
    let sv = new Slider(
      'Sound Volume',
      this.config.soundVolume * 100,
      this._config,
      'soundVolume',
      false
    );
    t.appendChild(sv.render());
    this.append(t);
    return this.tags.outer;
  }
}

module.exports = AdventureOptions;
