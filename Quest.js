const Component = require('Component.js');

class Quest extends Component {
  constructor(name, condition, reward) {
    super(false, 'quest');
    this.name = name || 'Unnamed quest';
    this.condition = condition || {
      type: 'deliver',
      amount: 1,
      name: 'item',
      item: 'Fire Ball Scroll'
    };
    this.reward = reward || {
      type: 'give gold',
      amount: 10,
      item: null
    };
    this.available = true;
    this.finished = false;
  }

  static create(q) {
    q = typeof q == 'object' ? q : {};
    return new Quest(q.name, q.condition, q.reward);
  }

  get rewardText() {
    let {type, amount, item} = this.reward;
    if(type == 'give gold') {
      return `${amount} gold`;
    } else
    if(type == 'give item') {
      return `${amount} ${item.bio.name}`;
    }
  }

  get conditionText() {
    let {type, amount, name, item} = this.condition;
    if(type == 'deliver') {
      if(name == 'item') {
        return `${amount} ${item}`
      }
      if(name == 'gold') {
        return `${amount} ${name}`;
      }
    }
  }

  conditionMet(adventure) {
    let p = adventure.player;
    let {type, amount, name, item} = this.condition;
    console.log('conditionMet', this, p.gold, this.condition.amount)
    if(type == 'deliver') {
      if(name == 'gold') {
        return p.gold >= amount;
      }
      if(name == 'item') {
        return p.inventory.itemByName(item);
      }
    }

  }

  complete(adventure) {
    this.takeCondition(adventure);
    this.giveReward(adventure);
    this.available = false;
    this.finished = true;
  }

  takeCondition(adventure) {
    let p = adventure.player;
    let {type, amount, name, item} = this.condition;
    if(type == 'deliver') {
      if(name == 'gold') {
        return adventure.addGold(-amount);
      }
      if(name == 'item') {
        return p.inventory.remove(p.inventory.itemByName(item));
      }
    }
  }

  giveReward(adventure) {
    let p = adventure.player;
    let {type, amount, item} = this.reward;
    if(type == 'give gold') {
      return adventure.addGold(amount);
    }

  }

  render() {
    this.clear();
    this.append(html`<div>
      <div class='quest-name'>${this.name}</div>
      <span class='quest-condition'>
        <span>${this.condition.type}:</span>
        <span>${this.conditionText}</span>
      </span>
      <span class='quest-reward'>
        <span>${this.reward.type}:</span>
        <span>${this.rewardText}</span>
      </span>
    </div>`);
    return this.tags.outer;
  }
}

class QuestEditor extends Quest {
  constructor(name) {
    super(name);

  }

  render() {
    this.clear();
    this.tags.outer.classList.add('message-box');
    let t = html`<div>
      <div>
        Name: <input id='name' value='${this.name}'>
        <p>Condition</p>
        <div>
          Type:
          <select id='condition-type'>
            <option ${this.condition.type == 'deliver' ? 'selected' : ''} value='deliver'>deliver</option>
          </select>
        </div>
        <div>
          Amount:
          <input id='condition-amount' value='${this.condition.amount}'>
        </div>
        <div>
          Name:
          <select id='condition-name'>
            <option ${this.condition.name == 'gold' ? 'selected' : ''} value='gold'>gold</option>
            <option ${this.condition.name == 'item' ? 'selected' : ''} value='item'>item</option>
          </select>
        </div>
        <div>
          Item:
          <input id='condition-item' value='${this.condition.item}'>
        </div>
      </div>
      <div>
        <p>Reward</p>
        <div>
          Type:
          <select id='reward-type'>
            <option ${this.reward.type == 'give gold' ? 'selected' : ''} value='give gold'>give gold</option>
            <option ${this.reward.type == 'give item' ? 'selected' : ''} value='give item'>give item</option>
          </select>
        </div>
        <div>
          Amount:
          <input id='reward-amount' value='${this.reward.amount}'>
        </div>
        <div>
          Item:
          <input id='reward-item' value='${this.reward.item}'>
        </div>
      </div>
    </div>`;
    Array.from(t.querySelectorAll('select')).forEach(tag => {
      let p = tag.id.split('-');
      let o = this[p[0]];
      tag.addEventListener('change', e => {
        o[p[1]] = tag.value;
        console.log('select', this)
      })
    });
    Array.from(t.querySelectorAll('input')).forEach(tag => {
      let p = tag.id.split('-');
      let o = this[p[0]];
      tag.addEventListener('keyup', e => {
        if(p[1] == 'amount') {
          o[p[1]] = parseInt(tag.value);
        } else {
          o[p[1]] = tag.value;
        }
        console.log('input', this)
      })
    });
    this.append(t);
    return this.tags.outer;
  }

}

Quest.Editor = QuestEditor;
module.exports = Quest;
