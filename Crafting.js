const Inventory = require('Inventory.js');
const Scroll = require('Scroll.js');
const Ability = require('Ability.js');
const recipes = require('recipes.js');
const abilities = require('abilities.js');

class Recipe {
  constructor(t, itemsUsed) {
    this.template = t;
    this.itemsUsed = itemsUsed;
    this.bio = {
      name: t.bio.name,
      sprite: t.bio.sprite
    };
    this.ingredients = {
      parts: Array.from(t.ingredients.parts)
    }
    this.result = {
      type: t.result.type,
      amount: t.result.amount,
      selection: t.result.selection,
      item: t.result.item,
      scroll: t.result.scroll,
      terrain: t.result.terrain
    };
  }

  takeResult(adventure) {
    let p = adventure.player;
    let success = false;
    let {type, amount, item, terrain, scroll} = this.result;
    console.log(type, amount, item, terrain, scroll)
    if(type == 'give') {
      if(item == 'gold') {
        adventure.addGold(amount);
        success = true;
      }
      if(item == 'scroll') {
        let t = abilities.find(a => a.id == scroll);
        p.inventory.add(new Scroll(new Ability(t)));
        success = true;
      }
    }
    success && this.itemsUsed.forEach(item => {
      p.crafting.remove(item);
    });
  }
}

class Crafting extends Inventory {
  constructor() {
    super(8, 8);
  }

  checkRecipe(items) {
    return recipes.find(r => {
      if(r.ingredients.parts.length != items.length) return;
      let matchingParts = r.ingredients.parts.filter(id => {
        return items.find(i => i.item.template.id == id);
      });
      return matchingParts.length == items.length;
    });
  }

  use() {
    let selected = this.selectedItems;
    if(selected.length < 2) return;
    let match = this.checkRecipe(selected);
    console.log('match', match);
    match && this.trigger('crafting success', new Recipe(match, selected));
  }
};

module.exports = Crafting;
