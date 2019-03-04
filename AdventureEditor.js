const Adventure = require('Adventure.js');
const Dialog = Adventure.Dialog;
const Component = require('Component.js');
const Canvas = require('Canvas.js');
const Sprite = require('Sprite.js');
const Terrain = require('Terrain.js');
const Team = require('Team.js');
const TeamViewer = require('TeamViewer.js');
const SoundPlayer = require('SoundPlayer.js');
const AdventureTime = require('AdventureTime.js');
const AdventureMenu = require('AdventureMenu.js');
const Ability = require('Ability.js');
const Scroll = require('Scroll.js');
const Equipment = require('Equipment.js');
const Quest = require('Quest.js');
const PL = require('PositionList2d.js');
const icons = require('icons.js');
const abilities = require('abilities.js');
const terrains = require('terrains.js');
const equipments = require('equipments.js');
const teams = require('teams.js');
const selectedIcon = icons.find(i => i.bio.name == 'Hit Background');
const deselectIcon = icons.find(i => i.bio.name == 'Stop');
const removeIcon = icons.find(i => i.bio.name == 'Delete');
const invertIcon = icons.find(i => i.bio.name == 'Invert');
const goldIcon = icons.find(i => i.bio.name == 'Gold');
const tileTargetIcon = icons.find(i => i.bio.name == 'Tile Target');
const selectSprite = new Sprite(selectedIcon.bio.sprite);
const tileTargetSprite = new Sprite(tileTargetIcon.bio.sprite);
const goldSprite = new Sprite(goldIcon.bio.sprite);
class ControlPanel extends Component {
  constructor() {
    super(true);
  }

  static get style() {
    return html`<style>
      #control-panel {
        position: fixed;
        top: 0px;
        right: 0px;
        z-index: 1;
        background-color: beige;
        padding: 5px;
        overflow-y: auto;
        height: 85%;
      }
      .control-item {
        border: 1px solid black;
        padding: 2px;
      }
    </style>`;
  }

  renderItem(item) {
    let t = html`<div class='control-item'>
    </div>`;
    if(item.g) {
      t.appendChild(item.g.canvas.clone());
    }
    if(item.o) {
      t.appendChild(item.o.canvas.clone());
    }
    if(item.m) {
      item.m.monsters.forEach(m => {
        t.appendChild(m.canvas.clone());
      })
    }
    if(item.d) {
      t.appendChild(item.d.render());
    }
    if(item.t) {
      t.appendChild(html`<div>Transports to: ${item.t.x}, ${item.t.y}</div>`);
    }
    if(item.p) {
      t.appendChild(html`<div>Planeports to: ${item.p.plane} ${item.p.x}, ${item.p.y}</div>`);
    }
    if(item.q) {
      t.appendChild(Quest.Editor.prototype.render.call(item.q));
    }
    return t;
  }

  render(layers) {
    let {select, dialog, ground, obstacles, monsters, transport, planeport, quests} = layers;
    this.clear();
    this.addStyle(ControlPanel.style);
    let c = html`<div id='control-panel'></div>`;
    let items = [];
    select.items.each(item => {
      if(!item.item) return;
      let d = dialog.items.get(item.x, item.y);
      let g = ground.items.get(item.x, item.y);
      let o = obstacles.items.get(item.x, item.y);
      let m = monsters.items.get(item.x, item.y);
      let t = transport.items.get(item.x, item.y);
      let p = planeport.items.get(item.x, item.y);
      let q = quests.items.get(item.x, item.y);
      items.push({d,g,o,m,t,p,q});
    })
    items.forEach(item => {
      let t = this.renderItem(item);
      c.appendChild(t);

    });
    this.append(c);
    return this.tags.outer;
  }
}
class AdventureEditor extends Adventure {
  constructor(w, h) {
    super(w, h, 12, 12);
    this.cp = new ControlPanel();
  }

  static create(t) {
    return Adventure.create.call(this, t);
  }

  draw(layer) {
    this.renderControlPanel();
    if(layer == this.layers.select) {
    }
    Adventure.prototype.draw.call(this, layer);
  }

  compressLayer(layer) {
    let l = [];
    let pl = new PL(layer.items.w, layer.items.h);
    layer.items.each((item, i) => {
      if(!item.item) return;
      let id = item.item.template.id;
      let index = l.indexOf(id);
      if(!~index) {
        index = l.push(id) - 1;
      }
      pl.set(item.x, item.y, index);
    })
    return {lookup: l, items: pl.items};
  }

  copy(e) {
    let selections = this.selected;
    if(selections.length !== 1) return;
    this.clipboard = selections[0];
  }

  paste(e) {
    let selections = this.selected;
    if(selections.length !== 1 || !this.clipboard) return;
    let s = selections[0];
    let c = this.clipboard;
    Object.keys(this.layers).forEach(key => {
      let layer = this.layers[key];
      let source = layer.items.get(c.x, c.y);
      layer.items.set(s.x, s.y, source);
      this.draw(layer);
    })

  }

  save() {
    let body = {
      name: this.name,
      w: this.w,
      h: this.h,
      startPosition: this.startPosition,
      planes: this.planes.map(p => {
        return {
          name: p.name,
          layers: {
            ground: this.compressLayer(p.layers.ground),
            obstacles: this.compressLayer(p.layers.obstacles),
            monsters: this.compressLayer(p.layers.monsters),
            dialog: p.layers.dialog.items._filled(),
            transport: p.layers.transport.items._filled(),
            planeport: p.layers.planeport.items._filled(),
            quests: p.layers.quests.items._filled()
          }
        };
      })
    };
    let id = this.id;
    let url = 'saveAdventure';
    if(id) {
      url += '?id=' + id;
    }
    return fetch(url, {
      method: 'POST',
      body: JSON.stringify(body)
    })
    .then(res => res.text())
    .then(id => {
      this.id = id;
      console.log('saved adventure', id)
    })
  }

  mouseDown(e) {
    if(e.button != 0) return;
    this.mouse.down = e;
  }

  mouseUp(e) {
    if(e.button != 0) return;
    this.mouse.up = e;
    let p = this.tpos(e);
    this.layers.preselect.items.set(p.x, p.y, selectSprite);
    this.select();
  }

  mouseMove(e) {
    if(!this.mouse.down) return;
    this.mouse.move = e;
    this.drawPreSelect();
  }

  deselectAll() {
    this.layers.select.items.purge();
    this.draw(this.layers.select);
    this.removeControlPanel();
  }

  invertSelection() {
    let layer = this.layers.select;
    layer.items.invert(selectSprite);
    this.draw(layer);
  }

  select() {
    let layer = this.layers.select;
    let remove = this.mouse.down.shiftKey || this.mouse.up.shiftKey;
    this.layers.preselect.items.transfer(layer.items, true, remove);
    this.shadow.querySelector('.selections').textContent = this.selected.map(i => `${i.x}:${i.y}`).join(',');
    this.draw(layer);
    this.draw(this.layers.preselect);
    this.mouse.down = null;
    this.mouse.up = null;
    this.mouse.move = null;
  }

  get selected() {
    return this.layers.select.items._filled();
  }

  drawPreSelect() {
    let layer = this.layers.preselect;
    layer.items.purge();
    layer.canvas.clear();
    let s = this.tpos(this.mouse.down);
    let e = this.tpos(this.mouse.move);
    let sx = Math.min(s.x, e.x);
    let sy = Math.min(s.y, e.y);
    let ex = Math.max(s.x, e.x);
    let ey = Math.max(s.y, e.y);
    let tiles = [];
    if(this.mouse.move.ctrlKey) {
      let r = layer.items.squareRadius(sx, sy, ex, ey);
      tiles = layer.items.inRadius(s.x, s.y, r);
    } else {
      tiles = layer.items.inRect(sx, sy, ex, ey);
    }
    tiles.forEach(t => {
      layer.items.set(t.x, t.y, selectSprite);
    })
    this.draw(layer);
  }

  applyTerrain(t, layer) {
    this.layers.select.items.each(item => {
      if(!item.item) return;
      layer.items.set(item.x, item.y, t);
    });
    this.draw(layer);
  }

  zoom(e) {
    e.preventDefault();
    this.zoomed = !this.zoomed;
    if(this.zoomed) {
      this.tw = this.th = 12;
    } else {

      this.tw = this.th = 32;
    }
    this.clear();
    this.render();
  }

  renderControlPanel() {
    // this.unmount(this.cp.tags.outer);
    this.append(this.cp.render(this.layers));
  }

  removeControlPanel() {
    this.cp.unmount();
  }

  remove(layer) {
    this.layers.select.items.each(item => {
      if(!item.item) return;
      layer.items.remove(item.x, item.y);
    });
    this.draw(layer);
  }

  setName(e) {
    this.name = e.target.value;
  }

  addDialog(e) {
    let {dialog, select} = this.layers;
    let selections = select.items._filled();
    if(selections.length != 1) return;
    let item = selections[0];
    let d = dialog.items.get(item.x, item.y) || new Dialog('Add dialog text...', true);
    dialog.items.set(item.x, item.y, d);
    this.renderControlPanel();
  }

  keyup(e) {
    if(e.key == 'Escape') {
      this.deselectAll();
    }
  }

  addMonsters() {
    let tv = new TeamViewer();
    this.append(tv.render());
    tv.on('done', team => {
      tv.unmount();
      let {monsters, select} = this.layers;
      select.items.filled(item => {
        monsters.items.set(item.x, item.y, Team.create(team));
      });
      this.draw(monsters);
    });
    tv.on('close', () => {
      tv.unmount();
    })
  }

  removeMonsters(e) {
    let {monsters} = this.layers;
    this.selected.forEach(item => {
      monsters.items.remove(item.x, item.y);
    })
    this.draw(monsters);
  }

  removeDialog(e) {
    let {dialog} = this.layers;
    this.selected.forEach(item => {
      console.log('removeDialog', item)
      dialog.items.remove(item.x, item.y);
    })
    this.draw(dialog);
  }

  addStartPosition() {
    let selected = this.selected;
    if(selected.length != 1) return;
    this.startPosition = {x: selected[0].x, y: selected[0].y};
  }

  addTransport(e) {
    let selected = this.selected;
    if(selected.length != 2) return;
    this.layers.transport.items.set(selected[1].x, selected[1].y, selected[0]);
    this.layers.transport.items.set(selected[0].x, selected[0].y, selected[1]);
    this.renderControlPanel();
  }

  removeTransport() {
    let {transport} = this.layers;
    this.selected.forEach(item => {
      transport.items.remove(item.x, item.y);
    })
    this.renderControlPanel();
    this.draw(transport);
  }

  addPlaneport(e) {
    let p1; let p2;
    this.planes.find(p => {
      let selected = p.layers.select.items._filled();
      if(selected.length != 1) return;
      if(!p1) {
       p1 = {plane: p, selected: selected[0]};
     } else {
       p2 = {plane: p, selected: selected[0]};
     }
      return p1 && p2;
    })
    if(!p1 || !p2) return;
    p1.plane.layers.planeport.items.set(p1.selected.x, p1.selected.y, {plane: p2.plane.name, x: p2.selected.x, y: p2.selected.y});
    p2.plane.layers.planeport.items.set(p2.selected.x, p2.selected.y, {plane: p1.plane.name, x: p1.selected.x, y: p1.selected.y});
    this.renderControlPanel();
  }

  removePlaneport() {
    this.planes.forEach(p => {
      let {planeport} = p.layers;
      let selected = p.layers.select.items._filled();
      selected.forEach(item => {
        planeport.items.remove(item.x, item.y);
      })
    })
    this.renderControlPanel();
  }

  addScroll(e) {
    let selected = this.selected;
    if(!selected.length) return;
    let {obstacles} = this.layers;
    let id = this.shadow.querySelector('#scroll-abilities').value;
    let a = abilities.find(a => a.id == id);
    let scroll = new Scroll(new Ability(a));
    selected.forEach(item => {
      obstacles.items.set(item.x, item.y, scroll);
    });
    this.draw(obstacles);
  }

  addEquipment(e) {
    let selected = this.selected;
    if(!selected.length) return;
    let {obstacles} = this.layers;
    let id = this.shadow.querySelector('#equipments').value;
    let a = equipments.find(a => a.id == id);
    let equipment = new Equipment(a);
    selected.forEach(item => {
      obstacles.items.set(item.x, item.y, equipment);
    });
    this.draw(obstacles);
  }

  removeQuest() {
    let {quests} = this.layers;
    this.selected.forEach(item => {
      quests.items.remove(item.x, item.y);
    })
    this.renderControlPanel();
    this.draw(quests);
  }

  addQuest(e) {
    let selected = this.selected;
    if(!selected.length) return;
    let {quests} = this.layers;
    selected.forEach(item => {
      let q = new Quest.Editor();
      quests.items.set(item.x, item.y, q);
    });
    this.draw(quests);
  }

  render() {
    this.clear();
    this.addStyle(Adventure.style(this));

    Object.keys(this.layers).forEach(key => {
      this.layers[key]
      if(!this.layers[key].canvas) return;
      this.layers[key].canvas.canvas.id = 'canvas-' + key;
      this.layers[key].canvas.resize(this.w * this.tw, this.h * this.th);
      this.layers[key].items && this.draw(this.layers[key]);
    })

    let a = html`<div class='adventure'></div>`;
    window.addEventListener('keyup', this.keyup.bind(this));
    a.addEventListener('mousedown', this.mouseDown.bind(this));
    a.addEventListener('mouseup', this.mouseUp.bind(this));
    a.addEventListener('mousemove', this.mouseMove.bind(this));
    a.addEventListener('contextmenu', this.zoom.bind(this));
    a.appendChild(this.layers.ground.canvas.canvas);
    a.appendChild(this.layers.obstacles.canvas.canvas);
    a.appendChild(this.layers.select.canvas.canvas);
    a.appendChild(this.layers.grid.canvas.canvas);
    a.appendChild(this.layers.preselect.canvas.canvas);
    a.appendChild(this.layers.monsters.canvas.canvas);

    let foot = html`<div class='foot'>
      <div class='tools' id='ground'><div>Ground</div></div>
      <div class='tools' id='obstacles'><div>Obstacles</div></div>
      <div class='tools selections'></div>
      <div class='tools' id='buttons'>
        <div>Controls</div>
        <button id='save-adventure'>Save</button>
        <input id='adventure-name' value='${this.name}'>
        <button id='switch-plane'>Switch Plane</button>
        <button id='add-dialog'>Add Dialog</button>
        <button id='remove-dialog'>Remove Dialog</button>
        <button id='add-monsters'>Add Monsters</button>
        <button id='remove-monsters'>Remove Monsters</button>
        <button id='add-start-position'>Set Start</button>
        <button id='add-transport'>Add Transport</button>
        <button id='remove-transport'>Remove Transport</button>
        <button id='add-planeport'>Add Planeport</button>
        <button id='remove-planeport'>Remove Planeport</button>
        <button id='add-scroll'>Add Scroll</button>
        <select id='scroll-abilities'></select>
        <button id='add-equipment'>Add Equipment</button>
        <select id='equipments'></select>
        <button id='add-quest'>Add Quest</button>
        <button id='remove-quest'>Remove Quest</button>
        <button id='copy'>Copy</button>
        <button id='paste'>Paste</button>
      </div>
    </div>`;

    abilities.forEach(a => {
      let o = html`<option value='${a.id}'>${a.bio.name}</option>`;
      foot.querySelector('#scroll-abilities').appendChild(o);
    });
    equipments.forEach(a => {
      let o = html`<option value='${a.id}'>${a.bio.name}</option>`;
      foot.querySelector('#equipments').appendChild(o);
    });
    foot.querySelector('#switch-plane').addEventListener('click', this.nextPlane.bind(this));
    foot.querySelector('#copy').addEventListener('click', this.copy.bind(this));
    foot.querySelector('#paste').addEventListener('click', this.paste.bind(this));
    foot.querySelector('#save-adventure').addEventListener('click', this.save.bind(this));
    foot.querySelector('#adventure-name').addEventListener('keyup', this.setName.bind(this));
    foot.querySelector('#add-dialog').addEventListener('click', this.addDialog.bind(this));
    foot.querySelector('#remove-dialog').addEventListener('click', this.removeDialog.bind(this));
    foot.querySelector('#add-monsters').addEventListener('click', this.addMonsters.bind(this));
    foot.querySelector('#remove-monsters').addEventListener('click', this.removeMonsters.bind(this));
    foot.querySelector('#add-start-position').addEventListener('click', this.addStartPosition.bind(this));
    foot.querySelector('#add-transport').addEventListener('click', this.addTransport.bind(this));
    foot.querySelector('#remove-transport').addEventListener('click', this.removeTransport.bind(this));
    foot.querySelector('#add-planeport').addEventListener('click', this.addPlaneport.bind(this));
    foot.querySelector('#remove-planeport').addEventListener('click', this.removePlaneport.bind(this));
    foot.querySelector('#add-scroll').addEventListener('click', this.addScroll.bind(this));
    foot.querySelector('#add-equipment').addEventListener('click', this.addEquipment.bind(this));
    foot.querySelector('#add-quest').addEventListener('click', this.addQuest.bind(this));
    foot.querySelector('#remove-quest').addEventListener('click', this.removeQuest.bind(this));
    let ground = foot.querySelector('#ground');
    let obstacles = foot.querySelector('#obstacles');
    terrains.forEach(tpl => {
      let t = new Terrain(tpl);
      let s = t.sprite;
      tpl.canvas = s.canvas;
      if(t.stats.walkable) {
        ground.appendChild(tpl.canvas);
        tpl.canvas.addEventListener('click', e => this.applyTerrain(t, this.layers.ground));
      } else {
        obstacles.appendChild(tpl.canvas);
        tpl.canvas.addEventListener('click', e => this.applyTerrain(t, this.layers.obstacles));
      }
    });

    let deselect = new Sprite(deselectIcon.bio.sprite);
    deselect.canvas.addEventListener('click', this.deselectAll.bind(this) );
    let removeGround = new Sprite(removeIcon.bio.sprite);
    removeGround.canvas.addEventListener('click', e => this.remove(this.layers.ground));
    let removeObstacles = new Sprite(removeIcon.bio.sprite);
    removeObstacles.canvas.addEventListener('click', e => this.remove(this.layers.obstacles));
    let invertSelection = new Sprite(invertIcon.bio.sprite);
    invertSelection.canvas.addEventListener('click', e => this.invertSelection());

    ground.appendChild(removeGround.canvas);
    obstacles.appendChild(deselect.canvas);
    obstacles.appendChild(removeObstacles.canvas);
    obstacles.appendChild(invertSelection.canvas);
    this.append(a);
    this.append(foot);
  }
}

module.exports = AdventureEditor;
