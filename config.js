const srcPath = "./src";
const pageDir = `${srcPath}/pages`;
const assetsDir = `${srcPath}/assets`;

const templateData =
{
  site: {
    title: "I18n CMS",
    description: "CMS with the internationalization done right"
  },
  navigations: [
      {path: "documentation", stringId: "menu-item-docs"},
      {path: "news", stringId: "menu-item-news"},
      {path: "blog", stringId: "menu-item-blog"}]
};

exports.srcPath = srcPath;
exports.pageDir = pageDir;
exports.assetsDir = assetsDir;
exports.templateData = templateData;
