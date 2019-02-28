const Component = require('Component.js');

class CardList extends Component {
  constructor(cards, scrolling, pageSize) {
    super();
    this.addStyle(CardList.style);
    this.addInner();
    this.cards = cards || [];
    this.page = 0;
    this.pageSize = pageSize || Math.floor((Math.min(window.innerHeight -200, 600 ) / 200) * (window.innerWidth / 180));
    this.scrolling = scrolling;
  }

  static get style() {
    return html`<style>
      .inner {
        border: none;
        outline: none;
      }
      .card-list {
        position: relative;
        width: 100%;
        overflow: hidden;
        text-align: center;
      }
      #next, #prev {
        position: absolute;
        width: 32px;
        height: 32px;
        top: 50%;
        z-index: 2;
        transform: rotate(-45deg);
      }
      #next:hover, #prev:hover {
        border-color: grey;
      }
      #next {
        border-bottom: 10px solid white;
        border-right: 10px solid white;
        right: 10px;
      }
      #prev {
        border-top: 10px solid white;
        border-left: 10px solid white;
        left: 10px;
      }
    </style>`;
  }

  add(card) {
    this.cards.push(card);
  }

  reset() {
    this.cards = [];
    this.page = 0;
  }

  get lastPage() {
    return Math.ceil(this.cards.length / this.pageSize) - 1;
  }

  setPage(page) {
    if(page < 0) page = 0;
    if((page) * this.pageSize >= this.cards.length) page = this.lastPage;
    this.page = page;
    this.render();
  }

  render() {
    this.clearInner();
    let prev = () => {
      this.setPage(this.page - 1);
    };
    let next = () => {
      this.setPage(this.page + 1);
    };

    let c = html`<div class='card-list'>
    </div>`;
    if(!this.scrolling) {
      c.appendChild(html`<div id='prev'></div>`);
      c.appendChild(html`<div id='next'></div>`);
      c.querySelector('#prev').addEventListener('click', prev);
      c.querySelector('#next').addEventListener('click', next);
    } else {
      c.addEventListener('wheel', e => {
        e.deltaY > 1 ? next() : prev();
      })
    }
    this.cards.slice(this.page * this.pageSize, (1 + this.page) * this.pageSize).forEach(card => c.appendChild(card));
    this.append(c);
    return this.shadow;
  }
}

module.exports = CardList;
