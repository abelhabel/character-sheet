const Component = require('Component.js');
const abilities = require('abilities.js');
const terrains = require('terrains.js');
const tpl = require('quest-tpl.js');
const Scroll = require('Scroll.js');
const Sprite = require('Sprite.js');
const Ability = require('Ability.js');
const Terrain = require('Terrains.js');
class Quest extends Component {
  constructor(t) {
    super(false, 'quest');
    this.bio = {
      name: t ? t.bio.name : 'Unnamed',
      sprite: t ? t.bio.sprite : null
    };
    this.condition = {
      type: t ? t.condition.type : 'deliver',
      amount: t ? t.condition.amount : 1,
      item: t ? t.condition.item : 'gold',
      scroll: t ? t.condition.scroll : '',
      terrain: t ? t.condition.terrain : ''
    };
    this.reward = {
      type: t ? t.reward.type : 'give',
      amount: t ? t.reward.amount : 1,
      item: t ? t.reward.item : 'gold',
      scroll: t ? t.reward.scroll : '',
      terrain: t ? t.reward.terrain : ''
    };
    this.available = t ? t.available : true;
    this.finished = t ? t.finished : false;
    this.sprite = this.bio.sprite ? new Sprite(this.bio.sprite) : null
  }

  static create(q) {
    return new Quest(q);
  }

  get state() {
    return {
      bio: this.bio,
      condition: this.condition,
      reward: this.reward
    }
  }

  get rewardText() {
    let {type, amount, item, terrain, scroll} = this.reward;
    if(type == 'give') {
      if(item == 'gold') {
        return `${amount} gold`;
      }
      if(item == 'scroll') {
        let n = abilities.find(a => a.id == scroll);
        console.log(n, this)
        return `${amount} Scroll of ${n.bio.name}`;
      }
    }

  }

  get conditionText() {
    let {type, amount, item, terrain, scroll} = this.condition;
    if(type == 'deliver') {
      if(item == 'gold') {
        return `${amount} gold`;
      }
      if(item == 'scroll') {
        let n = abilities.find(a => a.id == scroll);
        console.log(n, this)
        return `${amount} Scroll of ${n.bio.name}`;
      }
    }
  }

  conditionMet(adventure) {
    let p = adventure.player;
    let {type, amount, item, terrain, scroll} = this.condition;
    if(type == 'deliver') {
      if(item == 'gold') {
        return p.gold >= amount;
      }
      if(item == 'scroll') {
        return p.inventory.itemByTemplateId(scroll);
      }
    }

  }

  complete(adventure) {
    this.takeCondition(adventure);
    this.giveReward(adventure);
    this.available = false;
    this.finished = true;
  }

  get rewardItem() {
    let {type, amount, item, terrain, scroll} = this.reward;
    if(item == 'gold') return;
    if(item == 'scroll') {
      let t = abilities.find(a => a.id == scroll);
      return new Scroll(new Ability(t));
    }
  }

  takeCondition(adventure) {
    let p = adventure.player;
    let {type, amount, item, terrain, scroll} = this.condition;
    if(type == 'deliver') {
      if(item == 'gold') {
        return adventure.addGold(-amount);
      }
      if(item == 'scroll') {
        return p.inventory.remove(p.inventory.itemByTemplateId(scroll));
      }
    }
  }

  giveReward(adventure) {
    let p = adventure.player;
    let {type, amount, item, terrain, scroll} = this.reward;
    if(type == 'give') {
      if(item == 'gold') {
        return adventure.addGold(amount);
      }
      if(item == 'scroll') {
        return p.inventory.add(this.rewardItem);
      }
    }

  }

  render() {
    this.clear();
    let t = html`<div>
      <div class='quest-image'></div>
      <div class='quest-name'>${this.name}</div>
      <span class='quest-condition'>
        <span>${this.condition.type}:</span>
        <span>${this.conditionText}</span>
      </span>
      <span class='quest-reward'>
        <span>${this.reward.type}:</span>
        <span>${this.rewardText}</span>
      </span>
    </div>`;
    if(this.sprite) {
      t.querySelector('.quest-image').appendChild(this.sprite.canvas);
    }
    this.append(t);
    return this.tags.outer;
  }
}

class QuestEditor extends Quest {
  constructor(t) {
    super(t);

  }

  render() {
    this.clear();
    const CS = require('CS.js');
    let cs = new CS(tpl, this.shadow, null, (c, i, v) => {
      this[c.exportAs][i.exportAs] = v;
    }, true);
    cs.render();
    cs.import(this.state);
    return this.tags.outer;
  }

}

Quest.Editor = QuestEditor;
module.exports = Quest;
