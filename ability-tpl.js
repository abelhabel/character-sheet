var tpl = {
  name: "Ability",
  folder: "abilities",
  library: 'abilities.js',
  queryCommand: 'saveAbility',
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
        {
          name: 'Type',
          type: 'select',
          exportAs: 'type',
          values: ['passive', 'active'],
          initial: 'active'
        },
        {
          name: 'Activation',
          type: 'select',
          values: [
            'when selected',
            'when attack hits',
            'when self is hit',
            'when adjacent ally is hit',
            'when nearby ally is hit',
            'when ally is hit',
            'when adjacent enemy is hit',
            'when nearyby enemy is hit',
            'when enemy is hit'
          ],
          initial: 'when selected',
          exportAs: 'activation'
        },
        {
          name: 'Condition',
          type: 'select',
          values: [
            '',
            'flanked'
          ],
          initial: '',
          exportAs: 'condition'
        }
      ]
    },
    {
      name: 'Stats',
      exportAs: 'stats',
      items: [
        {
          name: 'Shape',
          type: 'select',
          values: ['point', 'line', 'cone', 'circle', 'square'],
          initial: 'point',
          exportAs: 'shape'
        },
        {
          name: 'Radius',
          type: "increment",
          description: "Radius of area of effect",
          initial: 1,
          range: [1, 10],
          exportAs: 'radius',
        },
        {
          name: 'Target',
          type: 'select',
          values: ['actor', 'ground'],
          initial: 'actor',
          exportAs: 'target',
        },
        {
          name: 'Target Family',
          type: 'select',
          values: ['allies', 'enemies', 'all', 'self'],
          initial: 'all',
          exportAs: 'targetFamily'
        },
        {
          name: 'Range',
          type: 'increment',
          description: 'Range of ability',
          initial: 1,
          range: [1, 10],
          exportAs: 'range'
        },
        {
          name: 'Duration',
          type: 'increment',
          initial: 0,
          range: [0, 10],
          exportAs: 'duration'
        },
        {
          name: 'Resource Cost',
          type: 'increment',
          range: [0, 100],
          initial: 0,
          exportAs: 'resourceCost'
        },
        {
          name: 'Resource Type',
          type: 'select',
          values: ['mana', 'health'],
          initial: 'mana',
          exportAs: 'resourceType'

        },
        {
          name: 'Element',
          type: 'select',
          values: ['force', 'rot', 'vitality', 'water', 'fire', 'air', 'earth'],
          initial: 'force',
          exportAs: 'element'

        },
        {
          name: 'Effect',
          type: 'select',
          values: ['', 'lowerDefence'],
          initial: '',
          exportAs: 'effect'
        },
        {
          name: 'Multiplier',
          type: 'increment',
          range: [10, 1000],
          step: 10,
          initial: 100,
          exportAs: 'multiplier'
        },
        {
          name: 'Min Power',
          type: 'increment',
          range: [1, 100],
          initial: 1,
          exportAs: 'minPower'
        },
        {
          name: 'Max Power',
          type: 'increment',
          range: [2, 100],
          initial: 2,
          exportAs: 'maxPower'
        },
        {
          name: 'Source',
          type: 'select',
          values: ['attack', 'spell', 'curse', 'blessing'],
          initial: 'attack',
          exportAs: 'source'
        },
        {
          name: 'Attribute',
          type: 'select',
          values: ['attack', 'defence', 'spellPower', 'spellResistance', 'movement', 'initiative'],
          initial: 'attack',
          exportAs: 'attribute'
        },
        {
          name: 'Mode',
          type: 'select',
          values: ['recurring', 'static'],
          initial: 'false',
          exportAs: 'mode'
        }

      ]
    }
  ]
};

module.exports = tpl;
