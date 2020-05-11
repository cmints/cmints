"use strict";

/* eslint-disable max-len */

const {promisify} = require("util");
const path = require("path");
const i18n = rootRequire("./lib/i18n");
const i18nInit = promisify(i18n.init);
const config = rootRequire("./config");
const {localesDir, pageDir, layoutsDir} = config.dirs;
const {prefix, postfix} = config.i18nOptions;

// /////////////////////////////////////////////////////////////////////////////
// //////////////////// updateDescriptionTags() ////////////////////////////////
// /////////////////////////////////////////////////////////////////////////////

const descriptionTags = [
  {
    input:
`Top level directories in the <fix><code>src/locales</code></fix> are the locale codes.
Actual directory structure reflects the page path, so for example translations
for the <fix><code>about/teams.md</code></fix> <a href="documentation/pages">page</a> translations
should be located in <fix><code>/de/about/teams.json</code></fix> file to be accessible
through <fix><code>/de/about/teams</code></fix> website path.`,
    output:
`<fix> placeholders:
<fix1> - <code>src/locales</code>
<fix2> - <code>about/teams.md</code>
<fix3> - <code>/de/about/teams.json</code>
<fix4> - <code>/de/about/teams</code>
<a> placeholders:
<a1>page</a1> - <a href="documentation/pages">page</a>
`
  }
];

describe("Test updateDescriptionTags() function", () =>
{
  for (const {input, output} of descriptionTags)
  {
    it(`Input: \n${input} \n\nShould match the output of: \n${output}`, (done) =>
    {
      const result = i18n.updateDescriptionTags(input);
      result.should.equal(output);
      done();
    });
  }
});

// /////////////////////////////////////////////////////////////////////////////
// //////////////////// generateSourceJson() ///////////////////////////////////
// /////////////////////////////////////////////////////////////////////////////

const generateSourceJsonIO = [
  {
    input:
`
  <h2 id="what-is-cmints">{what-is-cmints[Page heading] What is <fix>CMintS</fix>?}</h2>
  <p>{i18n-msg["i18n" feature text] Comprehensive internationalization out of the box.}<</p>
  <p>{tms-msg["TMS integration" feature text] Handy API to integrate your project with the Crowdin.}</p>
  <p>{cmints-ejs CMS is using <a href="http://ejs.co/">EJS</a> as a <a href="https://example.com/">templating
engine</a>}</p>
  <p>{fix-in-anchor <a href="https://google.com"><fix>CMintS</fix> inside of a tag</a>}</p>
  <p>This suppose to be ignored -> {menu-item-about(header)}</p>
`,
    output:
    {
      "what-is-cmints": {
        message: "What is <fix>CMintS</fix>?",
        description: "Page heading\n<fix> placeholders:\n<fix1> - CMintS\n"
      },
      "i18n-msg": {
        message: "Comprehensive internationalization out of the box.",
        description: "\"i18n\" feature text\n"
      },
      "tms-msg": {
        message: "Handy API to integrate your project with the Crowdin.",
        description: "\"TMS integration\" feature text\n"
      },
      "cmints-ejs": {
        message: "CMS is using <a href=\"http://ejs.co/\">EJS</a> as a <a href=\"https://example.com/\">templating\nengine</a>",
        description: "\n<a> placeholders:\n<a1>EJS</a1> - <a href=\"http://ejs.co/\">EJS</a>\n<a2>templating engine</a2> - <a href=\"https://example.com/\">templating engine</a>\n"
      },
      "fix-in-anchor": {
        message: "<a href=\"https://google.com\"><fix>CMintS</fix> inside of a tag</a>",
        description: "\n<fix> placeholders:\n<fix1> - CMintS\n<a> placeholders:\n<a1><fix>CMintS</fix> inside of a tag</a1> - <a href=\"https://google.com\"><fix>CMintS</fix> inside of a tag</a>\n"
      }
    }
  }
];

describe("Test generateSourceJson() function", () =>
{
  for (const {input, output} of generateSourceJsonIO)
  {
    it(`Input: \n${input} \n\nShould match the output of: \n${output}`, (done) =>
    {
      const result = i18n.generateSourceJson(input);
      JSON.stringify(result).should.equal(JSON.stringify(output));
      done();
    });
  }
});

// /////////////////////////////////////////////////////////////////////////////
// //////////////////// translate() ////////////////////////////////////////////
// /////////////////////////////////////////////////////////////////////////////

function translate(source, result, locale, pagePath = "index")
{
  describe(`String "${source}" at "${pagePath}" path for "${locale} locale"`, () =>
  {
    it(`Should match the output of ${result}`, (done) =>
    {
      const translation = i18n.translate(source, pagePath, locale);
      translation.should.equal(result);
      done();
    });
  });
}

const translationStrings =
[
  {
    original: "# {test-heading-1[Page Heading] My heading}",
    en: "# My heading",
    ru: "# Заголовок"
  },
  {
    original: "{test-fix <fix>CMintS</fix> uses <fix>fix</fix> tag}",
    en: "CMintS uses fix tag",
    ru: "fix тэг используется CMintS-ом"
  },
  {
    original: `{test-fix-new-line <fix>new
      line</fix> here}`,
    en: `new
      line here`,
    ru: `new
      line тут`
  },
  {
    original: '{test-anchor1 This is <a href="https//www.example1.com">first link</a> and <a href="https//www.example2.com">second link</a>}',
    en: 'This is <a href="https//www.example1.com">first link</a> and <a href="https//www.example2.com">second link</a>',
    ru: 'Это <a href="https//www.example2.com">вторая ссылка</a> и <a href="https//www.example1.com">первая</a>'
  },
  {
    original: '{test-anchor2 This is <a href="https//www.example1.com">first link</a>, <a href="/random1" class="button">second link</a> and <a href="/random2">third link</a>}',
    en: 'This is <a href="https//www.example1.com">first link</a>, <a href="/random1" hreflang="en" class="button">second link</a> and <a href="/random2" hreflang="en">third link</a>',
    ru: 'Это <a href="/random1" hreflang="en" class="button">вторая ссылка</a>, <a href="https//www.example1.com">первая</a> и <a href="/random2" hreflang="en">третья ссылка</a>'
  },
  {
    original: '{test-anchor3 <a href="/path1">Translatable hreflang</a>}',
    en: '<a href="/path1" hreflang="en">Translatable hreflang</a>',
    ru: '<a href="/ru/path1" hreflang="ru">Переведённая ссылка</a>'
  },
  {
    original: '{test-anchor3 <a href="/helpers">Empty locale</a>}',
    en: '<a href="/helpers" hreflang="en">Empty locale</a>',
    es: '<a href="/helpers" hreflang="en">Empty locale</a>'
  },
  {
    original: '{test-anchor4 <a href="/2018/10/20/permalink">Permalink</a>}',
    en: '<a href="/2018/10/20/permalink" hreflang="en">Permalink</a>',
    ru: '<a href="/ru/2018/10/20/permalink" hreflang="ru">Permalink</a>'
  },
  {
    original: '{test-anchor3 <a href="/path1?query#fragment">Translatable hreflang</a>}',
    en: '<a href="/path1?query#fragment" hreflang="en">Translatable hreflang</a>',
    ru: '<a href="/ru/path1?query#fragment" hreflang="ru">Переведённая ссылка</a>'
  },
  {
    original: '{test-anchor3 <a href="/ru/path1">Translatable hreflang</a>}',
    en: '<a href="/ru/path1" hreflang="ru">Translatable hreflang</a>',
    ru: '<a href="/ru/path1" hreflang="ru">Переведённая ссылка</a>'
  },
  {
    original: '{test-anchor3 <a href="/ru/random1">Translatable hreflang</a>}',
    en: '<a href="/random1" hreflang="en">Translatable hreflang</a>',
    ru: '<a href="/random1" hreflang="en">Переведённая ссылка</a>'
  },
  {
    original: '{test-img1 This is <img href="/first.png"> and <img href="/second.png"> image}',
    en: 'This is <img href="/first.png"> and <img href="/second.png"> image',
    ru: 'Это <img href="/second.png"> картинка и <img href="/first.png">'
  },
  {
    original: "{test-span This is <span>first span</span> and <span>second span</span>}",
    en: "This is <span>first span</span> and <span>second span</span>",
    ru: "Это <span>второй span</span> и <span>первый</span>"
  },
  {
    original: '{test-attribute1 <div title="Website Logo" id="logo"><img src="/random/path" alt="Jumping puma" />Picture</div>}',
    en: '<div title="Website Logo" id="logo"><img src="/random/path" alt="Jumping puma" />Picture</div>',
    ru: '<div title="Логотип сайта" id="logo"><img src="/random/path" alt="Пума в прыжке" />Картинка</div>'
  },
  {
    original: "{test-unsuported-tag <canvas>Unsuported i18n tag</canvas>}",
    en: "<canvas>Unsuported i18n tag</canvas>",
    ru: "&ltcanvas&gt;Неподдерживаемый i18n tag&lt/canvas&gt;"
  },
  {
    original: "{menu-item-about(header)}",
    en: "about us",
    ru: "о нас"
  },
  {
    original: "{menu-item-blog(header)}",
    en: "blog",
    ru: "blog"
  },
  {
    original: "{permalink-link Link is <a href='/helpers/another-permalink'>here</a>}",
    en: 'Link is <a href="/helpers/another-permalink" hreflang="en">here</a>',
    ru: 'ссылка <a href="/ru/helpers/another-permalink" hreflang="ru">тута</a>',
    page: "helpers/permalink"
  }
];

describe("Check translate() function", () =>
{
  for (const translationString of translationStrings)
  {
    let {page, original} = translationString;
    if (page)
      page = path.join(...(page.split("/"))); // Make page path OS independent
    const language = translationString.es ? "es" : "ru";
    translate(original, translationString[language], language, page);
    translate(original, translationString.en, "en", page);
  }
});

const translationPrefixedStrings =
[
  {
    original: "# {{test-heading-1[Page Heading] My heading}}",
    en: "# My heading",
    ru: "# Заголовок"
  },
  {
    original: "{{test-fix <fix>CMintS</fix> uses <fix>fix</fix> tag}}",
    en: "CMintS uses fix tag",
    ru: "fix тэг используется CMintS-ом"
  },
  {
    original: "{{menu-item-about(header)}}",
    en: "about us",
    ru: "о нас"
  }
];

describe("Check translate() function with a custom prefix", () =>
{
  before((done) =>
  {
    i18nInit(`${localesDir}`, [pageDir, layoutsDir], {prefix: "{{", postfix: "}}"}).then(() =>
    {
      done();
    });
  });

  for (const translationString of translationPrefixedStrings)
  {
    translate(translationString.original, translationString.ru, "ru");
    translate(translationString.original, translationString.en, "en");
  }

  after((done) =>
  {
    i18nInit(`${localesDir}`, [pageDir, layoutsDir], {prefix, postfix}).then(() =>
    {
      done();
    });
  });
});

const translationDoubleType =
[
  {
    original: '{test-anchor2 This is <a href="https//www.example1.com">first link</a>, <a href="/random1">second link</a> and <a href="/random2">third link</a>}',
    en: 'This is <a href="https//www.example1.com">first link</a>, <a href="/en/random1" hreflang="en">second link</a> and <a href="/en/random2" hreflang="en">third link</a>',
    ru: 'Это <a href="/en/random1" hreflang="en">вторая ссылка</a>, <a href="https//www.example1.com">первая</a> и <a href="/en/random2" hreflang="en">третья ссылка</a>'
  },
  {
    original: '{test-anchor3 <a href="/path1">Translatable hreflang</a>}',
    en: '<a href="/en/path1" hreflang="en">Translatable hreflang</a>',
    ru: '<a href="/ru/path1" hreflang="ru">Переведённая ссылка</a>'
  }
];

describe("Check translate() function with a custom prefix", () =>
{
  before((done) =>
  {
    i18nInit(`${localesDir}`, [pageDir, layoutsDir], {type: "Double"}).then(() =>
    {
      done();
    });
  });

  for (const translationString of translationDoubleType)
  {
    translate(translationString.original, translationString.ru, "ru");
    translate(translationString.original, translationString.en, "en");
  }

  after((done) =>
  {
    i18nInit(`${localesDir}`, [pageDir, layoutsDir], {prefix, postfix, type: "Index"}).then(() =>
    {
      done();
    });
  });
});

const root = "/cmints-website";

const rootTranslations =
[
  {
    original: '{test-anchor2 This is <a href="https//www.example1.com">first link</a>, <a href="/random1">second link</a> and <a href="/random2">third link</a>}',
    en: `This is <a href="https//www.example1.com">first link</a>, <a href="${root}/random1" hreflang="en">second link</a> and <a href="${root}/random2" hreflang="en">third link</a>`,
    ru: `Это <a href="${root}/random1" hreflang="en">вторая ссылка</a>, <a href="https//www.example1.com">первая</a> и <a href="${root}/random2" hreflang="en">третья ссылка</a>`
  },
  {
    original: '{test-anchor3 <a href="/path1">Translatable hreflang</a>}',
    en: `<a href="${root}/path1" hreflang="en">Translatable hreflang</a>`,
    ru: `<a href="${root}/ru/path1" hreflang="ru">Переведённая ссылка</a>`
  }
];

describe("Check translate() function with a custom prefix", () =>
{
  before((done) =>
  {
    i18nInit(`${localesDir}`, [pageDir, layoutsDir], {root}).then(() =>
    {
      done();
    });
  });

  for (const translationString of rootTranslations)
  {
    translate(translationString.original, translationString.ru, "ru");
    translate(translationString.original, translationString.en, "en");
  }

  after((done) =>
  {
    i18nInit(`${localesDir}`, [pageDir, layoutsDir], {root: ""}).then(() =>
    {
      done();
    });
  });
});

const rootDoubleTranslations =
[
  {
    original: '{test-anchor2 This is <a href="https//www.example1.com">first link</a>, <a href="/random1">second link</a> and <a href="/random2">third link</a>}',
    en: `This is <a href="https//www.example1.com">first link</a>, <a href="${root}/en/random1" hreflang="en">second link</a> and <a href="${root}/en/random2" hreflang="en">third link</a>`,
    ru: `Это <a href="${root}/en/random1" hreflang="en">вторая ссылка</a>, <a href="https//www.example1.com">первая</a> и <a href="${root}/en/random2" hreflang="en">третья ссылка</a>`
  },
  {
    original: '{test-anchor3 <a href="/path1">Translatable hreflang</a>}',
    en: `<a href="${root}/en/path1" hreflang="en">Translatable hreflang</a>`,
    ru: `<a href="${root}/ru/path1" hreflang="ru">Переведённая ссылка</a>`
  }
];


describe("Check translate() function with a custom prefix", () =>
{
  before((done) =>
  {
    i18nInit(`${localesDir}`, [pageDir, layoutsDir], {root, type: "Double"}).then(() =>
    {
      done();
    });
  });

  for (const translationString of rootDoubleTranslations)
  {
    translate(translationString.original, translationString.ru, "ru");
    translate(translationString.original, translationString.en, "en");
  }

  after((done) =>
  {
    i18nInit(`${localesDir}`, [pageDir, layoutsDir], {root: "", type: "Index"}).then(() =>
    {
      done();
    });
  });
});

// /////////////////////////////////////////////////////////////////////////////
// //////////////////// getLocaleFromHeader() //////////////////////////////////
// /////////////////////////////////////////////////////////////////////////////

const acceptLanguageToLocale =
[
  {
    locales: ["ru", "en"],
    acceptLanguageHeader: "en-US,en;q=0.9,ru;q=0.8,ru-RU;q=0.7,hy-AM;q=0.6,hy;q=0.5",
    result: "en"
  },
  {
    locales: ["ru", "en-GB"],
    acceptLanguageHeader: "en-US,en;q=0.9,ru;q=0.8,ru-RU;q=0.7,hy-AM;q=0.6,hy;q=0.5",
    result: "ru"
  },
  {
    locales: ["de", "en", "de"],
    acceptLanguageHeader: "en-US,en;q=0.9,ru;q=0.8,ru-RU;q=0.7,hy-AM;q=0.6,hy;q=0.5",
    result: "en"
  },
  {
    locales: ["en", "es"],
    acceptLanguageHeader: "ru;q=0.8,ru-RU;q=0.7,hy-AM;q=0.6,hy;q=0.5",
    result: "en"
  },
  {
    locales: ["en", "ru"],
    acceptLanguageHeader: "ru,en-US;q=0.9,en;q=0.8",
    result: "ru"
  }
];

describe("Check getLocaleFromHeader() function", () =>
{
  for (const {locales, acceptLanguageHeader, result} of acceptLanguageToLocale)
  {
    describe(`Page with "${locales}" and "${acceptLanguageHeader}" accept-langauge headers`, () =>
    {
      it(`Should show page for ${result} locale`, (done) =>
      {
        i18n.getLocaleFromHeader(locales, acceptLanguageHeader).should.equal(result);
        done();
      });
    });
  }
});
