---
title: Configuration
showDocNav: true
---

# {config[Header] Configuration}

config.js in the root is where you can find all various website configurations:

```javascript
const templateData =
{
  site: {
    title: "I18n CMS",
    description: "CMS with the internationalization in mind"
  },
  navigations: [
      {path: "documentation", stringId: "menu-item-docs"},
      {path: "news", stringId: "menu-item-news"},
      {path: "blog", stringId: "menu-item-blog"}]
};

// See https://markdown-it.github.io/markdown-it/#MarkdownIt.new
const markdownOptions =
{
  html:         true,
  xhtmlOut:     false,
  breaks:       false,
  langPrefix:   'language-',
  linkify:      false,
  typographer:  false,
  quotes: '“”‘’',
  highlight(str, lang)
  {
    return (lang && getLanguage(lang)) ? highlight(lang, str).value : "";
  }
};
```

## templateData

*templateData* object holds the data which are passed to the ejs template. So you
can directly access the values of the that object by simply refferencing them from the .ejs file:

```javascript
<% for (let navigation of navigations) { %>
  <li>
    <a <%-href(navigation.path)%>
      <% if (navigation.path == currentPage) { %>class="active"<% } %>>
      {<%-navigation.stringId%>(header)}
    </a>
  </li>
<% } %>
```

