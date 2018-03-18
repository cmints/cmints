---
title: I18n
navTitle: Overview
showDocNav: true
---

# internationalization

## {overview[Page heading] Overview}

{overview-p1[Overview paragraph] CMintS is not only providing ability to use
translation strings in the templates, but also in your [pages](), doesn't matter
whether it's a Markdown, ejs or a HTML page. Translation strings also
take care of the language specific attributes generations (ex.: hreflang for relative
links)}.

## Internaltionalization

The translation strings consist of StringId, Description and Source Text, that are placed between "{" and "}" braces:

```html
 {stringId[Description] My awesome <em>source text</em> goes here}
```

Early defined stringId in the page can be used in multiple places, that's possible by referencing to the stringId inside of the braces, ex:

```html
<p>
  {stringId[Description] My awesome <em>source text</em> goes here}
</p>
<div>
  {stringId}
<div>
```


