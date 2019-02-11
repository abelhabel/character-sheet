const Sprite = require('Sprite.js');
class Terrain {
  constructor(t) {
    this.template = t;
    this.bio = {
      name: t.bio.name,
      sprite: t.bio.sprite
    };
    this.stats = {
      walkable: t.stats.walkable
    };
    this.sprites = this.bio.sprite.map(s => new Sprite(s));
  }

  get canvas() {
    return this.template.canvas;
  }

  get sprite() {
    let i = Math.floor(_random() * this.bio.sprite.length);
    return this.sprites[i];
  }
}

module.exports = Terrain;
