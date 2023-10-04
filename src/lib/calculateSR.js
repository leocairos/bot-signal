//index.js
const axios = require("axios");

const CandleChart = require("./CandleChart");

async function calculateSR(symbol, interval, limit, tickSize = 0.01) {

  const baseUrl = `https://api.binance.com/api/v3/klines`;
  const params = `?symbol=${symbol}&interval=${interval}&limit=${limit}`
  const response = await axios.get(`${baseUrl}${params}`);
  const candleChart = new CandleChart(response.data, tickSize);

  let atl = candleChart.lowestPrice();
  let ath = candleChart.highestPrice();
  let medium = candleChart.getMedium(atl, ath);

  //console.log("Symbol: " + symbol + ' Time Frame: ' + interval + ' Limit: ' + limit);
  //console.log("  Higher: " + ath + " Lower: " + atl + " Medium: " + medium);

  const support = candleChart.findSupport(medium);
  //console.log("  Support: " + JSON.stringify(support));

  const resistance = candleChart.findResistance(medium);
  //console.log("  Resistance: " + JSON.stringify(resistance));

  const diff = parseFloat(resistance.tick) - parseFloat(support.tick);
  const variation = diff / parseFloat(resistance.tick);
  //console.log('  Diff.: ' + diff.toFixed(2) + ' variation: ' + (variation * 100).toFixed(2) + '%\n')

  return { atl, ath, medium, support, resistance, diff, variation }
}

module.exports = { calculateSR }