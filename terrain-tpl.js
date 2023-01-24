function sortAlphabetically(a, b) {
  if(a == b) return 0;
  return a < b ? -1 : 1;
}
function sortOnName(a, b) {
  if(a.bio.name == b.bio.name) return 0;
  return a.bio.name < b.bio.name ? -1 : 1;
}
const abilities = require('abilities.js');
const terrains = require('terrains.js');
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
          name: 'Decoration',
          exportAs: 'decoration',
          type: 'binary',
          initial: false
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
        {
          name: 'Composite',
          exportAs: 'composite',
          type: 'binary',
          initial: false
        },
        {
          name: 'Ingredient',
          exportAs: 'ingredient',
          type: 'binary',
          initial: false
        },
        {
          name: 'Resource',
          exportAs: 'resource',
          type: 'binary',
          initial: false
        },
        {
          name: 'Ability Glyph',
          exportAs: 'abilityGlyph',
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
          values: ['', 'give gold', 'give azurite', 'give zircon',
          'give topaz', 'give adamite', 'give iron', 'give brucite',
          'give mud', 'give item', 'open tavern',
          'give movement' , 'open armory', 'open ability trainer',
          'give ability', 'give equipment'
          ]
        },
        {
          name: 'Tags',
          exportAs: 'tags',
          initial: '',
          type: 'text'
        },
        {
          name: 'Item',
          exportAs: 'item',
          initial: '',
          type: 'select',
          values: ['', ...terrains.sort(sortOnName)],
          get(item) {
            if(!item) return '';
            if(typeof item == 'string') {
              let t = this.values.find(v => v && v.id == item);
              if(t) return t.bio.name;
              return item;
            }
            return item.bio.name;
          },
          set(name) {
            if(!name) return '';
            t = this.values.find(v => v && v.bio && v.bio.name == name);
            if(t) return t.id;
            return '';
          }
        },
        {
          name: 'Action Amount',
          exportAs: 'actionAmount',
          initial: 0,
          type: 'increment',
          range: [0, 10000]
        },
        {
          name: 'Action Amount Variation',
          exportAs: 'actionAmountVariation',
          initial: 0,
          type: 'increment',
          range: [0, 10000]
        },
        {
          name: 'Charges',
          exportAs: 'charges',
          initial: 0,
          type: 'increment',
          range: [0, 10000]
        },
        {
          name: 'Charge Activation',
          exportAs: 'chargeActivation',
          type: 'select',
          initial: '',
          values: ['', 'per turn', 'per adventure']
        },
        {
          name: 'Consumable',
          exportAs: 'consumable',
          initial: false,
          type: 'binary'
        },
        {
          name: 'Description',
          exportAs: 'description',
          initial: '',
          type: 'text'
        }
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
            if(typeof item == 'string') {
              let t = this.values.find(v => v && v.id == item);
              if(t) return t.bio.name;
              return item;
            }
            return item.bio.name;
          },
          set(name) {
            if(!name) return '';
            t = this.values.find(v => v && v.bio && v.bio.name == name);
            if(t) return t.id;
            return '';
          }
        }
      ]
    }
  ]
};

module.exports = tpl;
