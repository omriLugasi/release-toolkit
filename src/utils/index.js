


// modify string with object and template
// modifyStringByDotNotation({ user: 'john snow' }, 'this is {{user}}') will return 'this is john snow'

exports.modifyStringByDotNotation = (object, str) => {
  return str.replace(/{{([^{}]+)}}/g, function(keyExpr, key) {
    return object[key]
  })
}
