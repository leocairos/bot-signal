
const msgLogStart = [];

function doLogStartMsg(msg) {
  msgLogStart[msgLogStart.length] = msgLogStart.length == 0 ? `<b>${msg}</b>` : msg;
  console.log(msg);
}

function intervalTradingViewConvert(interval) {
  switch (interval) {
    case '1m': return "1";
    case '3m': return "3";
    case '5m': return "5";
    case '15m': return "15";
    case '30m': return "30";
    case '45m': return "45";
    case '1h': return "60";
    case '2h': return "120";
    case '3h': return "180";
    case '4h': return "240";
    case '1d': return "D";
    case '1w': return "W";
    case '1m': return "M";
  }
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

function htmlAlertFormatted(symbol, interval, close, msg) {

  const url = `https://www.tradingview.com/chart/?symbol=BINANCE:${symbol}&interval=${intervalTradingViewConvert(interval)}`;
  const graphLink = `<a href="${url}">${symbol} ${interval}</a>`

  let html = `<b>${graphLink}</b> $${formatNumber(close)}\n`
  html += `<i>${msg}</i>`;
  return html;
}

module.exports = {
  doLogStartMsg,
  formatNumber,
  compactNumber,
  htmlAlertFormatted
}