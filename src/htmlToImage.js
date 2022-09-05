const puppeteer = require('puppeteer');

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
            "width": 860,
            "height": 460,
            "symbol": "BINANCE:${symbol}",
            "timezone": "Etc/UTC",
            "theme": "dark",
            "style": "1",
            "locale": "en",
            "toolbar_bg": "#f1f3f6",
            "interval": "${interval}",
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


async function htmlToImage(symbol, interval){
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({
      width: 860,
      height: 460,
      deviceScaleFactor: 1
  });

  await page.setContent(getHTML(symbol, interval));

  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({path: `./tmp/${symbol}_${interval}.png`});

};


module.exports = { getHTML, htmlToImage}