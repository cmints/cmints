---
title: Less
showDocNav: true
---

# LESS
Less is a backwards-compatible language extension for CSS. It's quite easy start
writing Less files, because it looks just like CSS. Less files are located in
src/theme/less folder and all less files that are do not have starting "_" in
the filename ex.: "_variables.less" are being compiled into the public/css
directory and assigned .css extension to a filename. ex:

Consider:
```less
/* src/theme/_variables.less */
@primary: #728448;
@secondary: #49551c;
```

And:

```less
/* src/theme/main.less */
@import "_variables.less";

a
{
  &:hover
  {
    color: @secondary;
  }
  color: @primary;
}
```

Will be converted into:
```css
/* src/public/main.css */
a {
  color: #728448;
}
a:hover {
  color: #49551c;
}
```
**Note:** That no src/public/_variables.css is generated because the file starts
with "_" sign.

To learn more about LESS visit [http://lesscss.org/](http://lesscss.org/).