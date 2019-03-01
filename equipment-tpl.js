var abilities = require('abilities.js');
var sounds = require('sounds.js');
function sortOnName(a, b) {
  if(a.bio.name == b.bio.name) return 0;
  return a.bio.name < b.bio.name ? -1 : 1;
}
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
var tpl = {
  name: "Equipment",
  folder: "equipment",
  library: 'equipments.js',
  queryCommand: 'saveEquipment',
  categories: [
    {
      name: 'Bio',
      exportAs: 'bio',
      items: [
        {
          name: 'Sprite',
          type: 'spritesheet',
          exportAs: 'sprite',
          src: 'DungeonCrawl_ProjectUtumnoTileset.png',
          w: 32,
          h: 32
        },
        {
          name: 'Name',
          type: 'input',
          minCharacters: 1,
          maxCharacters: 20,
          exportAs: 'name',
        },
        {
          name: 'Slot',
          type: 'select',
          values: ['', 'body', 'head', 'feet', 'wrists', 'neck', 'finger', 'hand', 'waist'],
          initial: '',
          exportAs: 'slot',
        },
        {
          name: 'Slots',
          exportAs: 'slots',
          initial: 1,
          type: 'increment',
          range: [1, 2]
        },
        {
          name: 'Cost',
          type: 'input',
          initial: 10,
          exportAs: 'cost',
        }
      ]
    },
    {
      name: "Abilities",
      exportAs: 'abilities',
      items: [
        {
          name: 'Abilities',
          type: 'select',
          initial: '',
          values: ['', ...abilities.sort(sortOnName)],
          exportAs: 'abilities',
          get: p.get,
          set: p.set
        }
      ]
    },
    {
      name: "Sounds",
      exportAs: 'sounds',
      items: [
        {
          name: 'Turn Start',
          type: 'select',
          values: ['', ...sounds.sort((a, b) => a < b ? -1 : 1)],
          exportAs: 'turnStart',
          onSelect(val) {
            let a = new Audio();
            a.src = 'sounds/'+val;
            a.play();
          }
        }
      ]
    },
    {
      name: "Stats",
      exportAs: 'stats',
      items: [
        {
          name: "Health",
          type: "increment",
          description: "Increases health",
          initial: 0,
          range: [-100, 10000],
          exportAs: 'health',
        },
        {
          name: "Mana",
          type: "increment",
          description: "Increases mana",
          initial: 0,
          range: [-100, 10000],
          exportAs: 'mana',
        },
        {
          name: "Attack",
          type: "increment",
          description: "Increases damage with attacks",
          initial: 0,
          range: [-100, 100],
          exportAs: 'attack',
        },
        {
          name: "Defence",
          type: "increment",
          description: "Reduced incoming damage",
          initial: 0,
          range: [-100, 100],
          exportAs: 'defence',
        },
        {
          name: "Spell Power",
          type: "increment",
          description: "Increases power of spells",
          initial: 0,
          range: [-100, 10],
          exportAs: 'spellPower',
        },
        {
          name: "Spell Resistance",
          type: "increment",
          description: "Increases chance to resist spells",
          initial: 0,
          range: [-100, 100],
          step: 10,
          exportAs: 'spellResistance',
        },
        {
          name: "Damage",
          type: "increment",
          initial: 0,
          range: [-10, 10],
          exportAs: 'damage',
        },
        {
          name: 'Actions Per Round',
          type: 'increment',
          range: [-3, 3],
          initial: 0,
          exportAs: 'apr'
        },
        {
          name: 'Triggers Per Round',
          type: 'increment',
          range: [-5, 5],
          initial: 0,
          exportAs: 'tpr'
        },
        {
          name: "Movement",
          type: "increment",
          initial: 0,
          range: [-10, 10],
          exportAs: 'movement',
        },
        {
          name: "Initiative",
          type: "increment",
          initial: 0,
          range: [-20, 20],
          exportAs: 'initiative',
        },
        {
          name: "Range",
          type: "increment",
          initial: 0,
          range: [-10, 10],
          exportAs: 'range',
        }
      ]
    }
  ]
};

module.exports = tpl;
