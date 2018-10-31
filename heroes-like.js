var abilities = require('abilities.js');
var tpl = {
  name: "HEROES LIKE",
  folder: "monsters",
  library: 'monsters.js',
  queryCommand: 'saveMonster',
  categories: [
    {
      name: 'Name and Family',
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
          name: 'Family',
          type: 'select',
          values: ['Undead', 'Beasts', 'Humanoids'],
          initial: 'Humanoids',
          exportAs: 'family',
        },
        {
          name: 'Cost',
          type: 'input',
          initial: 10,
          exportAs: 'cost',
        },
        {
          name: 'Max Stacks',
          type: 'increment',
          initial: 1,
          range: [1, 10],
          exportAs: 'maxStacks',
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
          multiple: true,
          values: abilities.map(a => a.bio.name).sort((a, b) => a < b ? -1 : 1),
          exportAs: 'abilities'
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
          initial: 10,
          range: [1, 10000],
          exportAs: 'health',
        },
        {
          name: "Mana",
          type: "increment",
          description: "Increases mana",
          initial: 0,
          range: [0, 10000],
          exportAs: 'mana',
        },
        {
          name: "Attack",
          type: "increment",
          description: "Increases damage with attacks",
          initial: 1,
          range: [1, 100],
          exportAs: 'attack',
        },
        {
          name: "Defence",
          type: "increment",
          description: "Reduced incoming damage",
          initial: 1,
          range: [1, 100],
          exportAs: 'defence',
        },
        {
          name: "Spell Power",
          type: "increment",
          description: "Increases power of spells",
          initial: 1,
          range: [1, 10],
          exportAs: 'spellPower',
        },
        {
          name: "Spell Resistance",
          type: "increment",
          description: "Increases chance to resist spells",
          initial: 0,
          range: [0, 100],
          step: 10,
          exportAs: 'spellResitance',
        },
        {
          name: "Min Damage",
          type: "increment",
          initial: 1,
          range: [1, 50],
          exportAs: 'minDamage',
        },
        {
          name: "Max Damage",
          type: "increment",
          initial: 2,
          range: [2, 100],
          exportAs: 'maxDamage',
        },
        {
          name: "Movement",
          type: "increment",
          initial: 1,
          range: [1, 10],
          exportAs: 'movement',
        },
        {
          name: "Initiative",
          type: "increment",
          initial: 10,
          range: [1, 20],
          exportAs: 'initiative',
        },
        {
          name: "Range",
          type: "increment",
          initial: 1,
          range: [1, 10],
          exportAs: 'range',
        }
      ]
    }
  ]
};

module.exports = tpl;
