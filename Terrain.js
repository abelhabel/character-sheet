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

  }

  get canvas() {
    return this.template.canvas;
  }

  get sprite() {
    let i = Math.floor(_random() * this.bio.sprite.length);
    return this.bio.sprite[i];
  }
}

module.exports = Terrain;
