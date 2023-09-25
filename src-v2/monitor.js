const { RSI, MFI, EMA } = require("./indicators")
const { formatNumber } = require("./util");
const TelegramMessage = require("./telegram");

const MINIMUM_QUOTE_VOLUME_ALERT = parseFloat(process.env.MINIMUM_QUOTE_VOLUME_ALERT) || 0;
const MINIMUM_PERCENT_CHANGE_ALERT = parseFloat(process.env.MINIMUM_PERCENT_CHANGE_ALERT) || 0;

let ticker24h = {}

const telegramMessages = new TelegramMessage();

function calculateIndicators(ohlc) {
  const rsi = RSI(ohlc.close)
  const mfi = MFI(ohlc)
  const ema9 = EMA(ohlc.close, 9)
  const ema100 = EMA(ohlc.close, 100)

  const isNumberIndicator = typeof rsi.current === "number" && typeof mfi.current === "number";
  const isUpperZero = (rsi.current > 0 && mfi.current > 0)
  const isNumberPIndicator = typeof rsi.previous === "number" && typeof mfi.previous === "number";
  const isUpperPZero = (rsi.previous > 0 && mfi.previous > 0)
  const isOkToProcess = isNumberIndicator && isUpperZero && isNumberPIndicator && isUpperPZero

  return [rsi, mfi, ema9, ema100, isOkToProcess];
}

const doProcess = (symbol, interval, ohlc) => {
  const [rsi, mfi, ema9, ema100, isOkToProcess] = calculateIndicators(ohlc);
  //console.log('symbol, interval, isOkToProcess', symbol, interval, isOkToProcess)

  if (isOkToProcess) {
    const ticker = ticker24h[symbol];
    const quoteVolume = parseFloat(ticker?.quoteVolume) || 0;
    const percentChange = parseFloat(ticker?.percentChange) || 0;

    const ohlcCloseC = ohlc.close[ohlc.close.length - 1]
    const isTopSymbol = true; //ToDo
    const isQuoteAlert = quoteVolume >= MINIMUM_QUOTE_VOLUME_ALERT;
    const isPercentAlert = percentChange >= MINIMUM_PERCENT_CHANGE_ALERT;

    //Atende critérios para avaliação de estrategias
    if ((isQuoteAlert && isPercentAlert) || (isTopSymbol && isQuoteAlert)) {
      console.log(`Ready to evaluate ${symbol}_${interval} (U$ ${formatNumber(ohlcCloseC)},`,
        `RSI: ${formatNumber(rsi.current)}, MFI: ${formatNumber(mfi.current)},`,
        `EMA9: ${formatNumber(ema9.current)}, EMA100: ${formatNumber(ema100.current)})...`);

      //Estratégia 01
      if (ohlcCloseC < ema9.current) {
        const msg = `${symbol}_${interval} last close lower than ema9 (${formatNumber(ohlcCloseC)} < ${formatNumber(ema9.current)})`
        //console.warn(`   ${msg}`)
        telegramMessages.addMessage(msg);
      }

    }

  }

}

setInterval(() => {
  console.log(`Processing message queue for Telegram (${telegramMessages.MESSAGES.length} message(s))...`)
  if (telegramMessages.MESSAGES.length > 0) {
    console.log(`   ${telegramMessages.MESSAGES}`)
    telegramMessages.sendMessagesTelegram();
  }
}, 5 * 1000)

async function startMonitor(exchange, symbol, interval, isFuture = false) {
  return await exchange.chartStream(symbol, interval, doProcess, isFuture);
}

function updateTicker24h(mkt) {
  if (mkt.eventType === '24hrTicker') {
    const obj = {
      symbol: mkt.symbol,
      eventTime: mkt.eventTime,
      priceChange: formatNumber(mkt.priceChange),
      percentChange: formatNumber(mkt.percentChange),
      averagePrice: formatNumber(mkt.averagePrice),
      quoteVolume: formatNumber(mkt.quoteVolume),
      numTrades: mkt.numTrades
    }
    ticker24h[mkt.symbol] = obj;
    //console.log(obj);
  }
  //console.log(mkt);
}

async function startMonitorTicker(exchange) {
  exchange.tickerStream((markets) => {
    markets.map(mkt => updateTicker24h(mkt));
    //console.log('ticker24h', ticker24h);
  })
}

module.exports = { startMonitor, startMonitorTicker }