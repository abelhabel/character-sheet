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
    this.totalDays = 0;
  }

  get day() {
    return this.days[this.index];
  }

  setDays(days) {
    if(days < 1) return;
    this.totalDays = days;
    this.index = this.totalDays % this.days.length;
  }

  nextDay() {
    this.index += 1;
    this.totalDays += 1;
    if(this.index >= this.days.length) {
      this.index = 0;
    }
    this.render();
    return this.day;
  }

  render() {
    this.clear();
    this.append(html`<div style='text-transform: capitalize;'>
      <span>Day ${this.totalDays}</span>
      <span>${this.day}</span>
      <span> | </span>
      <span>moves today: ${this.player.movesLeft} / ${this.player.stats.movement}</span>
    </div>
    `);
    return this.tags.outer;
  }
}

module.exports = AdventureTime;
