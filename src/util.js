const puppeteer = require('puppeteer');

const pageWidth = 860;
const pageHeight = 460;

function intervalHTMLConvert(interval){
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

function getChartHtmlPage(symbol, interval){
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

async function makeChartImage(symbol, interval){
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({
      width: pageWidth,
      height: pageHeight,
      deviceScaleFactor: 1
  });

  await page.setContent(getChartHtmlPage(symbol, interval));

  await new Promise(r => setTimeout(r, 2000));
  const pathImage = `./tmp/${symbol}_${interval}.png`
  await page.screenshot({path: pathImage });
  return pathImage;
};

function htmlAlertFormatted(symbol, interval, signal, rsi, mfi, ema14, ema100, ema200, ohlc){
  let html =`
  <b>YGGUSDT_15m is <u>OVERBOUGHT</u></b>

  <b>RSI: </b><i>82.01</i>           <b>MFI: </b><i>92.70</i>
  <b>EMA_14: </b> <i>0.50686488</i> <b>EMA_100: </b> <i>0.50686488</i>
  <b>EMA_200: </b> <i>0.50686488</i>
  
  <b>Open: </b> <i>0.50686488</i>   <b>High:  </b> <i>0.50686488</i>
  <b>Low:   </b> <i>0.50686488</i>   <b>Close: </b> <i>0.50686488</i>`
  return html;
}

module.exports = { htmlAlertFormatted, makeChartImage}