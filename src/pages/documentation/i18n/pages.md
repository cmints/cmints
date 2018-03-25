---
title: Pages
showDocNav: true
---

# {intern[Header] internationalization}

  "test-anchor2": {
    "description": "Test anchor tags abosule and relative different order",
    "message": "Это <a2>вторая ссылка</a2>, <a1>первая</a1> и <a3>третья ссылка</a3>"
  },


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