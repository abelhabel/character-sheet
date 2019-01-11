const teams = require('teams.js');
const Sprite = require('Sprite.js');
const templates = require('monsters.js');
class TeamViewer {
  constructor(title) {
    this.title = title || 'Pick Team';
    this.events = {};
  }

  on(event, fn) {
    if(!this.events[event]) this.events[event] = [];
    this.events[event].push(fn);
  }

  trigger(event) {
    if(!Array.isArray(this.events[event])) return;
    this.events[event].forEach(fn => fn.apply(null, Array.from(arguments).splice(1)));
  }

  render(container) {
    let selected;
    let style = html`<style>
      .outer {
        color: black;
        border: 1px solid black;
        position: absolute;
        width: 600px;
        height: 600px;
        left: 50%;
        top:50%;
        transform:translate(-50%,-50%);
        z-index:2000;
      }
      .title {
        font-size:24px;
      }
      #close-team-select {
        position: absolute;
        top: 10px;
        right: 10px;
        font-weight: bold;
      }
    </style>`;
    let c = html`<div class='outer'>
      <div id='close-team-select'style=''>Close</div>
      <div class='title'>${this.title}</div>
    </div>`;
    let o = html`<span></span>`;
    let shadow = o.attachShadow({mode: 'open'});
    shadow.appendChild(style);
    shadow.appendChild(c);
    teams.forEach(t => {
      let d = html`<div><p>${t.name}</p></div>`;
      t.units.forEach(u => {
        let tpl = templates.find(tp => tp.id == u.templateId);
        let s = new Sprite(tpl.bio.sprite);
        s.drawStack(u.stacks);
        d.appendChild(s.canvas);
      })
      d.addEventListener('click', e => {
        container.removeChild(o);
        this.trigger('done', t);
      });
      c.appendChild(d);
    })
    c.querySelector('#close-team-select').addEventListener('click', e => container.removeChild(o));
    container.appendChild(o);

  }
}

module.exports = TeamViewer;
