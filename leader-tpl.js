var abilities = require('abilities.js');
var tpl = {
  name: "HEROES LIKE",
  folder: "leaders",
  library: 'leaders.js',
  queryCommand: 'saveLeader',
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
          name: 'Orientation',
          type: 'select',
          values: ['left', 'right'],
          initial: 'left',
          exportAs: 'orientation',
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
          values: ['Undead', 'Beasts', 'Humanoids', 'Mythical', 'Demons', 'Outlaws'],
          initial: 'Humanoids',
          exportAs: 'family',
        }

      ]
    },
    {
      name: "Stats",
      exportAs: 'stats',
      pool: 'stats',
      items: [
        {
          name: "Health",
          type: "increment",
          description: "Increases health",
          initial: 10,
          range: [1, 10000],
          exportAs: 'health',
          cost: 0.1
        },
        {
          name: "Mana",
          type: "increment",
          description: "Increases mana",
          initial: 0,
          range: [0, 10000],
          exportAs: 'mana',
          cost: 1
        },
        {
          name: "Attack",
          type: "increment",
          description: "Increases damage with attacks",
          initial: 1,
          range: [1, 100],
          exportAs: 'attack',
          cost: 0.5
        },
        {
          name: "Defence",
          type: "increment",
          description: "Reduced incoming damage",
          initial: 1,
          range: [1, 100],
          exportAs: 'defence',
          cost: 0.5
        },
        {
          name: "Spell Power",
          type: "increment",
          description: "Increases power of spells",
          initial: 1,
          range: [1, 10],
          exportAs: 'spellPower',
          cost: 1
        },
        {
          name: "Spell Resistance",
          type: "increment",
          description: "Increases chance to resist spells",
          initial: 0,
          range: [0, 100],
          step: 10,
          exportAs: 'spellResistance',
          cost: 2
        },
        {
          name: "Damage",
          type: "increment",
          initial: 0,
          range: [0, 50],
          exportAs: 'damage',
          cost: 5
        },
        {
          name: 'Actions Per Round',
          type: 'increment',
          range: [1, 3],
          initial: 1,
          exportAs: 'apr',
          cost: 10
        },
        {
          name: 'Triggers Per Round',
          type: 'increment',
          range: [1, 5],
          initial: 1,
          exportAs: 'tpr',
          cost: 5
        },
        {
          name: "Movement",
          type: "increment",
          initial: 3,
          range: [0, 10],
          exportAs: 'movement',
          cost: 3
        },
        {
          name: "Initiative",
          type: "increment",
          initial: 10,
          range: [1, 20],
          exportAs: 'initiative',
          cost: 1
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
