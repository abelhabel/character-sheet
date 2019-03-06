const Component = require('Component.js');

class AdventureHelp extends Component {
  constructor() {
    super(true);
  }

  render() {
    this.clear();
    this.tags.outer.classList.add('big-popup');
    let t = html`<div>
      <style>
        .close {
          background-color: black;
          width: 32px;
          height: 32px;
          line-height: 32px;
          text-align: center;
          position: absolute;
          top: 10px;
          right: 10px;
          color: white;
          border-radius: 50%;
        }
      </style>
      <div class='close'>X</div>
      <section>
        <h3>Movement</h3>
        <p>
          You can move your avatar around the adventure map by clicking on
          a walkable tile on the adventure. When moving your mouse, you will
          see a preview of what path your avatar will move through.
        </p>
        <p>
          Certain tiles, like trees, can not be walked on or through. If your
          movement path goes through a monster, your movement will be interupted
          as soon as you walk on to the monster.
        </p>
        <p>
          Movement is done in turns and you only have a limited number of moves per turn.
          Moving one tile on the adventure map reduces your remaining movements this turn by one.
          Once all movement points has been spent, click the 'end turn' button at the bottom
          left radial menu.
        </p>
      </section>
      <section>
        <h3>Combat</h3>
        <p>
          When you move on to a tile that is occupied by a monster, combat will ensue.
        </p>
        <p>
          Combat happens in a separate game mode, where you first get to place your
          team units on your side of the battle field, then use tactical turn base
          combat to defeat the enemy team.
        </p>
        <p>
          If you win a battle, those monsters are removed from the adventure and you can now
          walk on to the tile they previously occupied. Winning a battle also rewards you with
          experience that you can use to level up your Leader.
        </p>
        <p>
          If you lose a battle, your adventure will end. You can either start a new adventure
          or load a previous save.
        </p>
      </section>
      <section>
        <h3>Interactable Objects</h3>
        <p>
          There are many type of objects that you can interact with on the adventure map.
          This will be indicated by the mouse cursor that turns into a hand icon. Examples
          of interactable objects are: quests, spell scrolls, ingredients, NPCs, portals.
        </p>
        <p>
          Some interactable objects will prompt a description and sometimes a choice of actions
          is presented. Other times the object will be removed from the adventure map and be
          placed in its appropriate place, like clicking on an ingredient  that will place
          the ingredient in your Crafting window.
        </p>
      </section>
      <section>
        <h3>Gold</h3>
        <p>
          Gold can be found through out an adventure by clicking on Treasure Chests, or completing quests.
          Gold is a resource that you can spend on various things, such as buying more monsters, buying equipment
          or completing quests.
        </p>
        <p>
          Gold that you currently own can be found in the resource bar at the top left of the screen.
        </p>
      </section>
      <section>
        <h3>Inventory</h3>
        <p>
          Your inventory shows all items that you have picked up on the adventure map or been given as
          a reward for a quest. Items that can be found in your inventory include: Equipment, Scrolls,
          Ability Glyphs, Potions, miscellaneous items (keys, quest items etc).
        </p>
        <p>
          The inventory window also displays the Prime Vessel. An Ability crafting device. More information
          about this device can be found further down.
        </p>
        <p>
          The inventory can be opened by clicking the 'open inventory' button at the bottom left radial menu.
        </p>
      </section>
      <section>
        <h3>Equipment</h3>
        <p>
          Some items, equipment, can be equipped on your leader. Each piece of equipment has an
          equipment slot associated with it, ie a Shield can only be equipped in the hand slot,
          a ring can only be equipped in the finger slot etc etc. Some items, like the Crossbow,
          takes up two slots, so equipping such an item will remove any item that is currently equipped
          in that slot.
        </p>
        <p>
          Equipment that is equipped, ie are placed in an equipment slot, gives bonuses to your
          leader and all bonuses from equipped items stack with each other. This means that if
          you have a ring equipped that gives a bonus of +2 to Mana, and a body armor that gives
          a bonus of +3 to Mana, the total Mana bonus your Leader gets is +5.
        </p>
        <p>
          Some equipment gives access to an Ability when equipped. Unequipping such an item also
          removes the Ability it provides. In other words, the Ability can only be used by your Leader
          if the item is equipped.
        </p>
        <p>
          To equip an item, select it in your inventory, then click the corresponding slot above the
          inventory grid. The item will move from the inventory grid to the equipment slot.
        </p>
      </section>
      <section>
        <h3>Scrolls</h3>
        <p>
          A scroll can teach your Leader or a monster in your team a new Ability. Once an Ability
          has been learned, that Leader or monster has learned it permanently.
        </p>
        <p>
          To learn the Ability a scroll provides, select the scroll in your inventory grid and click the 'use'
          button at the bottom right of the inventory grid. The scroll is then consumed and is removed
          from your inventory.
        </p>
      </section>
      <section>
        <h3>Potions</h3>
        <p>
          A potion can teach you new Abilities, provide effects or be required to complete certain quests.
        </p>
        <p>
          To use a potion, select the potion in your inventory grid and click the 'use'
          button at the bottom right of the inventory grid.
        </p>
      </section>
      <section>
        <h3>Miscellaneous items</h3>
        <p>
          Miscellaneous items have no use of their own but are instead used to complete quests.
        </p>
        <p>
          These items has not use when clicking the 'use' button in the inventory.
        </p>
      </section>
      <section>
        <h3>Prime Vessel</h3>
        <p>
          The Prime Vessel lets you craft custom Abilities. In order to craft an Ability,
          you need to have the appropriate Ability Glyphs in your inventory. The Prime Vessel
          is displayed to the right of the inventory grid while your inventory is open.
        </p>
        <p>
          There are six types of Ability Glyphs:
          <ul>
            <li>Phaal: Controls the Power of the Ability (low, medium, high)</li>
            <li>Daiko: Controls the Range of the Ability (melee, short, medium, long)</li>
            <li>Aou: Controls the Shape of the Ability (point, line, cone, circle, square)</li>
            <li>Mirr: Controls the Element of the Ability (force, water, fire, air, earth, vitality, rot)</li>
            <li>Qhe: Controls the Source of the Ability (attack, spell, blessing, curse)</li>
            <li>Leht: Controls the Duration of the Ability (short, medium, long)</li>
          </ul>
        </p>
        <p>
          The Leht Glyph is the only Glyph that is not required to craft an Ability. Ie, to craft
          an Ability you need all other Glyphs.
        </p>
        <p>
          To craft an Ability, click on one of the Glyph slots and select one Glyph. The available glyphs
          are displayed in the middle of the Prime Vessel. Only the corresponding Glyphs will be selectable,
          ie clicking on the Power slot will only show Phaal Glyphs. Once you have selected a Glyph for each
          required Glyph slot, click the center button. The Glyphs will be removed both from the Prime Vessel
          and from your inventory. You Leader will automatically learn the Ability and you can see it by
          opening the team view, ie click the 'open team' button in the bottom left radial menu.
        </p>
      </section>
      <section>
        <h3>Leveling up</h3>
        <p>
          A Leader can level up as it gains experience points. Leveling up a Leader is done by
          increasing the stats of a leader in the team view window. A Leader gets 1 stat point for every
          10 experience points. Experience points are gained by killing monsters are completing quests.
        </p>
        <p>
          To assign stat points to your leader, open the team view window by clicking the 'open team' button
          in the bottom left radial menu. From the list of your team members, click on your leader and its
          character sheet will be displayed below it. To the left will be displayed the stat points window
          where you can assign stat points.
        </p>
        <p>
          If your leader has more than zero points to spend you can click the plus icon next to a stat to increase it.
          Once you have clicked to increase a stat you can undo it by clicking the subtract button. To apply the points
          to your Leader, click the Confirm button. Once you confirm you cannot undo the spent point any longer, and your
          Leader's character sheet will udate with the new stats.
        </p>
        <p>
          Different stats has different costs. For example, increasing the Attack stat with +1 costs 1 point, where as
          spending 1 point on the Health stat gives you +2 to Health, increasing the Actions Per Turn stat, costs 10 points.
        </p>
      </section>
    </div>`;
    t.querySelector('.close').addEventListener('click', e => this.unmount());
    this.append(t);
    return this.tags.outer;
  }
}

module.exports = AdventureHelp;
