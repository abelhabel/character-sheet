const Component = require('Component.js');
const abilities = require('abilities.js');
const terrains = require('terrains.js');
const equipments = require('equipments.js');
const tpl = require('quest-tpl.js');
const Scroll = require('Scroll.js');
const Sprite = require('Sprite.js');
const Ability = require('Ability.js');
const Terrain = require('Terrain.js');
const Equipment = require('Equipment.js');
class Quest extends Component {
  constructor(t) {
    super(false, 'quest');
    this.bio = {
      name: t && t.bio && t.bio.name ? t.bio.name : 'Unnamed',
      sprite: t && t.bio && t.bio.sprite ? t.bio.sprite : null,
      global: t && t.bio && t.bio.global ? t.bio.global : false,
      description: t && t.bio && t.bio.description ? t.bio.description : '',
      xp: t && t.bio && t.bio.xp ? t.bio.xp : 1,
    };
    this.condition = {
      type: t && t.condition && t.condition.type ? t.condition.type : 'deliver',
      amount: t && t.condition && t.condition.amount ? t.condition.amount : 1,
      selection: t && t.condition && t.condition.selection ? t.condition.selection : [],
      item: t && t.condition && t.condition.item ? t.condition.item : 'gold',
      scroll: t && t.condition && t.condition.scroll ? t.condition.scroll : '',
      terrain: t && t.condition && t.condition.terrain ? t.condition.terrain : '',
      equipment: t && t.condition && t.condition.equipment ? t.condition.equipment : '',
    };
    this.reward = {
      type: t && t.reward && t.reward.type ? t.reward.type : 'give',
      amount: t && t.reward && t.reward.amount ? t.reward.amount : 1,
      selection: t && t.reward && t.reward.selection ? t.reward.selection : [],
      item: t && t.reward && t.reward.item ? t.reward.item : 'gold',
      scroll: t && t.reward && t.reward.scroll ? t.reward.scroll : '',
      terrain: t && t.reward && t.reward.terrain ? t.reward.terrain : '',
      equipment: t && t.reward && t.reward.equipment ? t.reward.equipment : '',
    };
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
    if(type == 'remove obstacle') {
      return 'Clears a path';
    }

  }

  get conditionText() {
    let {type, amount, selection, item, terrain, scroll} = this.condition;
    if(type == 'deliver') {
      if(item == 'gold') {
        return `${amount} gold`;
      }
      if(item == 'scroll') {
        let n = abilities.find(a => a.id == scroll);
        return `${amount} Scroll of ${n.bio.name}`;
      }
      if(item == 'terrain') {
        let n = terrains.find(a => a.id == terrain);
        return `${amount} ${n.bio.name}`;
      }
    }
    if(type == 'clear obstacles') {
      return 'Clear a path';
    }
  }

  conditionMet(adventure) {
    let p = adventure.player;
    let {type, amount, selection, item, terrain, scroll, equipment} = this.condition;
    if(type == 'deliver') {
      if(item == 'gold') {
        return p.gold >= amount;
      }
      if(item == 'scroll') {
        return p.inventory.itemByTemplateId(scroll);
      }
      if(item == 'equipment') {
        return p.inventory.itemByTemplateId(equipment);
      }
      if(item == 'terrain') {
        let t = terrains.find(t => t.id == terrain);
        if(t.stats.ingredient) {
          let count = p.crafting.itemsByTemplateId(terrain).length;
          if(count < amount) return false;
          return p.crafting.itemByTemplateId(terrain);
        } else {
          let count = p.inventory.itemsByTemplateId(terrain).length;
          if(count < amount) return false;
          return p.inventory.itemByTemplateId(terrain);
        }
      }
    }
    if(type == 'clear obstacle') {
      let inComplete = selection.split(',').find(p => {
        let xy = p.split(':');
        let x = parseInt(xy[0]);
        let y = parseInt(xy[1]);
        return adventure.layers.obstacles.items.get(x, y);
      });
      return !inComplete;
    }
    if(type == 'kill monster') {
      let inComplete = selection.split(',').find(p => {
        let xy = p.split(':');
        let x = parseInt(xy[0]);
        let y = parseInt(xy[1]);
        return adventure.layers.monsters.items.get(x, y);
      });
      return !inComplete;
    }

  }

  get rewardItem() {
    let {type, amount, item, terrain, scroll, equipment} = this.reward;
    if(item == 'gold') return;
    if(item == 'scroll') {
      let t = abilities.find(a => a.id == scroll);
      return new Scroll(new Ability(t));
    }
    if(item == 'terrain') {
      let t = terrains.find(a => a.id == terrain);
      return new Terrain(t);
    }
    if(item == 'equipment') {
      let t = equipments.find(a => a.id == equipment);
      return new Equipment(t);
    }

  }

  takeCondition(adventure) {
    let p = adventure.player;
    let {type, amount, item, terrain, scroll, equipment} = this.condition;
    if(type == 'deliver') {
      if(item == 'gold') {
        return adventure.addGold(-amount);
      }
      if(item == 'scroll') {
        return p.inventory.remove(p.inventory.itemByTemplateId(scroll));
      }
      if(item == 'equipment') {
        return p.inventory.remove(p.inventory.itemByTemplateId(equipment));
      }
      if(item == 'terrain') {
        let t = terrains.find(t => t.id == terrain);
        for(let i = 0; i < amount; i++) {
          if(t.stats.ingredient) {
            p.crafting.remove(p.crafting.itemByTemplateId(terrain));
          } else {
            p.inventory.remove(p.inventory.itemByTemplateId(terrain));
          }
        }
      }
    }
  }

  giveReward(adventure) {
    let p = adventure.player;
    p.addXP(this.bio.xp);
    let {type, amount, item, terrain, scroll, equipment, selection} = this.reward;
    if(type == 'give') {
      if(item == 'gold') {
        return adventure.addGold(amount);
      }
      if(item == 'scroll') {
        return p.inventory.add(this.rewardItem);
      }
      if(item == 'equipment') {
        return p.inventory.add(this.rewardItem);
      }
    }
    if(type == 'remove obstacle') {
      let positions = [];
      selection.split(',').forEach(p => {
        let xy = p.split(':');
        let x = parseInt(xy[0]);
        let y = parseInt(xy[1]);
        let record = adventure.layers.history.items.get(x, y);
        record.removeObstacle();
        adventure.layers.obstacles.items.remove(x, y);

      });
      adventure.draw(adventure.layers.obstacles);
    }

  }

  render() {
    this.clear();
    let t = html`<div>
      <div class='quest-image'></div>
      <div class='quest-name'>${this.bio.name}</div>
      <span class='quest-condition'>
        ${this.bio.description}
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
