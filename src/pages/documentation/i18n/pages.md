---
title: Using i18n strings in the pages
navTitle: pages
showDocNav: true
---

# Pages

## Reusing IDs

Early defined stringId in the page can be used in multiple places, that's
possible by referencing to the stringId inside of the braces, ex:

```html
<p>
  {stringId[Description] My awesome <em>source text</em> goes here}
</p>
<div>
  {stringId}
<div>
```

## Heading IDs in markdown

CMintS
