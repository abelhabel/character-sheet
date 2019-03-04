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
const equipments = require('equipments.js');
const p = {
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
};
const ingredients = terrains.filter(t => t.stats.ingredient);
var tpl = {
  name: "Recipe",
  folder: "recipes",
  library: 'recipes.js',
  queryCommand: 'saveRecipe',
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
      name: 'Ingredients',
      exportAs: 'ingredients',
      items: [
        {
          name: 'Parts',
          exportAs: 'parts',
          type: 'multiselect',
          values: ingredients,
          get: p.get,
          set: p.set
        }

      ]
    },
    {
      name: 'Result',
      exportAs: 'result',
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
          values: ['', 'gold', 'scroll', 'terrain', 'equipment']
        },
        {
          name: 'Terrain',
          exportAs: 'terrain',
          type: 'select',
          initial: '',
          values: ['', ...terrains.sort(sortOnName)],
          get: p.get,
          set: p.set,
        },
        {
          name: 'Scroll',
          exportAs: 'scroll',
          type: 'select',
          initial: '',
          values: ['', ...abilities.sort(sortOnName)],
          get: p.get,
          set: p.set,
        },
        {
          name: 'Equipment',
          exportAs: 'equipment',
          type: 'select',
          initial: '',
          values: ['', ...equipments.sort(sortOnName)],
          get: p.get,
          set: p.set,
        },
      ]
    },
  ]
};

module.exports = tpl;
