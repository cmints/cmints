const {promisify} = require("util");
const i18n = require.main.require("lib/i18n");
const i18nInit = promisify(i18n.init);
const {srcPath} = require.main.require("config").dirs;

const pagePath = "test/index";

const translationStrings =
[
  {
    "original": '# {test-heading-1[Page Heading] My heading}',
    "en": '# My heading',
    "ru": '# Заголовок'
  },
  {
    "original": '{test-fix <fix>CMintS</fix> uses <fix>fix</fix> tag}',
    "en": 'CMintS uses fix tag',
    "ru": 'fix тэг используется CMintS-ом'
  },
  {
    "original": '{test-anchor1 This is <a href="https//www.example1.com">first link</a> and <a href="https//www.example2.com">second link</a>}',
    "en": 'This is <a href="https//www.example1.com">first link</a> and <a href="https//www.example2.com">second link</a>',
    "ru": 'Это <a href="https//www.example2.com">вторая ссылка</a> и <a href="https//www.example1.com">первая</a>'
  },
  {
    "original": '{test-anchor2 This is <a href="https//www.example1.com">first link</a>, <a href="/random1">second link</a> and <a href="/random2">third link</a>}',
    "en": 'This is <a href="https//www.example1.com">first link</a>, <a href="/random1">second link</a> and <a href="/random2">third link</a>',
    "ru": 'Это <a href="/en/random1" hreflang="en">вторая ссылка</a>, <a href="https//www.example1.com">первая</a> и <a href="/en/random2" hreflang="en">третья ссылка</a>'
  },
  {
    "original": '{test-anchor3 <a href="/test/path1">Translatable hreflang</a>}',
    "en": '<a href="/test/path1">Translatable hreflang</a>',
    "ru": '<a href="/ru/test/path1" hreflang="ru">Переведённая ссылка</a>'
  },
  {
    "original": '{test-img1 This is <img href="/first.png"> and <img href="/second.png"> image}',
    "en": 'This is <img href="/first.png"> and <img href="/second.png"> image',
    "ru": 'Это <img href="/second.png"> картинка и <img href="/first.png">'
  },
  {
    "original": '{test-span This is <span>first span</span> and <span>second span</span>}',
    "en": 'This is <span>first span</span> and <span>second span</span>',
    "ru": 'Это <span>второй span</span> и <span>первый</span>'
  },
  {
    "original": '{test-attribute1 <div title="Website Logo" id="logo"><img src="/random/path" alt="Jumping puma" />Picture</div>}',
    "en": '<div title="Website Logo" id="logo"><img src="/random/path" alt="Jumping puma" />Picture</div>',
    "ru": '<div title="Логотип сайта" id="logo"><img src="/random/path" alt="Пума в прыжке" />Картинка</div>'
  },
  {
    "original": '{test-unsuported-tag <canvas>Unsuported i18n tag</canvas>}',
    "en": '<canvas>Unsuported i18n tag</canvas>',
    "ru": '&ltcanvas&gt;Неподдерживаемый i18n tag&lt/canvas&gt;'
  },
  {
    "original": '{menu-item-about(test/header)}',
    "en": 'about us',
    "ru": 'о нас'
  },
  {
    "original": '{menu-item-blog(test/header)}',
    "en": 'blog',
    "ru": 'blog'
  }
]

describe("Check translate() function", () =>
{
  before((done) =>
  {
    i18nInit(`${srcPath}/locales`, []).then((ready) =>
    {
      if (ready)
        done();
    });
  });

  for (const translationString of translationStrings)
  {
    translate(translationString.original, translationString.ru, "ru");
    translate(translationString.original, translationString.en, "en");
  }
});

function translate(source, result, locale)
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
