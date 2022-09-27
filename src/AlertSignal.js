const { htmlAlertSummary } = require("./util");
const { sendMessageTelegram } = require("./telegram");

const isProductionEnv = process.env.NODE_ENV === 'production';

function getDifference(array1, array2) {
  return array1.filter(object1 => {
    return !array2.some(object2 => {
      return object1.ohlc.lastTimeStamp === object2.ohlc.lastTimeStamp &&
        object1.symbol === object2.symbol && object1.interval === object2.interval;
    });
  });
}

module.exports = class AlertSignal {

  constructor() {
    this.ALERTS = []
    this.LAST_ALERTS = []
    this.SPOT_SYMBOLS = []
    this.FUTURES_SYMBOLS = []
  }

  updateSymbols(spot, futures){
    this.SPOT_SYMBOLS = [...spot]
    this.FUTURES_SYMBOLS = [...futures]
  }

  getMarketType(symbol){
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

  sendAlerts() {
    let telegramMessage = ''
    const alertsUnSorted = [...this.ALERTS];
    const alerts = alertsUnSorted
      .sort((a,b) => 
        (a.ticker?.quoteVolume > b.ticker?.quoteVolume) 
        ? 1 
        : ((b.ticker?.quoteVolume > a.ticker?.quoteVolume) ? -1 : 0))
    console.log(alerts.length, 'alerts to send..')
    //console.log(alerts)
    const alertsBuy = [...alerts].filter(a => a.signal.toUpperCase() === 'OVERSOLD');
    const alertsSell = [...alerts].filter(a => a.signal.toUpperCase() === 'OVERBOUGHT');
    const sendedAlerts = [...alerts];
    
    if (alertsBuy.length > 0 || alertsSell.length > 0) {
    telegramMessage += 'STRATEGY: Scalp Agiota by H7\n\n'
    }
    
    if (alertsBuy.length > 0) {
      telegramMessage += 'BUY SIGNALS\n'
      alertsBuy.forEach(a => {
        const formattedAlert = htmlAlertSummary(a.symbol, a.ticker, a.interval, a.signal, a.rsi, a.mfi, a.ohlc, a.ema9, a.ema100);
        const mt = this.getMarketType(a.symbol);
        telegramMessage += `${mt} ${formattedAlert}\n`
      })
    }
    if (alertsSell.length > 0) {
      telegramMessage += 'SELL SIGNALS\n'
      alertsSell.forEach(a => {
        const formattedAlert = htmlAlertSummary(a.symbol, a.ticker, a.interval, a.signal, a.rsi, a.mfi, a.ohlc, a.ema9, a.ema100);
        const mt = this.getMarketType(a.symbol);
        telegramMessage += `${mt} ${formattedAlert}\n`
      })
    }

    this.ALERTS = getDifference(this.ALERTS, alerts)

    if (telegramMessage !== '') {
      if (!isProductionEnv) console.log(telegramMessage)
      console.log(alerts.length, 'alerts sent successfully!!!')
      sendMessageTelegram(telegramMessage);
    }

    sendedAlerts.forEach(a => this.LAST_ALERTS.push(a))
  }
}