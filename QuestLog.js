const Component = require('Component.js');

class QuestLog extends Component {
  constructor() {
    super(false, 'quest-log');
    this.quests = [];
  }

  add(q) {
    !this.hasQuest(q) && this.quests.push(q);
  }

  remove(q) {
    let index = this.quests.findIndex(qu => qu.name == q.name);
    console.log('remove quest', q, index, this)
    if(!~index) return;
    this.quests.splice(index, 1);
  }

  hasQuest(q) {
    return this.quests.find(qu => qu.bio.name == q.bio.name);
  }

  get finished() {
    return this.quests.filter(q => q.finished);
  }

  get active() {
    return this.quests.filter(q => !q.finished);
  }

  render() {
    this.clear();
    this.active.forEach(q => this.append(q.render()));
    let close = html`<div class='close'>x</div>`;
    close.addEventListener('click', e => {
      this.unmount();
    });
    this.append(close);
    return this.tags.outer;
  }
}

module.exports = QuestLog;
