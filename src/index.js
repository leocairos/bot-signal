require('dotenv-safe').config();

const fs = require('fs');

const Exchange = require("./exchange");
const AlertSignal = require("./AlertSignal");
const TelegramMessage = require("./telegram");

const { Telegraf } = require('telegraf')

const BOT_TOKEN = process.env.BOT_TOKEN;

const { startMonitor, RSI_LIMITS, MFI_LIMITS, startMonitorTicker } = require("./monitor");
const { compactNumber, getTopCoinmarketcap } = require("./util");

const SEND_ALERT_INTERVAL = process.env.SEND_ALERT_INTERVAL;
const ALERT_ONLY_FUTURES = process.env.ALERT_ONLY_FUTURES;
const QUOTES = process.env.QUOTES ? process.env.QUOTES.split(',') : ["USDT"];
const INTERVALS = process.env.INTERVALS ? process.env.INTERVALS.split(',') : ["15m"];
const MINIMUM_QUOTE_VOLUME_ALERT = parseFloat(process.env.MINIMUM_QUOTE_VOLUME_ALERT) || 0;
const MINIMUM_PERCENT_CHANGE_ALERT = parseFloat(process.env.MINIMUM_PERCENT_CHANGE_ALERT) || 0;

const MINIMUM_VOLUME_USD = process.env.MINIMUM_VOLUME_USD || 30000000; //30Mi
const MINIMUM_MARKETCAP = process.env.MINIMUM_MARKETCAP || 500000000; //500Mi

const alertSignals = new AlertSignal();
const telegramStartMessages = new TelegramMessage();

const msgLogStart = [];

async function getSpotSymbols(exchange) {
  const spotSymbols = await exchange.exchangeInfo();
  const spotFilteredSymbols = [...spotSymbols.symbols]
    //.filter(s => s.quoteAsset === QUOTE &&
    .filter(s => [...QUOTES].includes(s.quoteAsset) &&
      s.status === "TRADING" &&
      s.isSpotTradingAllowed === true)
    .map(s => s.symbol);
  return spotFilteredSymbols;
}

async function getFutureSymbols(exchange) {
  const futuresSymbols = await exchange.futuresExchangeInfo();
  if (!futuresSymbols.symbols) console.log(JSON.stringify(futuresSymbols))
  const futuresFilteredSymbols = futuresSymbols.symbols
    //?.filter(s => s.quoteAsset === QUOTE &&
    ?.filter(s => [...QUOTES].includes(s.quoteAsset) &&
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

  //const [topSymbols, cmSymbols] = await getTopCoinmarketcap();
  let topSymbols, cmSymbols;
  try {
    [topSymbols, cmSymbols] = await getTopCoinmarketcap();
  } catch {
    setTimeout(async () => {
      [topSymbols, cmSymbols] = await getTopCoinmarketcap();
    }, 2000)
  }

  alertSignals.updateSymbols(spotSymbols, futuresSymbols, topSymbols, cmSymbols);
  const bothSymbols = futuresSymbols.filter(x => spotSymbols.includes(x));
  const onlyFutures = futuresSymbols.filter(x => !spotSymbols.includes(x));

  doLogStartMsg(`Monitoring all available symbols [${INTERVALS}] with quotes asset [${QUOTES}]:`);
  if (!isFuture)
    doLogStartMsg(` - ${spotSymbols.length} spot symbols.\n - ${bothSymbols.length} futures symbols.\n`)
  else
    doLogStartMsg(` - ${onlyFutures.length} futures symbols (only in Futures).\n`)

  doLogStartMsg(`Alerts only futures: ${ALERT_ONLY_FUTURES && isFuture}.\n`)

  doLogStartMsg(`Alerts every ${SEND_ALERT_INTERVAL}s for this Strategies:`)
  doLogStartMsg(` - Scalp H7: RSI (${RSI_LIMITS}) x MFI (${MFI_LIMITS}).`)
  doLogStartMsg(` - Galileia H7: EMA_9 vs Close.\n`)

  if (MINIMUM_QUOTE_VOLUME_ALERT !== 0 || MINIMUM_PERCENT_CHANGE_ALERT !== 0) {
    doLogStartMsg(`Alerts only when (by last 24h): `)
    if (MINIMUM_QUOTE_VOLUME_ALERT !== 0)
      doLogStartMsg(` - Quote volume is >= ${compactNumber(MINIMUM_QUOTE_VOLUME_ALERT)}.`)
    if (MINIMUM_PERCENT_CHANGE_ALERT !== 0)
      doLogStartMsg(` - Percent change price is >= ${Math.abs(MINIMUM_PERCENT_CHANGE_ALERT)}%.\n`)
  }
  const topSymbolsBase = [...topSymbols].map(s => s.symbol + ' ')

  doLogStartMsg(`Always alert for the TOP ${topSymbols.length} Symbols: ${topSymbolsBase.toString().replace(new RegExp(' ,', 'g'), ', ').trim()}.\n`);

  doLogStartMsg(`\nCoinMarketCap (CMC) filters: `)
  doLogStartMsg(`  * Minimum MarketCap: ${compactNumber(parseFloat(`${MINIMUM_MARKETCAP}`))}`);
  doLogStartMsg(`  * Minimum USD Volume (last 24h): ${compactNumber(parseFloat(`${MINIMUM_VOLUME_USD}`))}`);

  const cmcSymbolQUOTE = [];

  for (const s of cmSymbols) {
    for (const q of [...QUOTES]) {
      cmcSymbolQUOTE.push(`${s.symbol}${q}`)
    }
  }
  console.log(cmcSymbolQUOTE)

  const spotVsCMC = [...spotSymbols].filter(s => cmcSymbolQUOTE.includes(s)).sort();
  const futuresVsCMC = [...onlyFutures].filter(s => cmcSymbolQUOTE.includes(s)).sort();

  doLogStartMsg(`\nCoinPairs vs CMC : `)
  doLogStartMsg(`  * Spot Market [${spotVsCMC.length}]: ${spotVsCMC}`);
  doLogStartMsg(`  * Futures Market [${futuresVsCMC.length}]: ${futuresVsCMC}`);

  doSendStartLog();

  startMonitorTicker(exchange);


  INTERVALS.forEach(interval => {
    if (!isFuture)
      [...spotSymbols].filter(s => cmcSymbolQUOTE.includes(s)).forEach(symbol => startMonitor(exchange, alertSignals, symbol, interval))
    else
      [...onlyFutures].filter(s => cmcSymbolQUOTE.includes(s)).forEach(symbol => startMonitor(exchange, alertSignals, symbol, interval, true))
  })

  activeBotCommand();
}

function activeBotCommand() {
  const botCommands = new Telegraf(BOT_TOKEN);

  botCommands.hears(/summary\s?(.*)/i, async (ctx) => {
    const [period, symbol] = (ctx.match[1] || '24h_*').split('_');

    let telegramMessage = await doSummary(symbol, period);
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

async function doSummary(symbolInfo = '*', periodInfo = '24h') {
  let msgReturn = ''
  let tsNow = new Date().getTime();
  //const symbol = symbolInfo.includes(QUOTE) ? symbolInfo : '*';

  let symbol = '*';
  for (const quote of [...QUOTES]) {
    symbol = symbolInfo.includes(quote) ? symbolInfo : '*';
    if (symbol !== '*') break
  }

  const period = ['24h', '7d', '30d'].includes(periodInfo) ? periodInfo : '24h';
  const tsLastPeriod =
    period === '30d'
      ? tsNow - (30 * 24 * 3600 * 1000)
      : period === '7d'
        ? tsNow - (7 * 24 * 3600 * 1000)
        : tsNow - (1 * 24 * 3600 * 1000)

  const filenames = fs.readdirSync('alerts');

  const filenamesLastPeriod = [...filenames]
    .filter(filename => filename.split('_')[0] >= tsLastPeriod);

  msgReturn += `${filenamesLastPeriod.length} alert(s) were sent in the last ${period}.\n`;

  const periodAlerts = []
  filenamesLastPeriod.forEach(filename => {
    let rawData = fs.readFileSync(`./alerts/${filename}`);
    let alert = JSON.parse(rawData);
    periodAlerts.push(...alert)
  })

  const symbolAlerts = [...periodAlerts]
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

  msgReturn += `There were ${symbolAlerts.length} alert(s) for the ${symbol} symbol in the last ${period}:\n`;

  [...INTERVALS].forEach(interval => {
    msgReturn += ` - Time frame ${interval}: ${symbolAlertsByIntervals[interval]?.length || 0} alert(s)\n`;
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
//doSummary('BTCUSDT', '1w')
//getTopCoinmarketcap();
