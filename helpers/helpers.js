const isEqual = (a, b) => a === b

const or = (a, b) => a || b

const and = (a, b) => a && b

const inc = (value) => {
  return parseInt(value) + 1;
}


const json = (context) => {
  return JSON.stringify(context, null, 2); // Pretty-print JSON for readability
};

module.exports = {
  isEqual,
  or,
  and,
  inc,
  json
}
