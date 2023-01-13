const { htmlAlertSummary } = require("./util");
const TelegramMessage = require("./telegram");

const fs = require('fs');
const path = require('path');
const QUOTE = `${process.env.QUOTE}`;

const isProductionEnv = process.env.NODE_ENV === 'production';

function getDifference(array1, array2) {
  return array1.filter(object1 => {
    return !array2.some(object2 => {
      return object1.ohlc.lastTimeStamp === object2.ohlc.lastTimeStamp &&
        object1.symbol === object2.symbol && object1.interval === object2.interval;
    });
  });
}

function chunkArrayInGroups(arr, size) {
  var myArray = [];
  for (var i = 0; i < arr.length; i += size) {
    myArray.push(arr.slice(i, i + size));
  }
  return myArray;
}

module.exports = class AlertSignal {

  constructor() {
    this.ALERTS = []
    this.LAST_ALERTS = []
    this.SPOT_SYMBOLS = []
    this.FUTURES_SYMBOLS = []
    this.TOP_SYMBOLS_BASE = []
    this.telegramMessages = new TelegramMessage();
  }

  updateSymbols(spot, futures, topSymbols) {
    this.SPOT_SYMBOLS = [...spot]
    this.FUTURES_SYMBOLS = [...futures]
    this.TOP_SYMBOLS_BASE = [...topSymbols]
  }

  getCountFuturesSymbol() {
    return this.FUTURES_SYMBOLS.length;
  }

  isTopSymbol(symbol) {
    return this.TOP_SYMBOLS_BASE.includes(symbol.replace(QUOTE, ''));
  }

  getMarketType(symbol) {
    const spot = [...this.SPOT_SYMBOLS]
    const futures = [...this.FUTURES_SYMBOLS]
    const isSpot = spot.find(s => s === symbol)
    const isFuture = futures.find(s => s === symbol)
    let marketType = isSpot ? 'S' : '';
    marketType += isFuture ? 'F' : '';
    return `(${marketType})`
  }

  insert({ symbol, ticker, interval, signal, rsi, mfi, ohlc, ema9, ema100 }) {
    // const key = `${ohlc.lastTimeStamp}_${symbol}_${interval}`;
    const alert = { symbol, interval, signal, rsi, mfi, ohlc, ema9, ema100 };
    // this.ALERTS[`${key}`] = alert;
    // console.log(this.ALERTS);
    const currentAlerts = [...(this.ALERTS)]
    const exists = currentAlerts
      .find(a => a.ohlc.lastTimeStamp === ohlc.lastTimeStamp &&
        a.symbol === symbol && a.interval === interval);
    const lastAlerts = [...(this.LAST_ALERTS)]
    const alreadySend = lastAlerts
      .find(a => JSON.stringify(a) === JSON.stringify(alert))
    if (!exists && !alreadySend)
      this.ALERTS.push({ symbol, ticker, interval, signal, rsi, mfi, ohlc, ema9, ema100 });
  }

  getAlerts() {
    return this.ALERTS;
  }

  async addMessage(alerts) {
    //console.log(alerts)
    const alertsBuy = [...alerts].filter(a => a.signal.toUpperCase() === 'OVERSOLD');
    const alertsSell = [...alerts].filter(a => a.signal.toUpperCase() === 'OVERBOUGHT');

    let telegramMessage = ''
    if (alertsBuy.length > 0 || alertsSell.length > 0) {
      telegramMessage += 'STRATEGY: Scalp Agiota by H7\n'
      telegramMessage += `   at ${new Date().toISOString()}\n\n`
    }

    if (alertsBuy.length > 0) {
      telegramMessage += 'BUY SIGNALS\n'
      alertsBuy.forEach(a => {
        const mt = this.getMarketType(a.symbol);
        const formattedAlert = htmlAlertSummary(mt, a.symbol, a.ticker, a.interval, a.signal, a.rsi, a.mfi, a.ohlc, a.ema9, a.ema100);
        telegramMessage += `${mt} ${formattedAlert}\n`
      })
    }
    if (alertsSell.length > 0) {
      telegramMessage += 'SELL SIGNALS\n'
      alertsSell.forEach(a => {
        const mt = this.getMarketType(a.symbol);
        const formattedAlert = htmlAlertSummary(mt, a.symbol, a.ticker, a.interval, a.signal, a.rsi, a.mfi, a.ohlc, a.ema9, a.ema100);
        telegramMessage += `${mt} ${formattedAlert}\n`
      })
    }

    this.ALERTS = getDifference(this.ALERTS, alerts)

    if (telegramMessage !== '') {
      if (!isProductionEnv) console.log(telegramMessage)
      //await new Promise(r => setTimeout(r, 1000));
      this.telegramMessages.addMessage(telegramMessage);
      //sendMessageTelegram(telegramMessage);
      console.log(alerts.length, 'alerts sent successfully!!!')
    }
  }

  sendTelegramMessage() {
    this.telegramMessages.sendMessagesTelegram();
  }

  addMessagesAlert() {
    const alertsUnSorted = [...this.ALERTS];
    //sort and select top 10 to prevent error "message is too long" 
    console.log(alertsUnSorted.length, 'alerts to send..')
    const alerts = alertsUnSorted
      .sort((a, b) =>
        (parseFloat(a.ticker?.quoteVolume) > parseFloat(b.ticker?.quoteVolume))
          ? -1
          : ((parseFloat(b.ticker?.quoteVolume) > parseFloat(a.ticker?.quoteVolume))
            ? 1
            : 0))

    const sendedAlerts = [...alerts];
    const messages = chunkArrayInGroups(alerts, 10)
    messages.forEach(a => this.addMessage(a))

    const alertsToSave = []
    sendedAlerts.forEach(a => {
      this.LAST_ALERTS.push(a);
      alertsToSave.push({
        symbol: a.symbol,
        signal: a.signal,
        interval: a.interval,
        rsi: { current: a.rsi.current, previous: a.rsi.previous },
        mfi: { current: a.mfi.current, previous: a.mfi.previous },
        ema9: a.ema9.current,
        lastClose: a.ohlc.close[a.ohlc.close.length - 1],
        lastTimeStamp: a.ohlc.lastTimeStamp,
        ticker: { volume: a.ticker?.quoteVolume, priceChange: a.ticker?.percentChange },
      })
    })

    //save alerts to persistent object
    if (alertsToSave.length > 0) {
      const fileName = path.resolve("alerts", `${new Date().getTime()}_scalpH7.json`);
      fs.writeFileSync(fileName, JSON.stringify(alertsToSave));
    }
  }
}