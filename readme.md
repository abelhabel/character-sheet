## Start server with

```bash
node server.js
```

Go to localhost:5000 in your browser.

Declare character sheets in new files and load them with loadFile in server.js.
Download the script with a script tag. Wait for the script to load with:

```javascript
Module.onLoad(['script name'], () => {
  const module = require('script name');
})
```

A character sheet template looks like this:

```javascript
{
  name: '',
  categories: [Category]
}

Category {
  name: '',
  exportAs: '', // name of the property you want to export it as
  pool: '', // name of the property that you want to keep track of how many points can be spent on this category
  items: [Item]
}

Item {
  name: '', // display name
  exportAs: '', // name of the property you want to export it as
  type: 'increment|input|select|spritesheet', // type of UI element
  description: "Increases health",
  initial: 10, // initial value
  range: [1, 10000], // minimum and maximum value this attribute can have,
  src: '', // name of image source for spritesheets
  w: 32, // tile width for spritesheets
  h: 32, // tile height for spritesheets
  minCharacters: 1, // minimum amount of characters an input should have
  maxCharacters: 10, // maximum amount of characters an input should have
}

```
