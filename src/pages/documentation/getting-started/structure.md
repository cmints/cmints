---
title: Project structure
navTitle: Structure
showDocNav: true
---

# Project structure

The project structure is straighforward, the website related files are located in
src folder, so this is the folder that you will use use most.
```javascript
src
├── public
├── locales
├── pages
└── theme
    ├── less
    ├── partials
    └── layouts
          ├── default.ejs
          └── home.ejs
```

## Public
Stores all the static content of the website. Good example is CSS files, Fonts,
JS, favicon, robots.txt and etc. By default CSS folder is used as the
compilation target directory for `.less` files. The content of the folder will
be copied to the *content* directory after static content generation.

## locales

