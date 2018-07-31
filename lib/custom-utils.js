/**
 * Parse HTML tag attributes
 * @param  {String} text Text inside of the HTML tag
 * @return {Object}      Attributes Map ex.:
 *                       { href: '"/about"', class: '"highlighted button"', 
 *                       required: '' }
 */
let parseAttributes = (text) =>
{
  let attributeMap = {};
  let attribute = "";
  let value = "";
  let previouseChar = "";
  let insideValue = false;
  let quotation = null;
  for (let char of text.trim())
  {
    if (insideValue)
    {
      if (char == quotation && previouseChar != "\\")
      {
        insideValue = false;
        attributeMap[attribute] = value;
        attribute = "";
        value = "";
      }
      else
      {
        value += char;
      }
    }
    else if (previouseChar == "=" && (char == "'" || char == '"'))
    {
      insideValue = true;
      quotation = char;
    }
    else if (char == " ")
    {
      if (attribute)
      {
        attributeMap[attribute] = "";
        attribute = "";
      }
    }
    else if (char != "=")
    {
      attribute += char;
    }
    previouseChar = char;
  }
  if (attribute)
    attributeMap[attribute] = "";

  return attributeMap;
}

/**
 * Find deep nested value in the object
 * @param  {Array} attributes   Deep nested path
 * @param  {Object} obj         A deep nested object
 * @return {Object}             Returns searchable values, or null
 */
let getDeepValue = (attributes, obj) =>
{
  let attribute;
  while (attributes.length > 0)
  {
    attribute = attributes.shift()
    obj = obj[attribute];

    if (!obj)
      return null;
  }

  return obj;
};

exports.parseAttributes = parseAttributes;
exports.getDeepValue = getDeepValue;
