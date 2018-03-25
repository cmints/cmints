---
title: Project structure
navTitle: Structure
showDocNav: true
---

# Project structure

The project structure is straighforward, the website related files are located
in src folder, so this is the folder that you will use most.
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
Holds pages and themes language specific data in `.json` format for each locale:
```bash
├── de
│   ├── about.json
│   └── news.json
├── en
│   ├── about.json
│   ├── header.json
│   └── news.json
└── ru
    ├── about
    │   └── team.json
    ├── about.json
    ├── documentation
    │   ├── getting-started
    │   │   └── configuration.json
    │   └── i18n
    │       └── index.json
    ├── header.json
    ├── index.json
    └── news.json
```
The folder names should reflect the `locales` value, set in the configuration
file. `.json` reflect the path to the page, similar to the structure inside of
the `pages` directory. [See]() for more information about the i18n files.

## pages
Actual content of the website goes here and the structure reflects the path to
the page with `index` files points to the actual directory:

```bash
├── about
│   └── team.md
├── about.md
├── documentation
│   ├── getting-started
│   │   ├── configuration.md
│   │   ├── index.md
│   │   └── structure.md
│   └── i18n
│       ├── index.md
│       └── markdown.md
├── index.ejs
└── news.md
```

Supported page content files are:
extention | Descriptio
--- | ---
`.md` | Markdown files, use [CommonMark](http://commonmark.org/) to create markdown content. Learn more about writing markdown in CMintS [here](/documentation/pages/markdown).
`.ejs` | For more robust pages you can use [EJS](http://ejs.co/) for creating a complex page content. Learn more about creating ejs pages in CMintS [here](/documentation/pages/ejs).
`.html` | HTML files

## theme
Actual theme of the project, main folders are [layout]() where actual website
layouts reside and [less]() folder which holds website less files which are
compiled into the css folder of the [public]() directory:
```bash
├── layouts
│   ├── default.ejs
│   └── home.ejs
├── less
│   ├── _fonts.less
│   ├── _footer.less
│   ├── _grid.less
│   ├── index.less
│   └── main.less
│
└── partials
    ├── footer.ejs
    └── header.ejs
```