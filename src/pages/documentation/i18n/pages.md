---
title: Using i18n strings in the pages
navTitle: pages
showDocNav: true
---

# Pages

In order to make a content translatable the [translation blocks](/documentation/i18n) should be used, below you can find several examples of using translation strings in different page types:

**Markdown `.md` pages:**
```html
# {about-us[Heading about us] About Us}
{about-us-p1[First paragraph of in  About Us section] My awesome <em>source text</em> goes here}
{about-us-p2[Second paragraph of in  About Us section] Another awesome <em>source text</em> goes here}
```

**HTML `.html` pages:**
```html
<h1>{about-us[Heading about us] About Us}<h1>
<p>{about-us-p1[First paragraph of in  About Us section] My awesome <em>source text</em> goes here}</p>
<p>{about-us-p2[Second paragraph of in  About Us section] Another awesome <em>source text</em> goes here}</p>
```

**EJS `.ejs` pages:** [TODO: Add a better example with the usage of variables]
```html
<h1>{about-us[Heading about us] About Us}<h1>
<p>{about-us-p1[First paragraph of in  About Us section] My awesome <em>source text</em> goes here}</p>
<p>{about-us-p2[Second paragraph of in  About Us section] Another awesome <em>source text</em> goes here}</p>
```

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

Markdown headers are automatically getting ID set to them, for the future reference and TOC generation, whenever a translation string is used as a markdown heading element text translation StringID is used as a header ID, considering the example below:

```html
# {about-us[Heading about us] About Us}
```

Actual HTML output of the markdown above will be:

```html
<h1 id="about-us">About Us</h1>
```
