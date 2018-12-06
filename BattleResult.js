class BattleResult {
  constructor() {
    this.items = {
      damage: []
    };
    this.actors = {};
  }

  damage(caster, target, ability, power) {
    this.actors[caster.id] = {damageDone: 0, name: caster.bio.name, damageTaken: 0};
    this.actors[target.id] = {damageDone: 0, name: target.bio.name, damageTaken: 0};
    this.items.damage.push({caster, target, ability, power})
  }

  sort() {
    this.items.damage.forEach(item => {
      this.actors[item.caster.id].damageDone += item.power;
      this.actors[item.target.id].damageTaken += item.power;
    });
  }

  mostDamageDone() {
    return Object.keys(this.actors).map(id => this.actors[id])
    .sort((a, b) => {
      return a.damageDone > b.damageDone ? -1 : 1;
    })[0];
  }

  mostDamageTaken() {
    return Object.keys(this.actors).map(id => this.actors[id])
    .sort((a, b) => {
      return a.damageTaken > b.damageTaken ? -1 : 1;
    })[0];
  }

  popup(onClose) {
    let outer = html`<div></div>`;
    let style = html`<style>
      #outer {
        position: fixed;
        width: 400px;
        height: 400px;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        padding: 20px;
        background-color: rgba(0,0,0,0.5);
        background: url(sheet_of_old_paper_horizontal.png);
        border-radius: 10px;
        z-index: 100;
      }
      .close-popup {
        position: absolute;
        right: 20px;
        top: 20px;
        cursor: pointer;
        font-weight: bold;
      }
      td {
        width: 33%;
        text-align: center;
        border-bottom: 1px solid black;
      }
    </style>`;
    let tag = html`<div id='outer'>
      <div class='close-popup'>
        Close
      </div>
    </div>`;
    let shadow = outer.attachShadow({mode: 'open'});
    shadow.appendChild(style);
    shadow.appendChild(tag);
    tag.querySelector('.close-popup').addEventListener('click', e => {
      tag.parentNode && tag.parentNode.removeChild(tag);
      typeof onClose == 'function' && onClose();
    });
    return outer;
  }

  winningTeam(team) {
    this._winningTeam = team;
  }

  report(onClose) {
    this.sort();
    let mostDamageDone = this.mostDamageDone();
    let mostDamageTaken = this.mostDamageTaken();
    let tag = html`<table>
      <tr>
        <td>Winning Team</td>
        <td>${this._winningTeam}</td>
        <td></td>
      </tr>
      <tr>
        <td>Most Damage Done</td>
        <td>${mostDamageDone.name}</td>
        <td>${mostDamageDone.damageDone}</td>
      </tr>
      <tr>
        <td>Most Damage Taken</td>
        <td>${mostDamageTaken.name}</td>
        <td>${mostDamageTaken.damageTaken}</td>
      </tr>
    </table>`;
    let popup = this.popup(onClose);
    popup.shadowRoot.querySelector('#outer').appendChild(tag);
    return popup;
  }
}

module.exports = BattleResult;
