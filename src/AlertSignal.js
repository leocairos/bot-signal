const { intervalSortOrder } = require("./lib/util");

function getDifference(array1, array2) {
  return array1.filter(object1 => {
    return !array2.some(object2 => {
      return object1.symbol === object2.symbol
        && object1.interval === object2.interval && object1.message === object1.message;
    });
  });
}

module.exports = class AlertSignal {

  constructor(telegramMessages) {
    this.alerts = [];
    this.telegramMessages = telegramMessages;
  }

  addAlert({ msgTitle, symbol, interval, message }) {
    const currentAlerts = [...(this.alerts)]
    const exists = currentAlerts
      .find(a => a.symbol === symbol &&
        a.interval === interval && a.message === message);
    if (!exists)
      this.alerts.push({ msgTitle, symbol, interval, message });
  }

  addMessagesAlert() {
    const alertsUnSorted = [...this.alerts];
    //sort alert by symbol
    const alerts = [...alertsUnSorted].sort((a, b) => a.symbol > b.symbol ? 0 : 1)

    const groupBySymbol = [...alerts].reduce((group, alert) => {
      const { symbol } = alert;
      group[symbol] = group[symbol] ?? [];
      group[symbol].push(alert);
      return group;
    }, {});

    //console.log('alerts', alerts)
    //console.log('groupBySymbol', groupBySymbol)
    console.log(`${alertsUnSorted.length} alerts to send (by ${Object.keys(groupBySymbol).length} symbols)...`)
    this.alerts = getDifference(this.alerts, alertsUnSorted)

    return groupBySymbol;
  }

  sendTelegramMessage() {
    const sendedAlerts = this.addMessagesAlert();

    for (var symbolAlerts in sendedAlerts) {
      const ordered = [...sendedAlerts[symbolAlerts]]
        .sort((a, b) => intervalSortOrder(a.interval) > intervalSortOrder(b.interval) ? 0 : 1)
      //console.log('sendedAlerts[symbolAlerts]', sendedAlerts[symbolAlerts])
      const msgTitle = ordered[0].msgTitle
      let msgBody = ''
      for (var m in ordered) {
        msgBody += `   ${ordered[m].message}\n`
      }
      //console.log('telegramMessages.addMessage', `${msgTitle}\n${msgBody}`);
      this.telegramMessages.addMessage(`${msgTitle}\n${msgBody}`);
    }

  }
}