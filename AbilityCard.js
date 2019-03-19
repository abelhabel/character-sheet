const Sprite = require('Sprite.js');
const Component = require('Component.js');
const bgSprite = new Sprite({
  x: 700,
  y: 1500,
  w: 144,
  h: 184,
  spritesheet: 'Hell2.jpg'
});
// bgSprite.drawWithOpacity(0.5);
const bg = bgSprite.png;
class AbilityCard extends Component {
  constructor(item) {
    super(false, 'ability-card');
    this.item = item;
    this.cached = null;
    this.small = null;
    this.state = 'big';
  }

  hightlightCanvas() {
    if(!this.small) return;
    this.small.classList.add('selected');
  }

  unhightlightCanvas() {
    if(!this.small) return;
    this.small.classList.remove('selected');
  }

  get bg() {
    return `url(${bg})`;
  }

  render() {
    this.clear();
    let card = this.html();
    let image = card.querySelector('.card-image');
    let canvas = this.item.canvas.clone();
    image.appendChild(canvas);
    this.append(card);
    return this.tags.outer;
  }

  html(turn) {
    var {item} = this;
    var name = item.bio.name;
    let {description, type} = item.bio;
    let {element, source, range, shape, radius,
    multiplier, minPower, maxPower} = item.stats;
    return html`<div class='card-outer'>
      <div class='card-inner'>
        <div class='card-upper'>
          <div class='card-name'>
            ${name}
          </div>
          <div class='card-image'>
          </div>
          <div class='card-tags'>
            ${type}, ${source}, ${element}
          </div>
        </div>
        <div class='card-lower'>
          ${description}
        </div>
      </div>
    </div>`;
  }

  static get style() {
    return html`<style>
    .open-cs {
      position: absolute;
      bottom: -10px;
      display: none;
    }
    .card-outer {
      white-space: initial;
      box-sizing: border-box;
      user-select: none;
      position: relative;
      top: 0px;
      left: 0px;
      display: inline-block;
      width: 160px;
      height: 200px;
      border-radius: 12px;
      background-color: darkkhaki;
      padding: 8px;
      font-family: Tahoma, monospace;
      font-size: 10px;
      vertical-align: top;
      margin: 8px;
      border: none;
      background: linear-gradient(to bottom, #bdb76b 0%,#713c14 100%);
      background: url(sheet_of_old_paper.png);
      box-shadow: 1px 5px 7px 0px rgba(0,0,0,0.5);
    }
    .card-outer.team1 {
      border: 1px solid blue;
    }
    .card-outer.team2 {
      border: 1px solid red;
    }
    .card-outer.selected {
      border: 3px solid cornflowerblue;
    }
    canvas.selected {
      background-color: cornflowerblue;
    }
    .card-inner {
      box-sizing: border-box;
      border-radius: 10px;
      border: 1px solid thistle;
      width: 100%;
      height: 100%;
      background-color: rgba(245, 245, 220,0.3);
      border: 1px solid gray;
    }

    .card-inner.turn {
      background-color: cornflowerblue;
    }

    .card-name {
      padding: 2px 4px;
      background-color: rgba(218, 217, 190, 0.5);
      position: relative;
      top: -1px;
      left: 0px;
      border-bottom: 2px solid #3f4035;
      border-right: 1px solid #3f4035;
      font-weight: bold;
      font-size: 12px;
      text-align: left;
      border-top-left-radius: 7px;
      border-top-right-radius: 7px
    }

    .card-image {
      text-align: center;
      padding: 4px 20px;
    }

    .card-tags {
      color: black;
      text-align: center;
    }

    .card-upper, .card-lower {
      position: relative;
      background-color: rgba(0,0,255,0.1);
      font-size: 10px;
    }

    .card-upper {
      height: 50%;
    }
    .card-lower {
      height: 50%
    }

    .card-lower {
      background-color: rgba(255,255,255,0.3);
    }

    .card-lower:hover {
      background-color: rgba(255,255,255,0.8);
    }

    .stats-left {
      position: absolute;
      left: -10px;
      width: 24px;
      bottom: -6px;
      display: none;
    }
    .stats-right {
      position: absolute;
      right: -10px;
      width: 24px;
      bottom: -6px;
      display: none;
    }

    .card-outer:hover .stats {
      display: block;
    }

    .card-stat {
      position: relative;
      min-width: 24px;
      height: 24px;
      border-radius: 8px;
      text-align: center;
      line-height: 20px;
      color: white;
      margin-bottom: -4px;
      border: none;
      cursor: default;
      display: inline-block;
      padding: 2px;
    }
    .card-stat span {
      display: none;
    }
    .card-stat:hover {
      outline: 1px solid black;
    }
    .stats-left .card-stat:hover span {
      display: inline-block;
      position: absolute;
      top: 0px;
      left: 24px;
      background-color: black;
      font-size: 13px;
      padding: 0px 4px;
      border-radius: 4px;
      width: 106px;
      text-align: left;

    }
    .stats-right .card-stat:hover span {
      display: inline-block;
      position: absolute;
      top: 0px;
      right: 24px;
      background-color: black;
      font-size: 13px;
      padding: 0px 4px;
      border-radius: 4px;
      width: 106px;
      text-align: right;

    }
    .health, .apr {
      background-color: red;
    }
    .mana, .spell-power {
      background-color: blue;
    }
    .defence, .spell-resistance {
      background-color: green;
    }
    .tpr, .movement, .initiative {
      background-color: cadetblue;
    }
    .attack, .damage {
      background-color: purple;
    }

    .cost, .tier {
      background-color: #b19500;
    }

    .card-abilities {
      font-family: Tahoma;
      font-size: 10px;
      padding-left: 16px;
      text-align: left;
    }
    .card-triggers {

    }
    .card-effects {

    }
    </style>`;
  }
}

module.exports = AbilityCard;
