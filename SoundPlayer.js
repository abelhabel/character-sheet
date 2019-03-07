class SoundPlayer {
  constructor() {
    this.volume = 0.3;
    this.noSound = false;
    this.sounds = {
      spell: 'spell.wav',
      battle_begin: 'battle_begin.wav',
      move: 'move.wav',
      death: 'death.wav',
      victory: 'victory.wav',
      attack: 'attack.wav',
      blessing: 'blessing.wav',
      curse: 'curse.wav',
      open_book: 'open_book.wav',
      gold: 'gold.wav',
      inventory_place: 'inventory_place.wav',
      inventory_pick: 'inventory_pick.wav',
      quest_complete: 'quest_complete.wav',
      grass_theme: 'grass_theme.mp3',
      park: 'park_1.mp3',
      lobby_theme: 'lobby_theme.mp3'
    };
    this.audio = {};
  }

  mute() {
    this.volume = 0;
  }

  dontPlay() {
    this.noSound = true;
  }

  updateVolume(v) {
    console.log('updating sound Volume', v)
    this.volume = v;
    Object.keys(this.audio).forEach(key => {
      this.audio[key].volume = this.volume;
    })
  }

  fadeOut(name) {
    let src = this.sounds[name];
    let a = this.audio[src];
    if(!a) return;
    if(a.paused) return;
    let int = setInterval(() => {
      let v = a.volume /1.1;
      a.volume = v;
      if(a.volume < 0.01) {
        clearInterval(int);
        a.pause();
      }
    }, 100);


  }

  fadeIn(name) {
    let src = this.sounds[name];
    let a = this.audio[src];
    if(!a) return;
    if(a.paused) return;
    a.volume = 0.01;
    let int = setInterval(() => {
      let v = a.volume * 1.1;
      a.volume = v;
      if(a.volume > this.volume) {
        clearInterval(int);
      }
    }, 100);


  }

  play(event, sounds = {}, preventDefault = false) {
    if(this.noSound) return;
    let src = (sounds && sounds[event]) || (!preventDefault && this.sounds[event]);
    if(!src) return;
    let a = this.audio[src] || new Audio();
    this.audio[src] = a;
    if(!this.audio[src].paused) {
      let end = () => {
        this.play(event, sounds, preventDefault);
        this.audio[src].removeEventListener('ended', end);
      }
      this.audio[src].addEventListener('ended', end);
      return;
    }
    a.src = 'sounds/' + src;
    a.volume = this.volume;
    a.play()
    .catch(e => console.log(e));
    return a;
  }
}

module.exports = SoundPlayer;
