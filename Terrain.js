class Terrain {
  constructor(t) {
    console.log('terrain template', t)
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
    let i = Math.floor(Math.random() * this.bio.sprite.length);
    return this.bio.sprite[i];
  }
}

module.exports = Terrain;
