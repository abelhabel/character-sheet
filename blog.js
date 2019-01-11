const Folder = require('./Folder');
let posts = new Folder('_blog');


module.exports = {};
module.exports.html = function() {
  return posts.read()
  .then(files => {
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
          }
        </style>
      </head>
      <body>
        ${posts.text}
      </body>
    </html>`
  })
  
};
