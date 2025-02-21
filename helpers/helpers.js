const isEqual = (a, b) => a === b

const or = (a, b) => a || b

const and = (a, b) => a && b

const inc = (value) => {
  return parseInt(value) + 1;
}
const multiply = (a, b) => a * b

const json = (context) => {
  return JSON.stringify(context, null, 2); // Pretty-print JSON for readability
};


const formatDate = (date) => {
  if (!date) return '';
  const options = { weekday: 'short', year: 'numeric', month: 'short', day: '2-digit' };
  return new Date(date).toLocaleDateString('en-US', options);
}


const getVariantQuantity = (variants, variantId) => {
  const variant = variants.find(v => v._id.toString() === variantId.toString());
  return variant ? variant.quantityML : 'N/A';
}


const isReturnEligible = (orderDate) => {
  const now = new Date();
  const orderDateObj = new Date(orderDate);
  const diffDays = Math.floor((now - orderDateObj) / (1000 * 60 * 60 * 24));
  return diffDays <= 7; // Return allowed if within 7 days
}

module.exports = {
  isEqual,
  or,
  and,
  inc,
  json,
  formatDate,
  getVariantQuantity,
  isReturnEligible,
  multiply
}
