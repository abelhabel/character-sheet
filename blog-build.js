const Folder = require('./Folder');
const File = require('./File');
const blog = {posts: []};
let index = new File('blog', 'index.json')
let posts = new Folder('blog');
posts.read()
.then(() => {
  posts.files.sort().reverse()
  .filter(f => f.name != 'index.json')
  .forEach(f => {
    let t = f.text;
    let id = t.match(/id="([0-9A-Z-]+)"/)[1];
    let time = t.match(/datetime="([,:a-zA-Z0-9\s]+)"/)[1];
    let title = t.match(/<h2>(.+)<\/h2>/)[1].replace(/\s/g, '_');
    blog.posts.push({
      id: id,
      title: title,
      time: time,
      html: t
    })
  });
  index.write(JSON.stringify(blog));
})
.catch(e => console.log(e))
