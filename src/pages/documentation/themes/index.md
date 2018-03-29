---
title: Themes
navTitle: Overview
topicTitle: Themes
showDocNav: true
---

# Themes directory

```bash
src
└── theme
    ├── layouts
    │   ├── default.ejs
    │   └── home.ejs
    ├── less
    │   ├── _footer.less
    │   ├── _header.less
    │   ├── _sidebars.less
    │   ├── _variables.less
    │   ├── index.less
    │   ├── main.less
    └── partials
        ├── footer.ejs
        └── header.ejs
```

Themes directory is the place where website layout and less files reside.
CMintS uses EJS as a templating language and LESS as a CSS Preprocessor.

## Layouts

Layouts folder holds different layouts for the website, in some cases you would like to use diffrent layouts for the different pages, ex.: Homepage may contain more complex layout rather than the documentations page and Blog page can have a different layout in same website, for that reason you can define layout for each page type and select them from actual page using Front Matter.

## Less
