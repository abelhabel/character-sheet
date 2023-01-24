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
          name: 'Clan',
          exportAs: 'clan',
          initial: 'neutral',
          type: 'input',
          minCharacters: 1,
          maxCharacters: 128,
        },
      ]
    }
  ]
};

module.exports = tpl;
