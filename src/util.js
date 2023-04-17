const puppeteer = require('puppeteer');
const fs = require("fs")
const axios = require("axios");

const pageWidth = 860;
const pageHeight = 460;

const TOP_X_TO_FAVORITE = process.env.TOP_X_TO_FAVORITE || 20;
const CMC_PRO_API_KEY = process.env.CMC_PRO_API_KEY;

const MINIMUM_VOLUME_USD = process.env.MINIMUM_VOLUME_USD || 30000000; //30Mi
const MINIMUM_MARKETCAP = process.env.MINIMUM_MARKETCAP || 500000000; //500Mi

function intervalHTMLConvert(interval) {
  switch (interval) {
    case '1m': return "1";
    case '3m': return "3";
    case '5m': return "5";
    case '15m': return "15";
    case '30m': return "30";
    case '1h': return "60";
    case '1d': return "D";
    case '1w': return "W";
  }
}

function getChartHtmlPage(symbol, interval) {
  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <title>Bot Crypto Signal</title>
    <style>
      * {
        margin: 0;
        padding: 0;
      }
    </style>
  </head>
  <body>
    <div class="tradingview-widget-container">
      <script type="text/javascript" src="https://s3.tradingview.com/tv.js"></script>
      <script type="text/javascript">
        new TradingView.widget(
          {
            "width": ${pageWidth},
            "height": ${pageHeight},
            "symbol": "BINANCE:${symbol}",
            "timezone": "Etc/UTC",
            "theme": "dark",
            "style": "1",
            "locale": "en",
            "toolbar_bg": "#f1f3f6",
            "interval": "${intervalHTMLConvert(interval)}",
            "studies": [
              "MF@tv-basicstudies",
              "MAExp@tv-basicstudies",
              "RSI@tv-basicstudies"
            ],
            "enable_publishing": false,
            "hide_top_toolbar": true,
            "save_image": false,
            "container_id": "tradingview_9a898"
          }
        );
      </script>
    </div>
  </body>
  </html>
  `
}

async function makeChartImage(symbol, interval) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({
    width: pageWidth,
    height: pageHeight,
    deviceScaleFactor: 1
  });

  await page.setContent(getChartHtmlPage(symbol, interval));

  await new Promise(r => setTimeout(r, 1500));
  const pathImage = `./tmp/${new Date().getTime()}_${symbol}_${interval}.png`
  await page.screenshot({ path: pathImage });
  return pathImage;
};

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

function htmlAlertFormatted(symbol, interval, signal, rsi, mfi, ohlc, ema14, ema100, ema200, fibonacci, sma, macd) {
  const lastOpen = formatNumber(ohlc.open[ohlc.close.length - 1]);
  const lastHigh = formatNumber(ohlc.high[ohlc.close.length - 1]);
  const lastLow = formatNumber(ohlc.low[ohlc.close.length - 1]);
  const lastClose = formatNumber(ohlc.close[ohlc.close.length - 1]);

  const ema14C = formatNumber(ema14.current);
  const ema100C = formatNumber(ema100.current);
  const ema200C = formatNumber(ema200.current);

  let fibCT = '';
  let fibPT = '';
  fibonacci.current.map(f => formatNumber(f)).forEach(f => fibCT === '' ? fibCT += f : fibCT += ', ' + f)
  fibonacci.previous.map(f => formatNumber(f)).forEach(f => fibPT === '' ? fibPT += f : fibPT += ', ' + f)

  const url = `https://www.tradingview.com/chart/?symbol=BINANCE:${symbol}`;
  const symbol_link = `<a href="${url}">${symbol}</a>`
  const profit = ((lastClose / lastOpen) - 1) * 100;
  let html =
    `<b>${symbol_link}_${interval} is <u>${signal.toUpperCase()}</u></b> (${formatNumber(lastClose - lastOpen)} ${profit.toFixed(2)}%)

  <b>RSI: </b><i>${rsi.current} | ${rsi.previous}</i>    <b>MFI: </b><i>${mfi.current} | ${mfi.previous}</i>
  <b>Open: </b> <i>${lastOpen}</i>       <b>High:  </b> <i>${lastHigh}</i>
  <b>Low:   </b> <i>${lastLow}</i>       <b>Close: </b> <i>${lastClose}</i>
  
  <b>EMA_14: </b> <i>${ema14C}</i>      <b>EMA_100: </b> <i>${ema100C}</i>
  <b>EMA_200: </b> <i>${ema200C}</i>
  
  <b>FIBONACCI Uptrend: </b> <i>${fibCT}</i>
  <b>FIBONACCI Downtrend: </b> <i>${fibPT}</i>
  `
  //  <b>SMA: </b> <i>${sma.current}</i>
  //  <b>MACD: </b> <i>${JSON.stringify(macd.current)}</i>
  return html;
}

function htmlAlertSummary(marketType, symbol, ticker, interval, signal, rsi, mfi, ohlc, ema9, ema100, cmSymbol) {
  const lastOpen = formatNumber(ohlc.open[ohlc.close.length - 1]);
  const lastClose = formatNumber(ohlc.close[ohlc.close.length - 1]);
  const lastVolume = formatNumber(ohlc.volume[ohlc.volume.length - 1]);
  const ema9C = formatNumber(ema9.current);
  const ema100C = formatNumber(ema100.current);
  //const symbolSuffix = marketType.includes('F') ? 'PERP' : '';
  const symbolSuffix = '';
  const url = `https://www.tradingview.com/chart/?symbol=BINANCE:${symbol}${symbolSuffix}`;
  //const url2 = `https://www.tradingview.com/symbols/${symbol}/`;
  const url2 = `https://coinmarketcap.com/currencies/${cmSymbol?.slug}/`;
  const symbol_link = `<a href="${url2}">${symbol}</a>`
  const signal_link = `<a href="${url}">${signal.toUpperCase()}</a>`
  const profit = ((lastClose / lastOpen) - 1) * 100;
  const ema9P = ((ema9.current / lastClose) - 1) * 100;

  const percentChange = parseFloat(ticker?.percentChange) || 0;
  const quoteVolume = compactNumber(parseFloat(ticker?.quoteVolume)) || 0;

  //console.log(ticker)

  let html =
    `<b>${symbol_link} ${interval} is <u>${signal_link}</u></b> (${profit.toFixed(2)}%)
    <b>RSI: </b><i>${rsi.current} | ${rsi.previous}</i>  <b>MFI: </b><i>${mfi.current} | ${mfi.previous}</i>
    <b>Close: </b> <i>${lastClose}</i> <b>EMA_9: </b> <i>${ema9C}</i> (${ema9P.toFixed(2)}%)
    <b>Vol 24h: </b><i>${quoteVolume}</i> <b>Price Change 24h: </b><i>${percentChange.toFixed(2)}%</i>
  `
  //console.log(html)
  return html;
}

const removeFile = (pathToFile) =>
  fs.unlink(pathToFile, function (err) {
    if (err) {
      throw err
    } else {
      console.log("Successfully deleted the file.")
    }
  })

async function getTopCoinmarketcap() {
  const api = axios.create({
    baseURL: 'https://pro-api.coinmarketcap.com/v1'
  });

  api.interceptors.request.use(async (config) => {
    config.headers['X-CMC_PRO_API_KEY'] = CMC_PRO_API_KEY
    return config;
  })

  // const urlFilter = `volume_24h_min=${MINIMUM_VOLUME_USD}&market_cap_min=${MINIMUM_MARKETCAP}&limit=${5000}`
  // const urlCMC = `/cryptocurrency/listings/latest?sort=market_cap&${urlFilter}`;
  // //console.log(urlCMC)
  const urlCMC = `/cryptocurrency/listings/latest?sort=market_cap`;
  //console.log(urlCMC)
  const result = await api.get(urlCMC);

  const cmSymbols = result.data.data.map(item => (
    {
      id: item.id,
      name: item.name,
      slug: item.slug,
      symbol: item.symbol,
      cmc_rank: item.cmc_rank,
      usdValue: item.quote.USD.price,
      usdVolume24h: item.quote.USD.volume_24h,
      usdPercentChange24h: item.quote.USD.percent_change_24h,
      market_cap: item.quote?.USD?.market_cap,
    }
  ))
  //console.log(cmSymbols.length);
  const topSymbols = [...cmSymbols].filter(s => s.cmc_rank <= TOP_X_TO_FAVORITE);
  //console.log(topSymbols);
  //console.log(cmSymbols.length);
  return [topSymbols, cmSymbols];
}

module.exports = {
  htmlAlertFormatted,
  htmlAlertSummary,
  makeChartImage,
  removeFile,
  formatNumber,
  compactNumber,
  getTopCoinmarketcap
}