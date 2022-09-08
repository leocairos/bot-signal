
const { Telegraf } = require('telegraf')
const { removeFile, makeChartImage } = require('./util')

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

const bot = new Telegraf(BOT_TOKEN, { polling: true });

function sendMessageTelegram(message) {
  bot.telegram.sendMessage(CHAT_ID, message, { parse_mode: 'html' });
}

async function sendImageTelegram(symbol, interval) {
  const urlImage = await makeChartImage(symbol, interval);
  await bot.telegram.sendPhoto(CHAT_ID,  { source: urlImage} )
  removeFile(urlImage);
}

module.exports = { sendMessageTelegram, sendImageTelegram}