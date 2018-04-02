---
title: EJS
showDocNav: true
---

# EJS

CMintS is using [EJS](http://ejs.co/) as a templating engine for creating
layouts, EJS can also be used for the [page](/documentation/pages#ejs) creation.
EJS is a simple templating language that lets you generate HTML markup while
writing plain JavaScript. Detailed EJS syntax documentation can be found
[here](https://github.com/mde/ejs/blob/master/docs/syntax.md), also there is an
online playground, to [try out the
syntax](https://ionicabizau.github.io/ejs-playground/).

## Layout

As was mentioned in the [themes overview](/documentation/themes#layouts) in
order to decide which layout to use for the page, a Front Matter "layout"
property needs to be used, which falls back to the default layout.

Considering snippet below being `src/theme/layouts/default.ejs`:
```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" type="text/css" href="/css/main.css">
</head>
<body>
<main>
  <%- body %>
</main>
</body>
</html>
```

And snippet below being `src/pages/about.md`:
```markdown
# about
This is the about page
```

The request to the `/about` page will generate HTML below:
```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" type="text/css" href="/css/main.css">
</head>
<body>
<main>
  <h1>about</h1>
  <p>This is the about page</p>
</main>
</body>
</html>
```

But if you have another layout, which is located in
`src/theme/layouts/home.ejs`, in order to use it you would use Front Matter
ex.:

And snippet below being `src/pages/index.md`:
```markdown
---
layout: home
---

# Homepage
This page is using home.ejs layout
```

## Body

As you might have noticed from the previous example `<%- body %>` placeholder in
the layout ejs is replaced with the actual content, no matter what [page is
used(markdown, html or ejs)](/documentation/pages) actual content of the page is
being rendered and replaces the `<%- body %>` placeholder.

## partials

Partials are EJS layout files that can be loaded into the EJS layouts:

```javascript
<% include partialPath %>
<%- include('partialPath', {key: value}) %>
```

This can come handy for different layout parts separation and reuse:
```HTML
<!DOCTYPE html>
<html lang="en-US">
<head>
  <% include partials/head %>
  <% include partials/meta %>
</head>
<body>
  <% include partials/header %>
<main>
  <%- body %>
</main>
  <% include partials/footer %>
</body>
</html>
```

Considering the example above, we could for example create partial that will be
reusable accross different layouts, ex, consider `partials/head.ejs` with
content below:

```HTML
<link rel="stylesheet" type="text/css" href="/css/main.css">
<script src="/js/main.js" defer></script>
```

this snippet now can be used and loaded in the layout by just adding `<% include
partials/head %>` into the layout.

## Front Matter

As was already mentioned Front Matter is not only used for the layout selection,
but it's also possible to define page properties which can be accessed from the
layouts.

Considering a Front Matter below:

```markdown
---
title: About page
showSidebar: true
---
```

Data defined in the Front Matter is accessible from the layout files using page object:

```html
<title><%= page.title %></title>
<meta property="og:title" content="{title}">

...
</head>
<body>
...
<%if (page.showSidebar) { %>
  <% include partials/sidebar %>
<% } %>
```

## Helpers

There are also some built in helpers in CMintS that can be used out of the box.

### Current page

The <fix>currentPage</fix> variable represents the path of the URL:

```HTML
<a <%-href(item.url)%> <% if (item.url == currentPage) { %>class="active"<% } %>>
```

### Table Of Content

With the markdown pages "toc" variable in the ".ejs" layouts can be used in
order to create a Table Of Content. The "toc" variable is a tree like object
where each node corresponds to a markdown Heading containing id and title of the
heading. ID for headings are slugyfied and generated automatically. If the node
contain children, then all children nodes can be accessible by the node's
children property:

```JSON
{
  "children": [
    {
      "id": "ejs",
      "title": "EJS",
      "children": [
        {
          "id": "layout",
          "title": "Layout"
        },
        {
          "id": "body",
          "title": "Body"
        }
        ...
```

So, in order to construct a Table Of Content from that variable an EJS snippet can be used as the one below:

```javascript
<% if (items) { %>
  <ul>
    <% items.forEach(function(item){ %>
    <li>
        <% if (item.id) { %>
          <a href="#<%= item.id %>"><%= item.title %></a>
        <% } %>
        <% if (item.children) { %>
          <%- include('toc', {items: item.children}) %>
        <% } %>
    </li>
    <% }) %>
  </ul>
<% } %>
```
And the snippet can be accessed from the layout using a code below:

```javascript
<% if (items) { %>
  <ul>
    <% items.forEach(function(item){ %>
    <li>
        <% if (item.id) { %>
          <a href="#<%= item.id %>"><%= item.title %></a>
        <% } %>
        <% if (item.children) { %>
          <%- include('toc', {items: item.children}) %>
        <% } %>
    </li>
    <% }) %>
  </ul>
<% } %>
```

```javascript
<%if (page.showDocNav) { %>
  <aside id="toc">
    <h2>Table of content</h2>
    <%- include('partials/toc', {items: toc.children}) %> 
  </aside>
<% } %>
```
