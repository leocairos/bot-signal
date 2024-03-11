const TelegramMessage = require("../telegram");

class LogStartMsg {

  constructor() {
    this.msgLogStart = []
    this.telegramMessages = new TelegramMessage();
  }

  getMsgLogStart() {
    return this.getMsgLogStart
  }

  doLogStartMsg(msg) {
    this.msgLogStart.push(
      this.msgLogStart.length == 0
        ? `<b>${msg}</b>`
        : msg
    );
    console.log(msg);
  }

  async doSendStartLog() {
    let telegramMessage = ''
    this.msgLogStart.forEach(async message => telegramMessage += message + '\n');
    this.telegramMessages.addMessage(telegramMessage);
    await this.telegramMessages.sendMessagesTelegram();
  }

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

function intervalSortOrder(interval) {
  //console.log('\n\n', interval, '\n\n')
  switch (interval) {
    case '1m': return 1;
    case '3m': return 3;
    case '5m': return 5;
    case '15m': return 15;
    case '30m': return 30;
    case '45m': return 45;
    case '1h': return 60;
    case '2h': return 60 * 2;
    case '3h': return 60 * 3;
    case '4h': return 60 * 4;
    case '1d': return 60 * 24;
    case '1w': return 60 * 24 * 7;
    case '1M': return 60 * 24 * 7 * 30;
  }
}

function intervalNext(interval) {
  switch (interval) {
    case '1m': return '3m';
    case '3m': return '5m';
    case '5m': return '15m';
    case '15m': return '30m';
    case '30m': return '45m';
    case '45m': return '1h';
    case '1h': return '2h';
    case '2h': return '3h';
    case '3h': return '4h';
    case '4h': return '1d';
    case '1d': return '1w';
    case '1w': return '1m';
    case '1m': return '3m';
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

function getGraphicLink(symbol, interval) {
  const url = `https://www.tradingview.com/chart/?symbol=BINANCE:${symbol}&interval=${intervalTradingViewConvert(interval)}`;
  return `<a href="${url}">${symbol} ${interval}</a>`
}

function getGraphicLinkV2(symbol, interval) {
  const url = `https://www.tradingview.com/chart/?symbol=BINANCE:${symbol}&interval=${intervalTradingViewConvert(interval)}`;
  return `<a href="${url}">${interval}</a>`
}

function htmlAlertFormatted(symbol, interval, close, msg) {
  const graphLink = getGraphicLink(symbol, interval)

  let html = `<b>${graphLink}</b> $${formatNumber(close)}\n`
  html += `${msg}`;
  return html;
}

module.exports = {
  formatNumber,
  compactNumber,
  htmlAlertFormatted,
  LogStartMsg,
  getGraphicLink,
  getGraphicLinkV2,
  intervalSortOrder,
  intervalNext
}