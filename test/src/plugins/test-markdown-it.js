"use strict";

module.exports = (markdown) =>
{
  const renderText = markdown.renderer.rules.text;
  markdown.renderer.rules.text = (tokens, idx, options, self) =>
  {
    if (tokens[idx].content === "Testing markdown-it plugin")
    {
      return "Test passed";
    }
    else
    {
      return renderText(tokens, idx, options, self);
    }
  };
};
