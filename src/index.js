require('dotenv-safe').config();

const fs = require('fs');

const Exchange = require("./exchange");
const AlertSignal = require("./AlertSignal");
const TelegramMessage = require("./telegram");

const { Telegraf } = require('telegraf')

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

const { startMonitor, RSI_LIMITS, MFI_LIMITS, startMonitorTicker } = require("./monitor");
const { compactNumber, getTopCoinmarketcap } = require("./util");

const SEND_ALERT_INTERVAL = process.env.SEND_ALERT_INTERVAL;
const ALERT_ONLY_FUTURES = process.env.ALERT_ONLY_FUTURES;
const QUOTE = `${process.env.QUOTE}`;
const INTERVALS = process.env.INTERVALS ? process.env.INTERVALS.split(',') : ["15m"];
const MINIMUM_QUOTE_VOLUME_ALERT = parseFloat(process.env.MINIMUM_QUOTE_VOLUME_ALERT) || 0;
const MINIMUM_PERCENT_CHANGE_ALERT = parseFloat(process.env.MINIMUM_PERCENT_CHANGE_ALERT) || 0;

const alertSignals = new AlertSignal();
const telegramStartMessages = new TelegramMessage();

const msgLogStart = [];

async function getSpotSymbols(exchange) {
  const spotSymbols = await exchange.exchangeInfo();
  const spotFilteredSymbols = [...spotSymbols.symbols]
    .filter(s => s.quoteAsset === QUOTE &&
      s.status === "TRADING" &&
      s.isSpotTradingAllowed === true)
    .map(s => s.symbol);
  return spotFilteredSymbols;
}

async function getFutureSymbols(exchange) {
  const futuresSymbols = await exchange.futuresExchangeInfo();
  if (!futuresSymbols.symbols) console.log(JSON.stringify(futuresSymbols))
  const futuresFilteredSymbols = futuresSymbols.symbols
    ?.filter(s => s.quoteAsset === QUOTE &&
      s.status === "TRADING")
    .map(s => s.symbol)
  return futuresFilteredSymbols || [''];
}

function doLogStartMsg(msg) {
  msgLogStart[msgLogStart.length] = msgLogStart.length == 0 ? `<b>${msg}</b>` : msg;
  console.log(msg);
}

function doSendStartLog() {
  let telegramMessage = ''
  msgLogStart.forEach(async message => telegramMessage += message + '\n');
  telegramStartMessages.addMessage(telegramMessage);
  telegramStartMessages.sendMessagesTelegram();
}

async function doRun(isFuture = false) {
  doLogStartMsg(`System started at ${new Date().toISOString()}\n`);

  const exchange = new Exchange();

  const spotSymbols = await getSpotSymbols(exchange);

  //delay between 2s and 5s to prevent code -1003 Way too many requests... banned until... when run in parallel
  await new Promise(r => setTimeout(r, (Math.floor(Math.random() * 3) * 1000) + 2));

  const futuresSymbols = await getFutureSymbols(exchange);

  const [topSymbols, cmSymbols] = await getTopCoinmarketcap();

  alertSignals.updateSymbols(spotSymbols, futuresSymbols, topSymbols, cmSymbols);
  const bothSymbols = futuresSymbols.filter(x => spotSymbols.includes(x));
  const onlyFutures = futuresSymbols.filter(x => !spotSymbols.includes(x));

  doLogStartMsg(`Monitoring all available symbols [${INTERVALS}] with quote asset "${QUOTE}":`);
  if (!isFuture)
    doLogStartMsg(` - ${spotSymbols.length} spot symbols.\n - ${bothSymbols.length} futures symbols.\n`)
  else
    doLogStartMsg(` - ${onlyFutures.length} futures symbols (only in Futures).\n`)

  doLogStartMsg(`Alerts only futures: ${ALERT_ONLY_FUTURES && isFuture}.\n`)

  doLogStartMsg(`Alerts every ${SEND_ALERT_INTERVAL}s for this Strategies:`)
  doLogStartMsg(` - Scalp H7: RSI (${RSI_LIMITS}) x MFI (${MFI_LIMITS}).\n`)

  if (MINIMUM_QUOTE_VOLUME_ALERT !== 0 || MINIMUM_PERCENT_CHANGE_ALERT !== 0) {
    doLogStartMsg(`Alerts only when (by last 24h): `)
    if (MINIMUM_QUOTE_VOLUME_ALERT !== 0)
      doLogStartMsg(` - Quote volume is >= ${compactNumber(MINIMUM_QUOTE_VOLUME_ALERT)}.`)
    if (MINIMUM_PERCENT_CHANGE_ALERT !== 0)
      doLogStartMsg(` - Percent change price is >= ${Math.abs(MINIMUM_PERCENT_CHANGE_ALERT)}%.\n`)
  }
  const topSymbolsBase = [...topSymbols].map(s => s.symbol + ' ')

  doLogStartMsg(`Always alert for the TOP ${topSymbols.length} Symbols: ${topSymbolsBase.toString().replace(new RegExp(' ,', 'g'), ', ').trim()}.\n`);
  doSendStartLog();

  startMonitorTicker(exchange);
  INTERVALS.forEach(interval => {
    if (!isFuture)
      spotSymbols.forEach(symbol => startMonitor(exchange, alertSignals, symbol, interval))
    else
      onlyFutures.forEach(symbol => startMonitor(exchange, alertSignals, symbol, interval, true))
  })

  activeBotCommand();
}

function activeBotCommand() {
  const botCommands = new Telegraf(BOT_TOKEN);

  botCommands.hears(/summary\s?(.*)/i, async (ctx) => {
    const [period, symbol] = (ctx.match[1] || '24h_*').split('_');

    let telegramMessage = await doSummary(symbol.includes(QUOTE) ? symbol : '*',
      ['24h', '7d', '30d'].includes(period) ? period : '24h');
    ctx.reply(
      telegramMessage,
      { parse_mode: 'html', disable_web_page_preview: true })
  })

  botCommands.command('status', (ctx) => {
    let telegramMessage = ''
    msgLogStart.forEach(async message => telegramMessage += message + '\n');
    ctx.reply(
      telegramMessage,
      { parse_mode: 'html', disable_web_page_preview: true })
  })

  // botCommands.command('summary', async (ctx) => {
  //   let telegramMessage = await doSummary();
  //   ctx.reply(
  //     telegramMessage,
  //     { parse_mode: 'html', disable_web_page_preview: true })
  // })

  botCommands.on('text', async (ctx) => {
    let telegramMessage = 'Hi, how can I help you? \n\n';
    telegramMessage += 'Please send any command from this list:\n';
    telegramMessage += ' - <b>/status</b> to receive my last start log\n';
    telegramMessage += ' - <b>/summary</b> [<b>24h</b>,7d,30]_[symbol] to receive a summary of the last periods\n';
    telegramMessage += ' - <b>/top10alerts<b> [<b>24h</b>,7d,30]_[symbol] to receive a summary of the top 10 alerts last periods\n';
    telegramMessage += ' - <b>/top10volume<b> [<b>24h</b>,7d,30]_[symbol] to receive a summary of the top 10 volume quote last periods\n';

    await ctx.reply(
      telegramMessage,
      { parse_mode: 'html', disable_web_page_preview: true }
    );
  });

  botCommands.launch()
}

async function doSummary(symbol = '*', period = '24h') {
  let msgReturn = ''
  let tsNow = new Date().getTime();
  let tsLast24h = tsNow - (24 * 3600 * 1000);
  let tsLast30d = tsNow - (30 * 24 * 3600 * 1000);

  const filenames = fs.readdirSync('alerts');

  // console.log('tsNow:', tsNow, new Date(tsNow).toISOString());
  // console.log('tsLast24h:', tsLast24h, new Date(tsLast24h).toISOString());
  // console.log('tsLast30d:', tsLast30d, new Date(tsLast30d).toISOString());
  // console.log('Total Files:', filenames.length);

  const filenamesLast24h = [...filenames]
    .filter(filename => filename.split('_')[0] >= tsLast24h);

  const filenamesLast30d = [...filenames]
    .filter(filename => filename.split('_')[0] >= tsLast30d);

  msgReturn += `Total alerts last 24h: ${filenamesLast24h.length}\n`;
  msgReturn += `Total alerts last 30d: ${filenamesLast30d.length}\n`;
  // console.log('Total alerts last 24h:', filenamesLast24h.length);
  // console.log('Total alerts last 30d:', filenamesLast30d.length);

  // filenamesLast24h.forEach(filename => {
  //   console.log(new Date(Number(filename.split('_')[0])).toISOString())
  // })

  const alerts30d = []
  filenamesLast30d.forEach(filename => {
    //console.log(new Date(Number(filename.split('_')[0])).toISOString())
    //console.log(new Date(Number(filename.split('_')[0])).toISOString())
    let rawData = fs.readFileSync(`./alerts/${filename}`);
    let alert = JSON.parse(rawData);

    alerts30d.push(...alert)
    //console.log(...alert);
  })

  //return this.TOP_SYMBOLS_BASE.includes(symbol.replace(QUOTE, ''));

  const symbolAlerts = [...alerts30d]
    .filter(alert =>
      symbol === '*'
        ? true
        : alert.symbol === symbol)

  const symbolAlertsByIntervals = [...symbolAlerts]
    .reduce((group, alert) => {
      const { interval } = alert;
      group[interval] = group[interval] ?? [];
      group[interval].push(alert);
      return group;
    }, {});

  //console.log('alerts30d:', alerts30d);
  msgReturn += `Total Alerts to symbol [${symbol}] Last 30d: ${symbolAlerts.length}\n`;
  //console.log(`Total Alerts to symbol [${symbol}] Last 30d:`, symbolAlerts.length);
  //console.log('symbolAlertsByIntervals:', symbolAlertsByIntervals);

  [...INTERVALS].forEach(interval => {
    msgReturn += ` - Interval[${interval}] ${symbolAlertsByIntervals[interval]?.length || 0}\n`;
    //console.log(` - Interval[${interval}]`, symbolAlertsByIntervals[interval]?.length || 0)
  })
  console.log(msgReturn);
  return msgReturn;
}

setInterval(() => {
  //console.log(alertSignals.getAlerts())
  alertSignals.addMessagesAlert();
  alertSignals.sendTelegramMessage();
}, SEND_ALERT_INTERVAL * 1000)
//doRun();

switch (process.argv[2]?.toUpperCase()) {
  case 'ONLY-FUTURES':
    doRun(true);
    break;
  default:
    doRun();
}

//doSummary('ETHUSDT')
//doSummary()
//getTopCoinmarketcap();
