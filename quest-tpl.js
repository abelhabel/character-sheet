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
  name: "Quest",
  folder: "quests",
  library: 'quests.js',
  queryCommand: 'saveQuest',
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
        },
      ]
    },
    {
      name: 'Condition',
      exportAs: 'condition',
      items: [
        {
          name: 'Type',
          exportAs: 'type',
          type: 'select',
          initial: '',
          values: ['', 'deliver']
        },
        {
          name: 'Amount',
          exportAs: 'amount',
          type: 'increment',
          initial: 1,
          range: [1, 1000000]
        },
        {
          name: 'Item',
          exportAs: 'item',
          type: 'select',
          initial: '',
          values: ['', 'gold', 'scroll', 'terrain']
        },
        {
          name: 'Terrain',
          exportAs: 'terrain',
          type: 'select',
          initial: '',
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
          name: 'Scroll',
          exportAs: 'scroll',
          type: 'select',
          initial: '',
          values: ['', ...abilities.sort(sortOnName)],
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

      ]
    },
    {
      name: 'Reward',
      exportAs: 'reward',
      items: [
        {
          name: 'Type',
          exportAs: 'type',
          type: 'select',
          initial: 'give',
          values: ['', 'give', 'take', 'dispel', 'remove obstacle']
        },
        {
          name: 'Amount',
          exportAs: 'amount',
          type: 'increment',
          initial: 1,
          range: [1, 1000000]
        },
        {
          name: 'Selection',
          exportAs: 'selection',
          type: 'input',
          initial: '',
        },
        {
          name: 'Item',
          exportAs: 'item',
          type: 'select',
          initial: '',
          values: ['', 'gold', 'scroll', 'terrain']
        },
        {
          name: 'Terrain',
          exportAs: 'terrain',
          type: 'select',
          initial: '',
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
          name: 'Scroll',
          exportAs: 'scroll',
          type: 'select',
          initial: '',
          values: ['', ...abilities.sort(sortOnName)],
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
      ]
    },
  ]
};

module.exports = tpl;
