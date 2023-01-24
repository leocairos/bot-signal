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
* Create alert folder in root path
* Install dependencies
  ```bash
  npm install
  ```
* Run project 
  ```bash
  npm run dev
  ```

<br/>

## 💱 Available Indicators
- [X] fibonacciRetracement
- [X] MFI
  - Params: MFI(period = 14)
  - Return: Current and Previous value
- [X] RSI
  - Params: MFI(period = 14)
  - Return: Current and Previous value
- [X] MACD
- [X] SMA
- [X] EMA

## 📆 Roadmap

- [X] Connect to Binance Spot API
  - [X] Rest
  - [X] Websocket
- [X] Monitoring All available Symbols by Quote (Exchange Info)
  - [X] Spot
  - [X] Futures
- [X] Available Indicators
  - [X] RSI
  - [X] MFI
  - [X] MACD
  - [X] SMA
  - [X] EMA
  - [X] Fibonacci Retracement
- [X] Send formatted Telegram message
- [ ] Send Chart image on Telegram message
  - [ ] To process image is slowly. Need queue
- [X] Connect to Binance Futures API
  - [X] Rest
  - [!] Websocket (using same charts of Spot, because values are very near)
- [X] Suppress logs in production environment
- [ ] Option to monitor only favorite coins
  - [ ] ONLY_FAVORITE_S coin in .env (if is empty, monitor all, else, monitor only coins in param)
  - [ ] ONLY_FAVORITE_F coin in .env (if is empty, monitor all, else, monitor only coins in param)
- [X] Fix Scalp H7
  - [X] Use RSI and MFI correct params
  - [X] Use EMA 9
- [X] Fix URL coin only futures
- [ ] Show in the README all available indicators and its params
- [ ] Import strategy by JSON file
- [X] Save alerts to persistent model (JSON or Database)
  - [!] Need create folder alerts in root path
- [ ] Fix/Prevent telegram errors: 
  - [ ] Error: 400: Bad Request: message is too long
  - [ ] Error: 429: Too Many Requests: retry after 5
- [X] Bot receive texts and commands
  - [X] Receive any text and reply with available commands
  - [X] Receive commands
    - [X] /status to show last start log
    - [X] /summary to show last 30 days and 24 hours alerts
    - [ ] /top10 
- [ ] Summary Alerts
  - [X] One message every X time (.env SEND_ALERT_INTERVAL)
  - [ ] Sort Alerts by Quote Volume last 24h
  - [ ] Summary Alerts by Strategy
    - [ ] Summary (One message with all alerts by strategy on last time interval)
    - [ ] Top 5 coins on 3 last time interval

<br/>

## To create a screenshot of a web page with Puppeteer on Linux servers

So first on Linux servers we need to install these dependencies

```shell
sudo apt-get update

sudo apt-get install -y gconf-service libasound2 libatk1.0-0 libatk-bridge2.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget

sudo apt-get install -y libgbm-dev
```

## Tips

* To transfer files from remote server to local server
```shell
scp -P 2220 user@domain:/home/app/bot-signal/alerts/*.json .
```

## 📄 License

Code released under the [MIT License](./LICENSE).

Make by [Leonardo Cairo](https://www.linkedin.com/in/leocairos/)!


