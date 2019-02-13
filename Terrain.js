const Sprite = require('Sprite.js');
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
      animation: t.stats.animation
    };
    this.sprites = this.bio.sprite.map(s => new Sprite(s));
  }

  get canvas() {
    return this.sprite.canvas;
  }

  get sprite() {
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
