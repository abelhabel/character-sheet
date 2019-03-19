const Sprite = require('Sprite.js');
const CompositeSprite = require('CompositeSprite.js');
const abilities = require('abilities.js');
const terrains = require('terrains.js');
const Ability = require('Ability.js');
class Terrain {
  constructor(t) {
    this.template = t;
    this.index = 0;
    this.bio = {
      name: t.bio.name,
      sprite: t.bio.sprite
    };
    this.stats = {
      walkable: t.stats.walkable,
      cover: t.stats.cover,
      animation: t.stats.animation,
      composite: t.stats.composite,
      ingredient: t.stats.ingredient,
    };
    this.adventure = {
      consumable: t.adventure && t.adventure.consumable,
      event: t.adventure && t.adventure.event,
      action: t.adventure && t.adventure.action,
      item: t.adventure && t.adventure.item,
      actionAmount: t.adventure && t.adventure.actionAmount || 0,
      charges: t.adventure && t.adventure.charges || 0,
      chargeActivation: t.adventure && t.adventure.chargeActivation || '',
      description: t.adventure && t.adventure.description || '',
      tags: {},
    };
    this.inventory = {
      consumable: t.inventory && t.inventory.consumable,
      event: t.inventory && t.inventory.event,
      action: t.inventory && t.inventory.action,
      target: t.inventory && t.inventory.target,
      ability: t.inventory && t.inventory.ability,
    };
    this.sprites = this.bio.sprite.map(s => new Sprite(s));
    this._sprite = new CompositeSprite(this.bio.sprite);
    this.adventureItemCount = 0;
    t.adventure && t.adventure.tags && t.adventure.tags.split(',').forEach(keyval => {
      let kv = keyval.split(':');
      this.adventure.tags[kv[0]] = kv[1];
    })
  }

  static create(templateId) {
    let tpl = terrains.find(t => t.id == templateId);
    return new Terrain(tpl);
  }

  get description() {
    return this.adventure.description;
  }

  get isConsumed() {
    return this.adventureItemCount >= this.adventure.charges * this.adventure.actionAmount;
  }

  consume() {
    this.adventureItemCount += this.adventure.actionAmount;
  }

  resetConsumption() {
    this.adventureItemCount = 0;
  }

  get adventureItem() {
    if(this.adventure.action == 'give movement') {
      return {bio: {name: 'Movement'}};
    }
    if(this.adventure.action == 'give gold') {
      return {bio: {name: 'Gold'}};
    }
    let id = this.adventure.item || this.template.id;
    let tpl = terrains.find(t => t.id == id);
    return new Terrain(tpl);
  }

  takeAdventureItems() {
    if(this.adventureItemCount >= this.adventure.charges * this.adventure.actionAmount) return [];
    let out = [];
    let max = this.adventure.actionAmount;
    for(let i = 0; i < max; i++) {
      out.push(this.adventureItem);
    }
    this.consume();
    return out;
  }

  get ability() {
    if(!this.inventory.ability) return;
    return new Ability(abilities.find(a => a.id == this.inventory.ability));
  }

  get hasGold() {
    return this.adventure.action == 'give gold' && this.adventure.actionAmount;
  }

  get canvas() {
    return this.sprite.canvas;
  }

  get sprite() {
    if(this.stats.composite) {
      return this._sprite;
    }
    let i = Math.floor(Math.random() * this.bio.sprite.length);
    this.index = i;
    return this.sprites[i];
  }

  get fps() {
    return Math.max(250, Math.round(1000 / this.sprites.length));
  }

  get nextSprite() {
    this.index += 1;
    if(this.index > this.sprites.length -1) {
      this.index = 0;
    }
    return this.sprites[this.index];
  }
}

module.exports = Terrain;
