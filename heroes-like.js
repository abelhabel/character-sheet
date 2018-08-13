var tpl = {
  name: "HEROES LIKE",
  categories: [
    {
      name: 'Name and Family',
      exportAs: 'nameAndFamily',
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
          maxCharacters: 10,
          exportAs: 'name',
        },
        {
          name: 'Family',
          type: 'select',
          values: ['Undead', 'Beasts', 'Humanoids'],
          initial: 'Humanoids',
          exportAs: 'family',
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
          name: "Attack",
          type: "increment",
          description: "Increases damage",
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
