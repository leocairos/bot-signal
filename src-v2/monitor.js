const { RSI, MFI, EMA } = require("./indicators")
const { formatNumber, htmlAlertFormatted } = require("./util");
const TelegramMessage = require("./telegram");

const MINIMUM_QUOTE_VOLUME_ALERT = parseFloat(process.env.MINIMUM_QUOTE_VOLUME_ALERT) || 0;
const MINIMUM_PERCENT_CHANGE_ALERT = parseFloat(process.env.MINIMUM_PERCENT_CHANGE_ALERT) || 0;

const RSI_LIMITS = process.env.RSI_LIMITS ? process.env.RSI_LIMITS.split(',') : [30, 70];
const MFI_LIMITS = process.env.MFI_LIMITS ? process.env.MFI_LIMITS.split(',') : [20, 80];

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

  if (isOkToProcess) {
    const ticker = ticker24h[symbol];
    const quoteVolume = parseFloat(ticker?.quoteVolume) || 0;
    const percentChange = parseFloat(ticker?.percentChange) || 0;

    const currentClose = ohlc.close[ohlc.close.length - 1]
    const isQuoteAlert = quoteVolume >= MINIMUM_QUOTE_VOLUME_ALERT;
    const isPercentAlert = percentChange >= MINIMUM_PERCENT_CHANGE_ALERT;

    //Críterios comum para ativação de avaliação de estratégia
    if ((isQuoteAlert && isPercentAlert)) {
      console.log(`Ready to evaluate ${symbol}_${interval} (U$ ${formatNumber(currentClose)},`,
        `RSI: ${formatNumber(rsi.current)}, MFI: ${formatNumber(mfi.current)},`,
        `EMA9: ${formatNumber(ema9.current)}, EMA100: ${formatNumber(ema100.current)})...`);

      //Estratégia 01
      if (currentClose < ema9.current) {
        const msg = `${symbol}_${interval} last close lower than ema9 (${formatNumber(currentClose)} lower than ${formatNumber(ema9.current)})`
        telegramMessages.addMessage(htmlAlertFormatted(symbol, interval, currentClose, msg));
      }

      //Estratégia 02 (By Ricardo) compra quando sobe 1% e venda quando cai 1%
      const lastClose = ohlc.close[ohlc.close.length - 1]
      const previousClose = ohlc.close[ohlc.close.length - 2]
      const profit = ((lastClose / previousClose) - 1) * 100;
      if (profit >= 1 || profit <= -1) {
        const msg = `${symbol} changing ${profit.toFixed(2)}% ${interval} chart time`
        telegramMessages.addMessage(htmlAlertFormatted(symbol, interval, currentClose, msg));
      }

      //Estratégia 03 - Galileia By H7
      const currentClose03 = ohlc.close[ohlc.close.length - 1]
      const previousClose03 = ohlc.close[ohlc.close.length - 2]
      const isLongGalileia = (currentClose03 > ema9.current) && (previousClose03 < ema9.current);
      const isShortGalileia = (currentClose03 < ema9.current) && (previousClose03 > ema9.current);
      if (isLongGalileia == true) {
        const msg = `${symbol} ${interval} possible LONG by Galileia (EMA9: ${ema9.current})`;
        telegramMessages.addMessage(htmlAlertFormatted(symbol, interval, currentClose, msg));
      } else if (isShortGalileia == true) {
        const msg = `${symbol} ${interval} possible SHORT by Galileia (EMA9: ${ema9.current})`;
        telegramMessages.addMessage(htmlAlertFormatted(symbol, interval, currentClose, msg));
      }

      //Estratégia 04 - Scalp Agiota by H7
      const overSold = (rsi.current <= RSI_LIMITS[0] && mfi.current <= MFI_LIMITS[0])
      const overBought = (rsi.current >= RSI_LIMITS[1] && mfi.current >= MFI_LIMITS[1])
      if (overSold == true) {
        const msg = `${symbol} ${interval} is OVERSOLD (RSI: ${rsi.current}, MFI: ${mfi.current})`;
        telegramMessages.addMessage(htmlAlertFormatted(symbol, interval, currentClose, msg));
      } else if (overBought == true) {
        const msg = `${symbol} ${interval} is OVERBOUGHT (RSI: ${rsi.current}, MFI: ${mfi.current})`;
        telegramMessages.addMessage(htmlAlertFormatted(symbol, interval, currentClose, msg));
      }

    }

  }

}

//Verifica se tem alertas a cada X Segundos e envia pelo Telegram
setInterval(() => {
  console.log(`Processing message queue for Telegram (${telegramMessages.MESSAGES.length} message(s))...`)
  if (telegramMessages.MESSAGES.length > 0) {
    //console.log(`   ${telegramMessages.MESSAGES}`)
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