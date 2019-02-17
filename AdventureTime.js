const Component = require('Component.js');
const Sprite = require('Sprite.js');
const icons = require('icons.js');
const sprites =  {
  time: new Sprite(icons.find(i => i.bio.name == 'Wait').bio.sprite),
};
class AdventureTime extends Component {
  constructor(player) {
    super(true, 'time');
    this.player = player;
    this.days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    this.index = 0;
  }

  get day() {
    return this.days[this.index];
  }

  nextDay() {
    this.player.movesLeft = this.player.movement;
    this.index += 1;
    if(this.index >= this.days.length) {
      this.index = 0;
    }
    this.render();
    return this.day;
  }

  render() {
    this.clear();
    this.append(html`<div>
      <span>${this.day}</span>
      <span>${this.player.movesLeft} / ${this.player.movement}</span>
    </div>
    `);
    return this.tags.outer;
  }
}

module.exports = AdventureTime;
