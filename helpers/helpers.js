const isEqual = (a, b) => a === b

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



module.exports = {
  isEqual,
  or,
  and,
  not,
  inc,
  dec,
  gt,
  json,
  formatDate,
  getVariantQuantity,
  isReturnEligible,
  multiply,
  formatAddress
}
