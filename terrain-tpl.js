function sortAlphabetically(a, b) {
  return a < b ? -1 : 1;
}
const abilities = require('abilities.js');
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
        },
        {
          name: 'Animation',
          exportAs: 'animation',
          type: 'binary',
          initial: false
        },

      ]
    },
    {
      name: 'Adventure',
      exportAs: 'adventure',
      items: [
        {
          name: 'Event',
          exportAs: 'event',
          type: 'select',
          initial: '',
          values: ['', 'click', 'walk on']
        },
        {
          name: 'Action',
          exportAs: 'action',
          initial: '',
          type: 'select',
          values: ['', 'give gold', 'give item', 'open tavern']
        },
        {
          name: 'Action Amount',
          exportAs: 'actionAmount',
          initial: 0,
          type: 'increment',
          range: [0, 10000]
        },

      ]
    },
    {
      name: 'Inventory',
      exportAs: 'inventory',
      items: [
        {
          name: 'Consumable',
          exportAs: 'consumable',
          initial: false,
          type: 'binary'
        },
        {
          name: 'Event',
          exportAs: 'event',
          type: 'select',
          initial: '',
          values: ['', 'use']
        },
        {
          name: 'Target',
          exportAs: 'target',
          inital: 'unit',
          type: 'select',
          values: ['', 'unit', 'team']
        },
        {
          name: 'Action',
          exportAs: 'action',
          initial: '',
          type: 'select',
          values: ['', 'give ability']
        },
        {
          name: 'Ability',
          exportAs: 'ability',
          initial: '',
          type: 'select',
          values: ['', ...abilities],
          get(item) {
            if(!item) return '';
            return item.bio.name;
          },
          set(name) {
            if(!name) return '';
            return this.values.find(v => v && v.bio && v.bio.name == name).id;
          }
        }
      ]
    }
  ]
};

module.exports = tpl;
