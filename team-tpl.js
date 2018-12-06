function sortAlphabetically(a, b) {
  return a < b ? -1 : 1;
}
const monsters = require('monsters.js');
var tpl = {
  name: "Team",
  folder: "teams",
  library: 'teams.js',
  queryCommand: 'saveTeam',
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
          name: 'Monsters',
          type: 'multiselect',
          exportAs: 'monsters',
          values: monsters.map(m => m.bio.name).sort(sortAlphabetically)
        }
      ]
    }
  ]
};

module.exports = tpl;
