const CompositeSprite = require('CompositeSprite.js');
const Terrain = require('Terrain.js');
const icons = require('icons.js');
const abilities = require('abilities.js');
const Sprite = require('Sprite.js');
const Canvas = require('Canvas.js');
const _cs = icons.find(i => i.id == '8df982e7-e932-c755-a934-4484228786ed');
const bg = new Sprite(_cs.bio.sprite);
function tpl(ability) {
  let a = ability;
  return {
    id: ability.template.id,
    bio: {
      name: `${a.bio.name} Scroll`,
      sprite: [_cs.bio.sprite, ability.template.bio.sprite]
    },
    stats: {
      walkable: false,
      cover: false,
      animation: false,
    },
    adventure: {
      consumable: true,
      event: 'click',
      action: 'give item',
      item: null,
      actionAmount: 1,
      charges: 1,
      chargeActivation: 'per adventure',
      description: `One time use of ${a.bio.name}`,
    },
    inventory: {
      consumable: true,
      event: 'use',
      action: 'give scroll',
      target: 'unit',
      ability: a.template.id,
    },
  }
}
class Scroll extends Terrain {
  constructor(ability) {
    super(tpl(ability));
    this._ability = ability;
    this._sprite = new CompositeSprite([bg, ability.baseSprite]);
    this.draw();
  }

  get canvas() {
    return this._sprite.canvas;
  }

  get sprite() {
    return this._sprite;
  }

  get adventureItem() {
    return new Scroll(this._ability);
  }

  draw() {
    this._sprite._canvas.clear();
    this._sprite._canvas.drawSprite(this._sprite.sprites[0], 0, 0, this._sprite.w, this._sprite.h);
    this._sprite._canvas.drawSprite(this._sprite.sprites[1], 8, 8, this._sprite.w-16, this._sprite.h-16);
  }

}

module.exports = Scroll;
