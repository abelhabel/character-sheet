function sortAlphabetically(a, b) {
  return a < b ? -1 : 1;
}
var tpl = {
  name: "Icon",
  folder: "icons",
  library: 'icons.js',
  queryCommand: 'saveIcon',
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
          type: 'spritesheet',
          exportAs: 'sprite',
          src: 'DungeonCrawl_ProjectUtumnoTileset.png',
          w: 32,
          h: 32
        }
      ]
    }
  ]
};

module.exports = tpl;
