const HTML_ESCAPE_TEST_RE = /[<>"]/;
const HTML_ESCAPE_REPLACE_RE = /[<>"]/g;

// Ampersand, but not html entity match Regular expressions
const HTML_ESCAPE_AMP_TEST_RE = /&(?![^\s]+;)/;
const HTML_ESCAPE_AMP_REPLACE_RE = /&(?![^\s]+;)/g;

const HTML_REPLACEMENTS = {
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;"
};

function replaceUnsafeChar(ch)
{
  return HTML_REPLACEMENTS[ch];
}

function escapeHtml(str)
{
  if (HTML_ESCAPE_TEST_RE.test(str))
  {
    str = str.replace(HTML_ESCAPE_REPLACE_RE, replaceUnsafeChar);
  }
  if (HTML_ESCAPE_AMP_TEST_RE.test(str))
  {
    str = str.replace(HTML_ESCAPE_AMP_REPLACE_RE, "&amp;");
  }

  return str;
}

module.exports = (markdown) => 
{
  // Disable HTML entities map to Unicode
  markdown.disable("entity");

  markdown.renderer.rules.text = (tokens, idx) =>
  {
    return escapeHtml(tokens[idx].content);
  };
};
