const guid = require('guid.js');
const Component = require('Component.js');
const Canvas = require('Canvas.js');
const Sprite = require('Sprite.js');
const Terrain = require('Terrain.js');
const Team = require('Team.js');
const TeamViewer = require('TeamViewer.js');
const SoundPlayer = require('SoundPlayer.js');
const AdventureTime = require('AdventureTime.js');
const AdventureMenu = require('AdventureMenu.js');
const AdventureMessage = require('AdventureMessage.js');
const Scroll = require('Scroll.js');
const Ability = require('Ability.js');
const Quest = require('Quest.js');
const Equipment = require('Equipment.js');
const PL = require('PositionList2d.js');
const storage = require('storage.js');
const icons = require('icons.js');
const abilities = require('abilities.js');
const terrains = require('terrains.js');
const teams = require('teams.js');
const interactIcon = icons.find(i => i.bio.name == 'Interact');
const selectedIcon = icons.find(i => i.bio.name == 'Hit Background');
const deselectIcon = icons.find(i => i.bio.name == 'Stop');
const removeIcon = icons.find(i => i.bio.name == 'Delete');
const invertIcon = icons.find(i => i.bio.name == 'Invert');
const goldIcon = icons.find(i => i.bio.name == 'Gold');
const tileTargetIcon = icons.find(i => i.bio.name == 'Tile Target');
const selectSprite = new Sprite(selectedIcon.bio.sprite);
const tileTargetSprite = new Sprite(tileTargetIcon.bio.sprite);
const goldSprite = new Sprite(goldIcon.bio.sprite);
const interactSprite = new Sprite(interactIcon.bio.sprite);
class Dialog extends Component {
  constructor(text) {
    super(true);
    this.text = text || '';
  }

  static get style() {
    return html`<style>
      .dialog {
        font-family: Tahoma, sans-serif;
        padding: 10px;
        background-color: beige;
      }
    </style>`;
  }

  setText(e) {
    this.text = e.target.value;
  }

  render() {
    this.clear();
    this.addStyle(Dialog.style);
    let t = html`<div class='dialog'>
      <textarea>${this.text}</textarea>
    </div>`;
    t.querySelector('textarea').addEventListener('keyup', this.setText.bind(this))
    this.append(t);
    return this.tags.outer;
  }
}

class Layer {
  constructor(name, canvas, w, h, tw, th) {
    this.name = name;
    this.items = new PL(w, h);
    this.canvas = canvas && new Canvas(tw * w, th * h);
    this.animations = [];
  }
}

class Record {
  constructor() {
    this.adventureItemCount = 0;
    this.questFinished = false;
    this.monsterKilled = false;
    this.obstacleRemoved = false;
    this.fog = true;
  }

  compress() {
    return [this.adventureItemCount, this.questFinished, this.monsterKilled, this.obstacleRemoved, this.fog];
  }

  import(a) {
    this.adventureItemCount = a[0];
    this.questFinished = a[1];
    this.monsterKilled = a[2];
    this.obstacleRemoved = a[3];
    this.fog = a[4];
  }

  removeFog() {
    this.fog = false;
  }

  removeObstacle() {
    this.obstacleRemoved = true;
  }

  killMonster() {
    this.monsterKilled = true;
  }

  completeQuest(quest, adventure) {
    quest.takeCondition(adventure);
    quest.giveReward(adventure);
    this.questFinished = true;
  }

  shouldDraw(item) {
    if(item instanceof Terrain) {
      if(!item.adventure.consumable) return true;
      return !this.isConsumed(item);
    }
    return true;
  }

  isConsumed(terrain) {
    return this.adventureItemCount >= terrain.adventure.charges * terrain.adventure.actionAmount;
  }

  consume(terrain) {
    this.adventureItemCount += terrain.adventure.actionAmount;
  }

  resetConsumption(terrain) {
    if(terrain.adventure.chargeActivation == 'per turn') {
      this.adventureItemCount = 0;
    }
  }

  takeAdventureItems(terrain) {
    if(this.adventureItemCount >= terrain.adventure.charges * terrain.adventure.actionAmount) return [];
    let out = [];
    let max = terrain.adventure.actionAmount;
    for(let i = 0; i < max; i++) {
      out.push(terrain.adventureItem);
    }
    // this.consume(terrain);
    return out;
  }
}

class Adventure extends Component {
  constructor(w, h, tw, th) {
    super(true);
    this.id = Math.random();
    this.name = "Adventure";
    this.tw = tw || 42;
    this.th = th || 42;
    this.w = w;
    this.h = h;
    this.zoomed = true;
    this.startPosition = {x: 0, y: 0};
    this.planes = [
      this.createPlane('surface'),
      this.createPlane('underground')
    ];
    this.layers = {};
    this.setPlane('surface');

    this.resources = [

    ];
    this.tags.resources = new Component(false, 'resources');
    this.tags.time = new AdventureTime();
    this.menu = new AdventureMenu();
    this.menu.on('end turn', () => this.endTurn());
    this.menu.on('open inventory', () => this.openGridBox());
    this.menu.on('open equipment', () => this.openEquipment());
    this.menu.on('open team', () => this.openTeamSheet());
    this.menu.on('open quests', () => this.openQuests());
    this.menu.on('open crafting', () => this.openCrafting());
    this.panSpeed = 10;
    this.pans = {x: 0, y: 0};
    this.mouse = {
      up: null,
      down: null,
      move: null
    };
    this.player = null;
    this.pp = {x: 0, y: 0};
    this.sp = new SoundPlayer();
  }

  nextPlane() {
    let i = this.planes.findIndex(p => p.name == this.currentPlane.name);
    ++i;
    if(i > this.planes.length -1) i = 0;
    this.setPlane(this.planes[i].name);
    this.render();
  }

  setPlane(name) {
    this.currentPlane = this.planes.find(p => p.name == name);
    this.layers = this.currentPlane.layers;
  }

  createPlane(name) {
    let p = {
      name: name,
      layers: {
        ground: new Layer('ground', true, this.w, this.h, this.tw, this.th),
        obstacles: new Layer('obstacles', true, this.w, this.h, this.tw, this.th),
        select: new Layer('select', true, this.w, this.h, this.tw, this.th),
        grid: new Layer('grid', true, this.w, this.h, this.tw, this.th),
        preselect: new Layer('preselect', true, this.w, this.h, this.tw, this.th),
        dialog: new Layer('dialog', false, this.w, this.h, this.tw, this.th),
        monsters: new Layer('monsters', true, this.w, this.h, this.tw, this.th),
        transport: new Layer('transport', false, this.w, this.h, this.tw, this.th),
        planeport: new Layer('planeport', false, this.w, this.h, this.tw, this.th),
        fog: new Layer('fog', true, this.w, this.h, this.tw, this.th),
        quests: new Layer('quests', false, this.w, this.h, this.tw, this.th),
        history: new Layer('history', false, this.w, this.h, this.tw, this.th),
      }
    };
    p.layers.fog.items.each(i => p.layers.fog.items.set(i.x, i.y, true));
    p.layers.history.items.each(i => p.layers.history.items.set(i.x, i.y, new Record()));
    return p;
  }

  static style(a) {
    return html`<style>
      .finish-adventure {
        width: 600px;
        height: 600px;
        padding: 10px;
        background-image: url(sheet_of_old_paper.png);
        border-radius: 10px;
        position: fixed;
        z-index: 2;
        top: 50%;
        left: 50%;
        transform: translate(-50%,-50%);
      }
      .adventure {
        position: relative;
        width: ${a.tw * a.w}px;
        height: ${a.th * a.h}px;
        border: 1px solid black;
        margin-bottom: 160px;
      }
      .adventure.interactive {
        cursor: url(${interactSprite.canvas.toDataURL('image/png')}), auto;
      }
      .adventure canvas {
        position: absolute;
        top: 0px;
        left: 0px;
      }

      .quest-log {
        width: 600px;
        height: 600px;
        padding: 10px;
        background-image: url(sheet_of_old_paper.png);
        border-radius: 10px;
        position: fixed;
        z-index: 2;
        top: 50%;
        left: 50%;
        transform: translate(-50%,-50%);
      }

      .tools.selections {
        user-select: all;
      }

      #adventure-menu {
        position: fixed;
        bottom: 0px;
        left: 0px;
        width: 250px;
        height: 250px;
      }

      #adventure-menu.hidden {
        height: 20px;
      }

      #adventure-menu #show-hide {
        padding: 10px;
        background-image: url(sheet_of_old_paper.png);
        position: absolute;
        bottom: 0px;
      }

      #adventure-menu .menu-item {
        position: absolute;
        border: 4px solid #13667d;
        width: 40px;
        height: 40px;
        padding: 4px;
        border-radius: 50%;
      }

      * {
        box-sizing: border-box;
      }

      #adventure-menu .menu-item canvas {
        width: 32px;
        height: 32px;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        position: absolute;
      }

      #adventure-menu .menu-item:hover {
        background-image: url(sheet_of_old_paper.png);
      }

      #adventure-menu .center {
        width: 40%;
        height: 40%;
        border-radius: 50%;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        position: absolute;
        border: 4px solid #13667d;
      }

      #adventure-menu .texture {
        background-image: url(sheet_of_old_paper.png);
        background-blend-mode: overlay;
      }

      #adventure-menu .center.menu-item {
        width: 40px;
        height: 40px;
      }

      .inventory .inventory-dolly {
        position: absolute;
        top: -180px;
        left: 3px;
        width: 268px;
        height: 145px;
        background-image: url(sheet_of_old_paper.png);
        padding: 20px;
      }

      .inventory .inventory-dolly .dolly-slot {
        width: 42px;
        height: 46px;
        display: inline-block;
        vertical-align: top;
        text-align: center;
        margin-bottom: 10px;
      }

      .inventory .inventory-dolly .dolly-slot .slot-name {
        height: 18px;
      }

      .inventory .inventory-dolly .dolly-slot .slot-item {
        display: inline-block;
        width: 32px;
        height: 32px;
        vertical-align: top;
        box-shadow: inset 0px 0px 10px 1px rgba(121, 93, 39, 0.91);
        outline: 1px solid brown;
      }

      .inventory {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-image: url(sheet_of_old_paper.png);
        padding: 10px;
        border: 4px solid #13667d;
        box-sizing: content-box;
      }

      .inventory .inventory-instructions {
        margin-top: 30px;
        padding: 20px;
        background-image: url(sheet_of_old_paper.png);
      }

      .inventory .item {
        display: inline-block;
        vertical-align: top;
        box-shadow: inset 0px 0px 10px 1px rgba(121, 93, 39, 0.91);
        outline: 1px solid brown;
      }

      .inventory .item:hover {
        background-color: rgba(0,0,0,0.1);
      }

      .inventory .item.selected {
        background-color: rgba(0,255,0,0.3);
        outline: 1px solid white;
        box-shadow: none;
      }

      .inventory .name {
        position: absolute;
        top: -16px;
        left: 0px;
        background-image: url(sheet_of_old_paper.png);
        border-radius: 2px 2px 0px 0px;
      }
      .inventory .actions {
        position: absolute;
        bottom: -16px;
        right: 0px;
        background-image: url(sheet_of_old_paper.png);
        border-radius: 0px 0px 2px 2px;
      }
      .inventory .actions .action {
        display: inline-block;
        user-select: none;
        padding: 2px 4px;
      }
      .inventory .actions .action:hover, .inventory .inventory-dolly .dolly-slot .slot-item:hover {
        background-color: rgba(0,0,0,0.1);
      }

      .quest {
        border: 1px solid black;
        border-radius: 4px;
        padding: 2px;
      }

      .quest-name {
        font-weight: bold;
      }

      .quest-condition, .quest-reward {
        margin-right: 4px;
      }

      .close {
        position: absolute;
        top: 2px;
        right: 2px;
        color: white;
        background-color: black;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        text-align: center;
        line-height: 18px;
      }

      .foot {
        position: fixed;
        bottom: 0px;
        background-color: lightgray;
        z-index: 3;
      }

      .tools {
        user-select: none;
        display: inline-block;
        vertical-align: top;
      }

      .resources {
        position: fixed;
        top: 0px;
        left: 0px;
        display: inline-block;
        padding: 10px;
        background-image: url(sheet_of_old_paper.png);
        z-index: 10;
      }

      .time {
        position: fixed;
        top: 0px;
        right: 60px;
        display: inline-block;
        padding: 10px;
        background-image: url(sheet_of_old_paper.png);
        z-index: 10;
      }


      .resources .resource {
        display: inline-block;
      }

      .message-box {
        position: fixed;
        z-index: 100;
        width: 400px;
        height: 500px;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        background-image: url(sheet_of_old_paper.png);
        border-radius: 10px;
        box-shadow: 1px 5px 7px 0px rgba(0,0,0,0.5);
        font-size: 20px;
        border: 2px solid rgba(72, 61, 10, 0.6);
        padding: 20px;
        white-space: pre-line;
        text-align: right;
      }

      .message-box p {
        margin-top: 0px;
        text-align: justify;
        height: 320px;
        overflow-y: auto;
      }

      .message-box button {
        box-shadow: 0px 2px 4px -1px rgba(0,0,0,0.5);
        background-color: transparent;
        border: none;
        outline: none;
        padding: 10px;
        cursor: inherit;
        border-radius: 4px;
      }

      .message-box button:hover {
        background-color: rgba(0,0,0,0.1);
      }

      .team-sheet {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%,-50%);
        width: 800px;
        height: 600px;
      }
    </style>`;
  }

  static create(t) {
    let a = new this(t.w, t.h);
    a.id = t.id;
    a.name = t.name;
    a.startPosition = t.startPosition;
    a.planes = [];
    console.log(t)
    t.planes.forEach(p => {
      let plane = a.createPlane(p.name);
      a.planes.push(plane);
      let layers = p.layers;
      let ter = layers.ground.lookup.map(id => {
        let tpl = terrains.find(t => t.id == id);
        let item = new Terrain(tpl);
        return item;
      })
      layers.ground.items.forEach((n, i) => {
        let xy = plane.layers.ground.items.xy(i);
        if(n === null) return;
        let item = ter[n];
        plane.layers.ground.items.set(xy.x, xy.y, item);
      });
      ter = layers.obstacles.lookup.map(id => {
        let tpl, item;
        if(tpl = terrains.find(t => t.id == id)) {
          item = new Terrain(tpl);
        } else
        if(tpl = abilities.find(t => t.id == id)) {
          item = new Scroll(new Ability(tpl));
        } else {
          console.log('no constructor', id)
        }
        return item;
      })
      layers.obstacles.items.forEach((n, i) => {
        let xy = plane.layers.obstacles.items.xy(i);
        if(n === null) return;
        let item = ter[n];
        plane.layers.obstacles.items.set(xy.x, xy.y, item);
      });
      if(layers.monsters) {
        ter = layers.monsters.lookup.map(id => {
          let tpl = teams.find(t => t.id == id);
          let item = Team.create(tpl);
          item.aid = guid();
          return item;
        })
        layers.monsters.items.forEach((n, i) => {
          let xy = plane.layers.monsters.items.xy(i);
          if(n === null) return;
          let item = ter[n];
          plane.layers.monsters.items.set(xy.x, xy.y, item);
        });
      }
      if(layers.dialog) {
        layers.dialog.forEach(item => {
          plane.layers.dialog.items.set(item.x, item.y, new Dialog(item.item.text));
        });
      }

      if(layers.transport) {
        layers.transport.forEach(item => {
          plane.layers.transport.items.set(item.x, item.y, item.item);
        });
      }
      if(layers.planeport) {
        layers.planeport.forEach(item => {
          plane.layers.planeport.items.set(item.x, item.y, item.item);
        });
      }
      if(layers.quests) {
        layers.quests.forEach(item => {
          let q = Quest.create(item.item);
          plane.layers.quests.items.set(item.x, item.y, q);
        });
      }
    });
    a.setPlane(a.planes[0].name);
    console.log(a)
    return a;
  }

  endTurn() {
    this.tags.time.nextDay();
    let {obstacles, history} = this.layers;
    obstacles.items.each(item => {
      if(!item.item) return;
      let record = history.items.get(item.x, item.y);
      record.resetConsumption(item.item);
    })
    let saveFile = history.items.items.map(r => r.compress());
    storage.save('adventure', this.id, saveFile);
    this.savePlayer();
  }

  load() {
    let file = storage.load('adventure', this.id);
    if(!file) return;
    let history = file.data;
    history.forEach((r, i) => {
      let {x, y} = this.layers.history.items.xy(i);
      let record = this.layers.history.items.get(x, y);
      record.import(r);
    })
    this.applyHistory();
  }

  applyHistory() {
    let {obstacles, monsters, fog} = this.layers;
    this.layers.history.items.each(item => {
      if(item.item.obstacleRemoved) {
        obstacles.items.remove(item.x, item.y);
      }
      if(item.item.monsterKilled) {
        monsters.items.remove(item.x, item.y);
      }
      if(!item.item.fog) {
        fog.items.set(item.x, item.y, false);
        fog.canvas.clearRect(item.x * this.tw, item.y * this.th, this.tw, this.th);
      }
    })
  }

  openGridBox() {
    this.append(this.player.inventory.render());
  }

  openEquipment() {
    this.append(this.player.equipment.render());
  }

  openTeamSheet() {
    this.append(this.player.team.cs.render());
  }

  openQuests() {
    this.append(this.player.quests.render());
  }

  openCrafting() {
    this.append(this.player.crafting.render());
  }

  addObstacle(x, y, item) {
    let {obstacles} = this.layers;
    let empty = !obstacles.items.get(x, y) ? {x,y} : obstacles.items.closestEmpty(x, y);
    obstacles.items.set(empty.x, empty.y, item);
    this.draw(obstacles);

  }

  addPlayer(p) {
    this.player = p;
    this.movePlayer(this.startPosition.x, this.startPosition.y);
    this.player.movesLeft = this.player.movement;
    this.resources.push(new Resource('gold', this.player.gold, goldIcon));
    this.tags.time.player = this.player;
    this.layers.quests.items.filled(item => {
      let q = item.item;
      if(!q.bio.global) return;
      p.quests.add(q);
    })

    this.draw(this.layers.monsters);
  }

  savePlayer() {
    storage.save('player', this.id, {
      xp: this.player.xp,
      gold: this.player.gold,
      position: this.pp,
      vision: this.player.vision,
      movement: this.player.movement,
      movesLeft: this.player.movesLeft,
      quests: this.player.quests.quests.map(q => q.bio.name),
      inventory: this.player.inventory.export(),
      crafting: this.player.crafting.export(),
      team: this.player.team
    });
  }

  loadPlayer() {
    let save = storage.load('player', this.id);
    if(!save) return;
    let player = save.data;
    this.player.addXP(player.xp);
    this.addGold(player.gold);
    this.player.position = this.pp;
    this.player.vision = player.vision || 10;
    this.player.movement = player.movement || 20;
    this.player.movesLeft = player.movesLeft || 20;

    player.quests.forEach(questName => {
      let q = this.layers.quests.items.find(item => {
        return item.item.bio.name == questName;
      });
      if(!q) return;
      this.player.quests.add(q.item);
    });
    this.player.inventory.import(player.inventory, {Terrain, Scroll, Equipment});
    this.player.crafting.import(player.crafting, {Terrain, Scroll});
    if(player.position) {
      this.movePlayer(player.position.x, player.position.y);
      this.player.movesLeft = player.movesLeft || 20;
    }
  }

  drawGuides() {
    let c = this.layers.grid.canvas;
    this.layers.ground.items.eachRow((x, y) => {
      if(!y) return;
      c.drawLine(0, y * this.th, this.w * this.tw, y * this.th, '#ccc');
    })
    this.layers.ground.items.eachCol((x, y) => {
      if(!x) return;
      c.drawLine(x * this.tw, 0, x * this.tw, this.h * this.th, '#ccc');
    })
  }

  tpos(e) {
    let x = Math.floor(e.offsetX / this.tw);
    let y = Math.floor(e.offsetY / this.th);
    return {x, y};
  }

  drawOne(layer, x, y) {
    let item = layer.items.get(x, y);
    layer.canvas.clearRect(x, y, this.tw, this.th);
    if(!item) return;
    if(item instanceof Sprite) {
      layer.canvas.drawSprite(item, x * this.tw, y * this.th, this.tw, this.th);
    }
    if(item instanceof Terrain) {
      layer.canvas.drawSprite(item.sprite, x * this.tw, y * this.th, this.tw, this.th);
      if(item.stats.animation) {
        this.animateTerrain({item,x,y}, layer);
      }
    }
    if(item instanceof Team) {
      layer.canvas.drawSprite(item.highestTier.sprite, x * this.tw, y * this.th, this.tw, this.th);
    }
  }

  draw(layer) {
    if(!layer.canvas) return;
    layer.canvas.clear();
    this.clearAnimations(layer);
    if(!layer.items) return;
    layer.items.each(item => {
      if(!item.item) return;
      if(item.item instanceof Sprite) {
        layer.canvas.drawSprite(item.item, item.x * this.tw, item.y * this.th, this.tw, this.th);
      }
      if(item.item instanceof Terrain) {
        layer.canvas.drawSprite(item.item.sprite, item.x * this.tw, item.y * this.th, this.tw, this.th);
        if(item.item.stats.animation) {
          this.animateTerrain(item, layer);
        }
      }
      if(item.item instanceof Team) {
        layer.canvas.drawSprite(item.item.highestTier.sprite, item.x * this.tw, item.y * this.th, this.tw, this.th);
      }
      // if(item.item instanceof Scroll) {
      //   layer.canvas.drawSprite(item.item, item.x * this.tw, item.y * this.th, this.tw, this.th);
      // }
      if(layer.name == 'fog') {
        layer.canvas.drawRect(item.x * this.tw, item.y * this.th, this.tw, this.th);
      }
    });
  }

  clearAnimations(layer) {
    if(!layer.animations) return;
    layer.animations.forEach(a => {
      clearInterval(a);
    });
    layer.animations = [];
  }

  animateTerrain(item, layer) {
    layer.animations[layer.animations.length] = setInterval(() => {
      layer.canvas.clearRect(item.x * this.tw, item.y * this.th, this.tw, this.th);
      layer.canvas.drawSprite(item.item.sprite, item.x * this.tw, item.y * this.th, this.tw, this.th);
    }, item.item.fps);
  }

  previewPath(e) {
    let p = this.tpos(e);
  }

  isInteractable(x, y) {
    let {obstacles, monsters, history, quests} = this.layers;
    let obstacle = obstacles.items.get(x, y);
    let record = history.items.get(x, y);
    let monster = monsters.items.get(x, y);
    let quest = quests.items.get(x, y);
    return (obstacle && obstacle.adventure.event) || monster || quest;
  }

  mouseMove(e) {
    this.mouse.move = e;
    if(this.mouse.down && this.mouse.down.button == 2) {
      let a = this.shadow.querySelector('.adventure');
      a.style.left = this.pans.x + e.clientX - this.mouse.down.clientX + 'px';
      a.style.top = this.pans.y + e.clientY - this.mouse.down.clientY + 'px';
    }
    let p = this.tpos(e);
    if(this.isInteractable(p.x, p.y)) {
      this.shadow.querySelector('.adventure').classList.add('interactive');
    } else {
      this.shadow.querySelector('.adventure').classList.remove('interactive');
    }
    !this.moving && this.highlightMovementTile();
  }

  mouseDown(e) {
    this.mouse.down = e;
  }

  mouseUp(e) {
    e.preventDefault();
    this.mouse.up = e;
    if(this.mouse.up && this.mouse.up.button == 2) {
      this.pans.x += e.clientX - this.mouse.down.clientX;
      this.pans.y += e.clientY - this.mouse.down.clientY;
      this.panTo(this.pans.x, this.pans.y);

    }
    this.mouse.down = null;
    let mp = this.tpos(e);
    if(e.which == 3) {
      return this.showInfo(mp);
    }
    let {ground, obstacles, transport, planeport, monsters, dialog, quests, history} = this.layers;
    let item = obstacles.items.get(mp.x, mp.y);
    let record = history.items.get(mp.x, mp.y);
    // Movement
    if(ground.items.get(mp.x, mp.y) && obstacles.items.canWalkTo(this.pp.x, this.pp.y, mp.x, mp.y)) {
      let path = obstacles.items.path(this.pp.x, this.pp.y, mp.x, mp.y);
      path.shift();
      return this.walk(this.player.team, path)
      .then(() => {
      })
      .catch(e => {
        console.log('walk error', e);
      });
    }

    // Quests
    let quest = quests.items.get(mp.x, mp.y);
    if(quest && quests.items.distance(this.pp.x, this.pp.y, mp.x, mp.y) <= 1) {
      return this.showQuest(quest, record);
    }

    // Transportation
    let trans = transport.items.get(mp.x, mp.y);
    if(trans && transport.items.distance(this.pp.x, this.pp.y, mp.x, mp.y) <= 1) {
      let empty = obstacles.items.closestEmpty(trans.x, trans.y);
      this.movePlayer(empty.x, empty.y);
      this.draw(monsters);
      this.centerOnPlayer();
    }

    // Planeportation
    let planep = planeport.items.get(mp.x, mp.y);
    if(planep && planeport.items.distance(this.pp.x, this.pp.y, mp.x, mp.y) <= 1) {
      let toPlane = this.planes.find(p => p.name == planep.plane);
      console.log('planeport to', toPlane, planep);
      this.setPlane(toPlane.name);
      this.render();
      let empty = toPlane.layers.obstacles.items.closestEmpty(planep.x, planep.y);
      this.movePlayer(empty.x, empty.y);
      this.draw(monsters);
      this.centerOnPlayer();
      return;
    }

    // Interactables
    if(!item) return;
    if(item.adventure.event != 'click') return;
    if(obstacles.items.distance(this.pp.x, this.pp.y, mp.x, mp.y) > 1) return;

    this.showMessage(item, record);

    if(item.adventure.action == 'give gold') {
      this.addGold(item.adventure.actionAmount);
      this.sp.play('gold');
      obstacles.items.remove(mp.x, mp.y);
      record.removeObstacle();
    }
    if(item.adventure.action == 'give item') {
      let items = record.takeAdventureItems(item);
      items.forEach(i => {
        if(item.stats.ingredient) {
          this.player.crafting.add(i)
        } else {
          this.player.inventory.add(i)
        }
      });

      if(item.adventure.consumable && record.isConsumed(item)) {
        // obstacles.items.remove(mp.x, mp.y);
      }
    }
    if(item.adventure.action == 'give movement' && !record.isConsumed(item)) {
      this.player.movesLeft += item.adventure.actionAmount;
    }
    if(item.adventure.action == 'open tavern') {
      this.sp.play('open_book');
      this.trigger('open tavern');
    }
    if(item.adventure.action == 'open armory') {
      this.sp.play('open_book');
      this.trigger('open armory');
    }

    record.consume(item);
    if(!record.shouldDraw(item)) {
      obstacles.items.remove(mp.x, mp.y);
      record.removeObstacle();
    }
    this.mouse.down = null;
    this.updateResources();
    this.draw(obstacles);
  }

  showInfo(mp) {
    let {obstacles, transport, monsters, dialog} = this.layers;
    let item = obstacles.items.get(mp.x, mp.y);
    if(!item) return;
    if(item.adventure.description) {
      this.showDescription(item);
    }
  }

  showBattle(item, tile) {
    let m = new AdventureMessage({
      title: 'Battle',
      text: 'An adversary stands in your way. What do you want to do?',
      buttons: [
        {
          text: 'Fight',
          fn: () => {
            m.unmount();
            this.trigger('battle', item, tile);
          }
        },
        {
          text: 'Quick fight',
          fn: () => {
            console.log('QUick fight');
            m.unmount();
            this.trigger('battle', item, tile, true);
          }
        },
        {
          text: 'Close',
          fn: () => m.unmount()
        }
      ]
    });
    this.append(m.render());
  }

  showDescription(item) {
    let dtag = html`<div class='message-box'>
      <p>${item.adventure.description}</p>
      <button>Close</button>
    </div>`;
    dtag.querySelector('button').addEventListener('click', () => {
      dtag.parentNode.removeChild(dtag);
    });
    dtag.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      return false;
    })
    this.append(dtag);
    this.sp.play('open_book');
  }

  showMessage(item, record) {
    if(item.adventure.description) {
      let t, n;
      if(record.isConsumed(item)) {
        t = `${item.bio.name} can't offer anything else at this point.`;
        n = '';
      } else {
        t = item.adventure.description;
        n = `+${item.adventure.actionAmount} ${item.adventureItem.bio.name}`;
      }
      let dtag = html`<div class='message-box'>
        <p>${t}</p>
        <span>${n}</span>
        <button>Close</button>
      </div>`;
      dtag.querySelector('button').addEventListener('click', () => {
        dtag.parentNode.removeChild(dtag);
      })
      this.append(dtag);
      this.sp.play('open_book');
    }
  }

  showQuest(quest, record) {
    if(record.questFinished) {
      this.showDescription({adventure: {description: "This quest is finished."}});
    } else
    if(this.player.quests.hasQuest(quest)) {
      let met = quest.conditionMet(this);
      let dtag = html`<div class='message-box'>
        <p>
          ${quest.bio.description}
        </p>
        <button class='accept-message'>${met ? 'Complete Quest' : 'Stop Quest'}</button>
        <button class='close-message'>Close</button>
      </div>`;
      dtag.querySelector('.close-message').addEventListener('click', () => {
        dtag.parentNode.removeChild(dtag);
      });
      dtag.querySelector('.accept-message').addEventListener('click', () => {
        if(met) {
          record.completeQuest(quest, this);
          this.trigger('complete quest', quest);
          this.updateResources();
        }
        this.player.quests.remove(quest);
        dtag.parentNode.removeChild(dtag);
      });
      dtag.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        return false;
      })
      this.append(dtag);
      this.sp.play('open_book');
    } else {
      let dtag = html`<div class='message-box'>
      <p>
        ${quest.bio.description}
      </p>
      <button class='accept-message'>Accept</button>
      <button class='close-message'>Close</button>
      </div>`;
      dtag.querySelector('.close-message').addEventListener('click', () => {
        dtag.parentNode.removeChild(dtag);
      });
      dtag.querySelector('.accept-message').addEventListener('click', () => {
        dtag.parentNode.removeChild(dtag);
        this.player.quests.add(quest);
      });
      dtag.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        return false;
      })
      this.append(dtag);
      this.sp.play('open_book');

    }
  }

  addGold(n) {
    this.player.gold += n;
    let r = this.resources.find(r => r.name == 'gold');
    if(r) r.amount = this.player.gold;
  }

  updateResources() {
    this.tags.resources.clear();
    this.resources.forEach(r => this.tags.resources.append(r.render()));
    this.tags.time.render();
  }

  mouseLeave(e) {
    this.mouse.leave = e;
    this.mouse.enter = null;
  }

  mouseEnter(e) {
    this.mouse.leave = null;
    this.mouse.enter = e;
  }

  highlightMovementTile(x, y, i) {
    let mp = this.tpos(this.mouse.move);
    let {ground, monsters, obstacles, select} = this.layers;
    if(!ground.items.get(mp.x, mp.y)) return;
    select.canvas.clear();
    let path = obstacles.items.path(this.pp.x, this.pp.y, mp.x, mp.y);
    path.shift();
    let c = select.canvas;
    path.forEach((p, i) => {
      if(!this.player.movesLeft || i > this.player.movesLeft - 1) return;
      c.drawSprite(tileTargetSprite, p[0] * this.tw, p[1] * this.th, this.tw, this.th);
    });
  }

  killTeam(tile) {
    let {monsters, quests, history} = this.layers;
    let item = monsters.items.remove(tile[0], tile[1]);
    this.draw(monsters);
    let quest = quests.items.get(tile[0], tile[1]);
    let record = history.items.get(tile[0], tile[1]);
    record.killMonster();
    if(!quest) return;
    let met = quest.conditionMet(this);
    console.log('quest condition met', met, quest)
    if(met) {
      record.completeQuest(quest, this);
      this.updateResources();
      this.trigger('complete quest', quest);
    }
  }

  walk(a, path) {
    let monsters = this.layers.monsters;
    this.moving = true;
    var int;
    var done = (resolve) => {
      this.moving = false;
      clearInterval(int);
      resolve();
    };
    return new Promise((resolve, reject) => {
      int = setInterval(() => {
        let p = path.shift();
        if(!p) {
          return done(resolve);
        }
        let item = monsters.items.get(p[0], p[1]);
        if(item && item != a) {
          this.showBattle(item, p);
          return done(resolve);
        }
        this.movePlayer(p[0], p[1]);
        this.sp.play('move');
        // this.draw(monsters);
        if(!path.length) {
          done(resolve);
        }
      }, 100);

    })
  }

  movePlayer(x, y) {
    if(this.player.movesLeft < 1) return;
    let {monsters, fog} = this.layers;
    monsters.canvas.clearRect(this.pp.x * this.tw, this.pp.y * this.th, this.tw, this.th);
    monsters.items.remove(this.pp.x, this.pp.y);
    this.pp = {x, y};
    monsters.items.set(x, y, this.player.team);
    monsters.canvas.drawSprite(this.player.team.highestTier.sprite, this.pp.x * this.tw, this.pp.y * this.th, this.tw, this.th);
    let reveal = fog.items.inRadius(x, y, this.player.vision);
    reveal.forEach(item => {
      fog.items.set(item.x, item.y, false);
      fog.canvas.clearRect(item.x * this.tw, item.y * this.th, this.tw, this.th);
      let record = this.layers.history.items.get(item.x, item.y);
      record.removeFog();
    });
    this.player.movesLeft -= 1;
    this.tags.time.player && this.tags.time.render();
  }

  centerOnPlayer() {
    let left = this.pp.x * this.tw - window.innerWidth/2;
    left = Math.max(0, left);
    left = Math.min(this.w * this.tw - window.innerWidth, left);
    let top = this.pp.y * this.th - window.innerHeight/2;
    top = Math.max(0, top);
    top = Math.min(this.h * this.th - window.innerHeight, top);
    this.panTo(-left, -top);
  }

  panTo(x, y) {
    let a = this.shadow.querySelector('.adventure');
    a.style.left = x + 'px';
    a.style.top = y + 'px';
    this.pans.x = x;
    this.pans.y = y;
  }

  render() {
    this.clear();
    this.addStyle(Adventure.style(this));

    let a = html`<div class='adventure'></div>`;
    this.tags.resources.id = 'resources';
    this.append(this.tags.resources.tags.outer);
    this.append(this.tags.time.render());
    this.updateResources();
    Object.keys(this.layers).forEach(key => {
      this.layers[key]
      if(!this.layers[key].canvas) return;
      this.layers[key].canvas.canvas.id = 'canvas-' + key;
      this.layers[key].canvas.resize(this.w * this.tw, this.h * this.th);
      this.layers[key].items && this.draw(this.layers[key]);
      a.appendChild(this.layers[key].canvas.canvas);
    })
    a.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      return false;
    });
    a.addEventListener('mousemove', this.mouseMove.bind(this));
    a.addEventListener('mouseup', this.mouseUp.bind(this));
    a.addEventListener('mousedown', this.mouseDown.bind(this));
    a.addEventListener('mouseenter', this.mouseEnter.bind(this));
    a.addEventListener('mouseleave', this.mouseLeave.bind(this));
    this.append(a);
    this.append(this.menu.render());
    this.draw(this.layers.fog);
    return this.tags.outer;
  }


}

class Resource extends Component {
  constructor(name, amount, icon) {
    super();
    this.name = name;
    this.amount = amount || 0;
    this.sprite = icon instanceof Sprite ? icon : new Sprite(icon.bio.sprite);
  }

  render() {
    this.clear();
    let t = html`<div id='resource'>
      <span class='icon'></span>
      <span class='amount'>${this.amount}</span>
    </div>`;
    t.querySelector('.icon').appendChild(this.sprite.canvas);
    addToolTip(this.sprite.canvas, this.name);
    this.append(t);
    return this.tags.outer;
  }
}
Adventure.Dialog = Dialog;
Adventure.Resource = Resource;
module.exports = Adventure;
