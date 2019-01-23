let ailments = {
  'force': ['bruised', 'bleeding'],
  'fire': ['singed', 'scorched'],
  'water': ['wet', 'soaked'],
  'air': ['winded', 'shocked'],
  'earth': ['infected', 'brittle'],
  'vitality': ['blessed', 'sanctified'],
  'rot': ['wilted', 'blighted'],
};

module.exports = {
  random(element) {
    let rand = _roll(1, ailments[element].length);
    return ailments[element][rand-1];
  }
};
