let ailments = {
  'force': ['bruised', 'bleeding'],
  'fire': ['singed', 'scorched'],
  'water': ['wet', 'soaked'],
  'air': ['winded', 'shocked'],
  'earth': ['contagious', 'brittle'],
  'vitality': ['dazzled', 'blinded'],
  'rot': ['wilted', 'blighted'],
};
let vigors = {
  'vitality': ['illuminated'],
  'fire': ['engorged'],
  'earth': ['grounded'],
  'water': ['energized']
};
module.exports = {
  randomAilment(element) {
    if(!ailments[element]) return;
    let rand = _roll(1, ailments[element].length);
    return ailments[element][rand-1];
  },
  randomVigor(element) {
    if(!vigors[element]) return;
    let rand = _roll(1, vigors[element].length);
    return vigors[element][rand-1];
  }
};
