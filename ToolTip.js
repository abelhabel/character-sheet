const Component = require('Component.js');
class ToolTip extends Component {
  constructor(tip) {
    super(true);
    this.tip = tip;
  }

  static get style() {
    return html`<style>
      #tool-tip {
        position: fixed;
        color: black;
        z-index: 1010;
        pointer-events: none;
        padding: 4px;
        background-image: url(sheet_of_old_paper.png);
        background-repeat: no-repeat;
        overflow: hidden;
        border-radius: 2px;
        box-shadow: 0px 0px 5px 1px rgba(0,0,0,0.75);
      }
    </style>`;
  }

  render(tag) {
    this.clear();
    this.addStyle(ToolTip.style);
    let bb = tag.getBoundingClientRect();
    let t = html`<div style='top: ${bb.y + 3}px;left: ${bb.right + 2}px;'>
      ${this.tip}
    </div>`;
    this.append(t);
    return this.tags.outer;
  }
}

module.exports = ToolTip;
