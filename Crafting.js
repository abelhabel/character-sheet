const GridBox = require('GridBox.js');
const Scroll = require('Scroll.js');
const Ability = require('Ability.js');
const Terrain = require('Terrain.js');
const Equipment = require('Equipment.js');
const recipes = require('recipes.js');
const abilities = require('abilities.js');
const terrains = require('terrains.js');
const equipments = require('equipments.js');

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
      terrain: t.result.terrain,
      equipment: t.result.equipment
    };
  }

  get names() {
    return terrains.filter(t => ~this.ingredients.parts.indexOf(t.id)).map(t => t.bio.name).join();
  }

  takeResult(adventure) {
    let p = adventure.player;
    let success = false;
    let {type, amount, item, terrain, scroll, equipment} = this.result;
    if(type == 'give') {
      if(item == 'gold') {
        adventure.addGold(amount);
        success = true;
      }
      if(item == 'scroll') {
        let t = abilities.find(a => a.id == scroll);
        logger.log(`Recipe of ${this.names} produced: ${t.bio.name}`);
        p.inventory.add(new Scroll(new Ability(t)));
        success = true;
      }
      if(item == 'terrain') {
        let t = terrains.find(a => a.id == terrain);
        logger.log(`Recipe of ${this.names} produced: ${t.bio.name}`);
        p.inventory.add(new Terrain(t));
        success = true;
      }
      if(item == 'equipment') {
        let t = equipments.find(a => a.id == equipment);
        logger.log(`Recipe of ${this.names} produced: ${t.bio.name}`);
        p.inventory.add(new Equipment(t));
        success = true;
      }
    }
    success && this.itemsUsed.forEach(item => {
      p.crafting.remove(item);
    });
  }
}

class Crafting extends GridBox {
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
    match && this.trigger('crafting success', new Recipe(match, selected));
  }

  render() {
    GridBox.prototype.render.call(this);
    let t = html`<div class='inventory-instructions'>
      Select the ingredients you want to combine and click 'Use' to combine them.
      By holding down Shift while clicking on an ingredient you can select multiple ingredients.
    </div>`;

    this.append(t);
    return this.tags.outer;
  }
};

module.exports = Crafting;
