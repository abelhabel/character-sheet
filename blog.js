const blog = require('./blog/index.json');

function render(body) {
  return `<html>
    <head>
      <title>Fangalia Blog</title>
      <style>
        html, body {
          font-family: Tahoma, sans serif;
        }
        .blog-post {
          font-size: 16px;
          line-height: 120%;
          max-width: 800px;
          padding: 20px;
          background-color: #ccc;
          margin: auto;
          margin-bottom: 20px;
        }
        header {
          background-color: cornflowerblue;

        }
        article header {
          background-color: transparent;

        }
        header a {
          float: right;
        }
        article header a {
          float: none;
        }
        footer {
          font-style: italic;
        }
      </style>
    </head>
    <body>
      <header>
        <h2>
          Fangalia blog
          <a href='/battle.html'>Play the game</a>
        </h2>
      </header>
      ${body}
    </body>
  </html>`
}
module.exports = {};
module.exports.html = function() {
  return render(blog.posts.map(p => p.html).join(''));

};

module.exports.get = function(title) {
  let post = blog.posts.find(p => p.title == title);
  if(!post) return;
  return render(post.html);
};

module.exports.jsonFeed = function() {
  let items = blog.posts.map(p =>  {
    return {
      id: p.title,
      content_html: p.html,
      url: 'https://fangalia.xyz/blog/' + p.title
    };
  })
  return `{
    "version": "https://jsonfeed.org/version/1",
    "title": "Fangalia blog",
    "home_page_url": "http://fangalia.xyz/blog",
    "feed_url": "http://fangalia.xyz/blog/feed",
    "items": ${items.map(i => JSON.stringify(i))}
  }`
}
