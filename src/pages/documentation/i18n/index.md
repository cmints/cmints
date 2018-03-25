---
title: I18n
navTitle: Overview
showDocNav: true
---

# internationalization

Internaltionalization is one of the core features of CMintS. The idea behind is
to use common structure and syntax in content pages, themes and provide
additional helpers for multilanguage website management.

## Locales directory structure

Locale files should be located in the `src/locales` directory:

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

Top level directories in the `src/locales` are the locale codes.
Actual directory structure reflects the page path, so for example translations
for the `about/teams.md` [page]() translations should be located in
`/de/about/teams.json` file to be accessible through `/de/about/teams` website
path.


## Locale file

Locale files hold list of the translations strings, the translation strings
consist of stringid, message and optional description.
```json
{
  "heading-main": {
    "description": "Heading of the main page",
    "message": "Заголовок"
  },
  ...
}
```

## Translation strings

The translation strings can be defined in the source files by placing them
inside of "{" and "}" braces. Translation string consist of stringId, optional
description and source text:

```javascript
{stringId[Description] Source text}
```

So for example considering the `ru` locale in [Locale file](#locale-file) and
translation string below:

```html
{heading-main[Heading of the main page] Heading}
```

Will be converted to `Heading` for the source(default) locale and to `Заголовок`
for the russian locale.

### Using tags

Current tags `a, img, p, span, div, em, i, b, strong` can be used by default in
the translation strings, ex:

```html
{stringId[Description] My awesome <em>source text</em> goes here}
```

#### a tag

Order of the links inside of the translaton strings can be different depending
on the language, for that reason the order in the locale file string need to be
defined, so considering the translation string below:

```html
{paragraph-1 This is <a href="https//www.example1.com">first link</a>, <a href="/random1">second link</a> and <a href="/random2">third link</a>}
```

And Locale file with the translation string: 
 
 ```json
{
  "paragraph-1": {
    "description": "Paragraph with several links",
    "message": "Это <a2>вторая ссылка</a2>, <a1>первая</a1> и <a3>третья ссылка</a3>"
  },
  ...
}
```

The result will be the one below:

```html
Это <a href="/en/random1" hreflang="en">вторая ссылка</a>, <a href="https//www.example1.com">первая</a> и <a href="/en/random2" hreflang="en">третья ссылка</a>
```

**Note:** The `hreflang` attribute will be set automatically depending on
whether the relative link target is translated to the language or not.

#### fix tag

Some words do not suppose to be translated in the website(ex: brand names), for
that reason `<fix>` tag can be used:

```html
{fixed-id <fix>CMintS</fix> uses <fix>fix</fix> tag}
```

and a locales below:

 ```json
"fixed-id": {
  "message": "<fix2> тэг используется <fix1>-ом"
}
```

Will result into:

```html
fix тэг используется CMintS-ом
```

#### img tag
[to be updated]

#### title attribute
[to be updated]
