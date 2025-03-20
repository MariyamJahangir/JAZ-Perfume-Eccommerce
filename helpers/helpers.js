const moment = require('moment');


const isEqual = (a, b) => a === b

const isObjectIdEqual = (a, b) => {
  return a.toString() === b.toString();
};

const or = (a, b) => a || b

const not = (a) => !a

const and = (a, b) => a && b

const inc = (value) => {
  return parseInt(value) + 1;
}
const dec = (value) => {
  return parseInt(value) - 1;
}

const gt = (a, b) => a > b
const lt = (a, b) => a < b

const multiply = (a, b) => a * b



const json = (context) => {
  return JSON.stringify(context, null, 2); // Pretty-print JSON for readability
};


const formatDate = (date) => {
  if (!date) return '';
  const options = { weekday: 'short', year: 'numeric', month: 'short', day: '2-digit' };
  return new Date(date).toLocaleDateString('en-US', options);
}

const dateFormat = (date, format) => {
    return moment(date, "DD MMM YYYY").format(format);
}


const getVariantQuantity = (variants, variantId) => {
  const variant = variants.find(v => v._id.toString() === variantId.toString());
  return variant ? variant.quantityML : 'N/A';
}


const isReturnEligible = (deliveryDate) => {
  if (!deliveryDate) return false; // If no delivery date, return false

    const deliveredDate = new Date(deliveryDate);
    const currentDate = new Date();
    
    // Calculate the difference in days
    const diffTime = currentDate - deliveredDate;
    const diffDays = diffTime / (1000 * 60 * 60 * 24); // Convert milliseconds to days

    return diffDays >= 10; // Enable return button only if 10 or more days have passed
}

const formatAddress = (address, locality, district, state, pincode) => {
  const parts = [address, locality, district, state].filter(Boolean);
  return parts.length ? parts.join(", ") + (pincode ? ` - ${pincode}` : "") : "";
}


const range = (start, end) => {
  let arr = [];
  for (let i = start; i <= end; i++) {
      arr.push(i);
  }
  return arr;
}


const starRating = (rating) => { 
  const repeat = (char, times) => Array(times).fill(char).join("");
  return repeat("&#9733;", rating) + repeat("&#9734;", 5 - rating);
};

module.exports = {
  isEqual,
  isObjectIdEqual,
  or,
  and,
  not,
  inc,
  dec,
  gt,
  lt,
  json,
  formatDate,
  dateFormat,
  getVariantQuantity,
  isReturnEligible,
  multiply,
  formatAddress,
  range,
  starRating
}
