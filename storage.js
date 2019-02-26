let s = {
  save(folder, name, data) {
    localStorage[`${folder}_${name}`] = JSON.stringify({
      name: name,
      date: Date.now(),
      data: data
    })
  },
  load(folder, name) {
    let d = localStorage[`${folder}_${name}`];
    if(!d) return;
    return JSON.parse(d);
  },
  loadFolder(folder) {
    let test = new RegExp('^' + folder);
    return Object.keys(localStorage)
    .filter(key => test.test(key))
    .map(key => localStorage[key]);
  }
};

module.exports = s;
