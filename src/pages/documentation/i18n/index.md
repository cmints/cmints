---
title: Writing translation strings
navTitle: Overview
topicTitle: i18n
showDocNav: true
---

# {i18n[Heading text] internationalization}

{i18n-p1[internationalization paragraph] Internaltionalization is one of the
core features of CMintS. The idea behind is to use common structure and syntax
in content pages, themes and provide additional helpers for multilanguage
website management.}

## {locales-structure[Heading text] Locales directory structure}

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

### Defining the path

In order to use translation string from a specific path rather than defining source text in the page content, it's possible to define the file path next to the stringID:

```html
{menu-item-about(menu/header)}
```

The expression above means - use string with the ID menu-item-about from the `{locale}/menu/header.json` files:

```json
/* /en/menu/header.json */
{
  "menu-item-about": {
    "description": "Menu item label",
    "message": "about us"
  }
}
```
```json
/* /ru/menu/header.json */
{
  "menu-item-about": {
    "description": "Menu item label",
    "message": "о нас"
  }
}
```

Considering the en and ru locales above, the expression `{menu-item-about(menu/header)}`, will be converted to "about us" for the "en" locale and to the "о нас" for the "ru" locale. 

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

and the locales below:

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

Similar to the `<a>` and `<fix>` tags `<img>` tag also should keep it's order in
the translation strings, so for:

```html
{test-img1 This is <img href="/first.png"> and <img href="/second.png"> image}
```

and the locales below:

 ```json
"test-img1": {
    "description": "Test images order",
    "message": "Это <img2> картинка и <img1>"
}
```

will result into:

```html
Это <img href="/second.png"> картинка и <img href="/first.png">
```

#### title and alt attributes

Some attributes are also suppose to be translated in different languages, so
that attributes can also be used in the translation string tags:

```html
{test-attribute1 <div title="Website Logo" id="logo"><img src="/random/path" alt="Jumping puma" />Picture</div>}
```

and the locales below:

 ```json
"test-img1": {
    "description": "Test images order",
    "message": "<div1 title='Логотип сайта' id='logo'><img1 alt='Пума в прыжке'>Картинка</div1>"
}
```

will result into:

```html
<div title="Логотип сайта" id="logo"><img src="/random/path" alt="Пума в прыжке" />Картинка</div>
```
