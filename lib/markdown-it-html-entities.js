module.exports = (markdown, entities) => 
{
  // Disable HTML entities map to Unicode
  markdown.disable("entity");
  const defaultTextRenderer = markdown.renderer.rules.text;

  markdown.renderer.rules.text = function (tokens, idx, options, env, self)
  {
    let text = defaultTextRenderer(tokens, idx, options, env, self);
    for (const entity of entities)
    {
      // Unescape entities
      const escapedEntity = new RegExp(entity.replace("&", "&amp;"), "g");
      text = text.replace(escapedEntity, entity);
    }

    return text;
  };
};
