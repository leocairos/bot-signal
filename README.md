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
  npm run start
  ```

<br/>

## 💱 Available Indicators

- [X] ADX
- [X] Bollinger Bands
- [X] EMA
- [X] Fibonacci Retracement
- [X] MACD
- [X] MFI
- [X] RSI
- [X] SMA
- [X] Stochastic
- [X] TRIX


## 📆 Roadmap

- [X] Connect to Binance Spot API
  - [X] Rest
  - [X] Websocket
- [X] Monitoring All available Symbols by Quote (Exchange Info)
  - [X] Spot
  - [ ] Futures
- [X] Send formatted Telegram message
- [ ] Connect to Binance Futures API
  - [ ] Rest
  - [ ] Websocket (using same charts of Spot, because values are very near)
- [ ] Suppress logs in production environment
- [ ] Show in the README all available indicators and its params
- [ ] Import strategy by JSON file
- [ ] Save alerts to persistent model (JSON or Database)
  - [ ] Need create folder alerts in root path
- [X] Fix/Prevent telegram errors: 
  - [X] Error: 400: Bad Request: message is too long
  - [X] Error: 429: Too Many Requests: retry after 5
- [ ] Bot receive texts and commands
  - [ ] Receive any text and reply with available commands
  - [ ] Receive commands
    - [ ] /status to show last start log
    - [ ] /summary to show last 30 days and 24 hours alerts
    - [ ] /top10 
- [ ] Summary Alerts
  - [ ] One message every X time (.env SEND_ALERT_INTERVAL)
  - [ ] Sort Alerts by Quote Volume last 24h
  - [ ] Summary Alerts by Strategy
    - [ ] Summary (One message with all alerts by strategy on last time interval)
    - [ ] Top 5 coins on 3 last time interval
- [X] Exclude Symbols to monitor by env file (EXCLUDED_SYMBOLS)
- [X] Include Symbols to monitor by env file (INCLUDED_SYMBOLS)

<br/>

## 📄 License

Code released under the [MIT License](./LICENSE).

Make by [Leonardo Cairo](https://www.linkedin.com/in/leocairos/)!

