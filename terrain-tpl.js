function sortAlphabetically(a, b) {
  return a < b ? -1 : 1;
}
var tpl = {
  name: "Terrain",
  folder: "terrain",
  library: 'terrains.js',
  queryCommand: 'saveTerrain',
  categories: [
    {
      name: 'Bio',
      exportAs: 'bio',
      items: [
        {
          name: 'Name',
          exportAs: 'name',
          type: 'input',
          minCharacters: 1,
          maxCharacters: 128,
        },
        {
          name: 'Sprite',
          type: 'spritesheet-palette',
          exportAs: 'sprite',
          src: 'DungeonCrawl_ProjectUtumnoTileset.png',
          w: 32,
          h: 32
        }
      ]
    },
    {
      name: 'Stats',
      exportAs: 'stats',
      items: [
        {
          name: 'Walkable',
          exportAs: 'walkable',
          type: 'binary',
          initial: true
        },
        {
          name: 'Cover',
          exportAs: 'cover',
          type: 'binary',
          initial: false
        }
      ]
    }
  ]
};

module.exports = tpl;
