
const msgLogStart = [];

function doLogStartMsg(msg) {
  msgLogStart[msgLogStart.length] = msgLogStart.length == 0 ? `<b>${msg}</b>` : msg;
  console.log(msg);
}

function compactNumber(value) {
  if (typeof value !== "number") return value;

  return Intl.NumberFormat('en-US', {
    notation: "compact",
    maximumFractionDigits: 2
  }).format(value);
}

function formatNumber(value) {
  if (typeof value !== "number") return value;

  return value > 1
    ? parseFloat(value.toFixed(3)) :
    value > 0.1
      ? parseFloat(value.toFixed(5))
      : value > 0.001
        ? parseFloat(value.toFixed(6))
        : parseFloat(value.toFixed(8));
}

module.exports = {
  doLogStartMsg,
  formatNumber,
  compactNumber,
}