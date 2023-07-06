const { RSI, MFI, EMA, fibonacciRetracement, SMA, MACD } = require("./indicators")

const { formatNumber } = require("./util");

const isProductionEnv = process.env.NODE_ENV === 'production';
const alertOnlyFutures = process.env.ALERT_ONLY_FUTURES === 'true';
const RSI_LIMITS = process.env.RSI_LIMITS ? process.env.RSI_LIMITS.split(',') : [30, 70];
const MFI_LIMITS = process.env.MFI_LIMITS ? process.env.MFI_LIMITS.split(',') : [20, 80];
const USE_INVERSE_CONDITIONS = !process.env.USE_INVERSE_CONDITIONS || process.env.USE_INVERSE_CONDITIONS === 'true'
const MINIMUM_QUOTE_VOLUME_ALERT = parseFloat(process.env.MINIMUM_QUOTE_VOLUME_ALERT) || 0;
const MINIMUM_PERCENT_CHANGE_ALERT = parseFloat(process.env.MINIMUM_PERCENT_CHANGE_ALERT) || 0;

let ticker24h = {}

function doCalc(ohlc) {
  const rsi = RSI(ohlc.close)
  const mfi = MFI(ohlc)
  const ema9 = EMA(ohlc.close, 9)
  const ema14 = EMA(ohlc.close, 14)
  const ema100 = EMA(ohlc.close, 100)
  const ema200 = EMA(ohlc.close, 200)
  const sma = SMA(ohlc.close)
  const macd = MACD(ohlc.close)
  const fib = fibonacciRetracement(ohlc.close[ohlc.close.length - 1])
  const lastOpen = formatNumber(ohlc.open[ohlc.close.length - 1]);
  const lastHigh = formatNumber(ohlc.high[ohlc.close.length - 1]);
  const lastLow = formatNumber(ohlc.low[ohlc.close.length - 1]);
  const lastClose = formatNumber(ohlc.close[ohlc.close.length - 1]);
  //const lastVolume = formatNumber(ohlc.volume[ohlc.volume.length - 1]);
  const txtOHLC = `${lastOpen}, ${lastHigh}, ${lastLow}, ${lastClose}`
  const isNumberIndicator = typeof rsi.current === "number" && typeof mfi.current === "number";
  const isUpperZero = (rsi.current > 0 && mfi.current > 0)
  const isNumberPIndicator = typeof rsi.previous === "number" && typeof mfi.previous === "number";
  const isUpperPZero = (rsi.previous > 0 && mfi.previous > 0)
  const isOkToProcess = isNumberIndicator && isUpperZero && isNumberPIndicator && isUpperPZero

  return [rsi, mfi, ema9, ema14, ema100, ema200, sma, macd, fib, txtOHLC, isOkToProcess];
}

const doProcess = (alertSignals, symbol, interval, ohlc) => {
  const marketType = alertSignals.getMarketType(symbol);
  const countFutures = alertSignals.getCountFuturesSymbol();
  if (alertOnlyFutures === true && marketType === 'S' && countFutures > 2) return;

  const [rsi, mfi, ema9, ema14, ema100, ema200, sma, macd, fib, txtOHLC, isOkToProcess] = doCalc(ohlc);

  let msg = `${symbol}_${interval} RSI: ${rsi.current}, MFI: ${mfi.current}`

  if (isOkToProcess) {
    const ohlcCloseC = ohlc.close[ohlc.close.length - 1]
    const ohlcCloseP = ohlc.close[ohlc.close.length - 2]
    //console.log('ohlcCloseC', ohlcCloseC, 'ohlcCloseP', ohlcCloseP)
    let isLongGalileia = (ohlcCloseC > ema9.current) && (ohlcCloseP < ema9.current);
    let isShortGalileia = (ohlcCloseC < ema9.current) && (ohlcCloseP > ema9.current);

    let overSold = (rsi.current <= RSI_LIMITS[0] && mfi.current <= MFI_LIMITS[0])
    let overBought = (rsi.current >= RSI_LIMITS[1] && mfi.current >= MFI_LIMITS[1])
    if (USE_INVERSE_CONDITIONS === true) {
      overSold = overSold && (rsi.previous > RSI_LIMITS[0] && mfi.previous > MFI_LIMITS[0]);
      overBought = overBought && (rsi.previous < RSI_LIMITS[1] && mfi.previous < MFI_LIMITS[1])
    }

    if (isLongGalileia == true) {
      msg += `${symbol}_${interval} possible LONG by Galileia (EMA9: ${ema9.current})`;
    } else if (isShortGalileia == true) {
      msg += `${symbol}_${interval} possible SHORT by Galileia (EMA9: ${ema9.current})`;
    }

    if (overSold == true) {
      msg += `\n${symbol}_${interval} is OVERSOLD (RSI: ${rsi.current}, MFI: ${mfi.current})`;
    } else if (overBought == true) {
      msg += `\n${symbol}_${interval} is OVERBOUGHT (RSI: ${rsi.current}, MFI: ${mfi.current})`;
    }

    msg += `, OHLC: [${txtOHLC}]`

    if (!isProductionEnv) console.log(msg)

    // msg += `, EMA9: ${formatNumber(ema9.current)}`
    // msg += `, EMA14: ${formatNumber(ema14.current)}`
    // msg += `, EMA100: ${formatNumber(ema100.current)}`
    // msg += `, EMA200: ${formatNumber(ema200.current)}`
    // msg += `, SMA: ${formatNumber(sma.current)}`

    // let macdC = {
    //   "MACD": formatNumber(macd.current.MACD),
    //   "signal": formatNumber(macd.current.signal),
    //   "histogram": formatNumber(macd.current.histogram)
    // }
    // msg += `, MACD: ${JSON.stringify(macdC)}`

    // let fibCT = '';
    // let fibPT = '';
    // fib.current.map(f => formatNumber(f)).forEach(f => fibCT === '' ? fibCT += f : fibCT += ', ' + f)
    // fib.previous.map(f => formatNumber(f)).forEach(f => fibPT === '' ? fibPT += f : fibPT += ', ' + f)

    // msg += `, FibUp: ${fibCT}`
    // msg += `, FibDown: ${fibPT}`

    //console.log(msg)

    if (overSold == true || overBought == true || isLongGalileia == true || isShortGalileia == true) {
      const signal = overSold ? 'overSold' : 'overBought';
      const signalGalileia = isLongGalileia ? 'LongGalileia' : isShortGalileia ? 'ShortGalileia' : '-';
      const ticker = ticker24h[symbol];
      const quoteVolume = parseFloat(ticker?.quoteVolume) || 0;
      const percentChange = parseFloat(ticker?.percentChange) || 0;
      const isQuoteAlert = quoteVolume > 0 || quoteVolume >= MINIMUM_QUOTE_VOLUME_ALERT;
      const isPercentAlert = Math.abs(percentChange) > 0 || Math.abs(percentChange) >= MINIMUM_PERCENT_CHANGE_ALERT
      const isTopSymbol = alertSignals.isTopSymbol(symbol);
      //console.log('doProcess', symbol, 'isTop', isTopSymbol)
      if ((isQuoteAlert && isPercentAlert) || (isTopSymbol && isQuoteAlert)) {
        //console.log('signal', signal, 'signalGalileia', signalGalileia)
        if (overSold == true || overBought == true)
          alertSignals.insert({ symbol, ticker, interval, signal, rsi, mfi, ohlc, ema9, ema100 });
        if (isLongGalileia == true || isShortGalileia == true)
          alertSignals.insert({ symbol, ticker, interval, signal: signalGalileia, rsi, mfi, ohlc, ema9, ema100 });
      }
      //const formattedAlert = htmlAlertFormatted(symbol, interval, signal, rsi, mfi, ohlc, ema14, ema100, ema200, fib, sma, macd);
      //const formattedAlert = htmlAlertSummary(symbol, interval, signal, rsi, mfi, ohlc, ema14, ema100);
      // console.log(formattedAlert)
      // console.log(ticker24h[symbol])
      //sendMessageTelegram(formattedAlert);
      //sendImageTelegram(symbol, interval)

      // const lastOHLC = txtOHLC.split(",").map(v => parseFloat(v));
      // const timeStamp = ohlc.lastTimeStamp
      // addAlert(symbol, timeStamp, interval, signal, rsi, mfi, ema14, 
      //   ema100, ema200, sma, macd, fib, lastOHLC , formattedAlert);

    }

  }

}

// function addAlert(symbol, timeStamp, interval, signal, rsi, mfi, ema14,
//   ema100, ema200, sma, macd, fib, lastOHLC, formattedAlert) {
//   const exists = ALERTS.find(a => a.symbol === symbol && a.timeStamp === timeStamp)
//   if (!exists) {
//     ALERTS.push({
//       symbol,
//       timeStamp,
//       interval,
//       signal,
//       indicators: [
//         rsi, mfi, ema14, ema100, ema200, sma, macd, fib, lastOHLC
//       ],
//       formattedAlert
//     })
//   }
// }

async function startMonitor(exchange, alertSignals, symbol, interval, isFuture = false) {
  return await exchange.chartStream(alertSignals, symbol, interval, doProcess, isFuture);
}

function updateTicker24h(mkt) {
  if (mkt.eventType === '24hrTicker') {
    const obj = {
      //symbol: mkt.symbol,
      eventTime: mkt.eventTime,
      priceChange: formatNumber(mkt.priceChange),
      percentChange: formatNumber(mkt.percentChange),
      averagePrice: formatNumber(mkt.averagePrice),
      quoteVolume: formatNumber(mkt.quoteVolume),
      numTrades: mkt.numTrades
    }
    ticker24h[mkt.symbol] = obj;
  }
  //console.log(mkt);
}

async function startMonitorTicker(exchange) {
  exchange.tickerStream((markets) => {
    markets.map(mkt => updateTicker24h(mkt));
    //console.log('ticker24h', ticker24h);
  })
}

module.exports = { startMonitor, startMonitorTicker, RSI_LIMITS, MFI_LIMITS }