# Bot Crypto Signal

A Bot Crypto to send Signal for your Telegram chat.

This Bot connect in Binance Api and monitoring Candles by Stream.

**Requires:**
  * NodeJS v14.16.0+

<br/>

## 🚀 How to execute

* Clone this repository
* Access the folder
* Create a .env file (use .env.example to help)
* Install dependencies
  ```bash
  npm install
  ```
* Run project 
  ```bash
  npm run dev
  ```

<br/>

## 📆 Roadmap

- [X] Connect to Binance Spot API
  - [X] Rest
  - [X] Websocket
- [ ] Monitoring All available Symbols by Quote
  - [X] Spot
  - [ ] Futures
- [ ] Available Indicators
  - [X] RSI
  - [X] MFI
  - [ ] MACD
  - [ ] SMA
  - [X] EMA
  - [ ] Fibonacci Retracement
- [ ] Send formatted Telegram message
- [X] Check invert conditions to reduce redundant alerts
- [ ] Connect to Binance Futures API
  - [ ] Rest
  - [ ] Websocket

<br/>

## To create a screenshot of a web page with Puppeteer on Linux servers

So first on Linux servers we need to install these dependencies

```shell
sudo apt-get update

sudo apt-get install -y gconf-service libasound2 libatk1.0-0 libatk-bridge2.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget

sudo apt-get install -y libgbm-dev
```

## 📄 License

Code released under the [MIT License](./LICENSE).

Make by [Leonardo Cairo](https://www.linkedin.com/in/leocairos/)!
