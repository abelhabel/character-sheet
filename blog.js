const blog = require('./blog/index.json');

function render(body) {
  return `<html>
    <head>
      <title>Fangalia Blog</title>
      <style>
        .blog-post {
          font-size: 16px;
          line-height: 120%;
          max-width: 800px;
          padding: 20px;
          background-color: #ccc;
          margin: auto;
          margin-bottom: 20px;
        }
        footer {
          font-style: italic;
        }
      </style>
    </head>
    <body>
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
