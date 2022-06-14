const axios = require("axios");

const TOKEN = "insert bot token here";
const CHAT_ID = "insert chat id here";

const { Telegraf } = require("telegraf");

const bot = new Telegraf(TOKEN);
bot.launch();

const notified = {};

const params = {
  bounds: {
    bottomLeft: { lat: 59.900084887067635, lng: 30.065132240916892 },
    topRight: { lat: 60.10777565720484, lng: 30.75830088105361 },
  },
  filters: {
    // banks: ["tcs"],
    showUnavailable: true,
    currencies: ["USD"],
    amounts: [{ currency: "USD", amount: 4000 }],
  },
  zoom: 12,
};

function getPoints(data) {
  const dictionary = {};
  const { clusters } = data.payload;
  for (let cluster of clusters) {
    const { points } = cluster;
    for (let point of points) {
      dictionary[point.id] = point;
    }
  }

  return dictionary;
}

const queue = [];

function queueMessage(message) {
    queue.push(message);
}

function sendMessage(message) {
    if (message.address) {
        bot.telegram.sendMessage(CHAT_ID, message.address);
    }
    if (message.lat) {
        bot.telegram.sendLocation(CHAT_ID, message.lat, message.lng);
    }
}

function notify(dictionary) {
    const keys = Object.keys(dictionary);
    const notifiedKeys = Object.keys(notified);
    const haveToNotify = keys.filter(key => !notifiedKeys.includes(key));

    for (let key of haveToNotify) {
        queueMessage({
            address: dictionary[key].address,
        });
        queueMessage({
            lng: dictionary[key].location.lng,
            lat: dictionary[key].location.lat,
        });
        notified[key] = dictionary[key];
    }
}

function getUpdates() {
    axios
        .post("https://api.tinkoff.ru/geo/withdraw/clusters", params)
        .then((res) => {
            notify(getPoints(res.data));
        })
        .catch((error) => {
            console.error(error);
        });

    const newMessage = queue.pop();

    if (newMessage) {
        sendMessage(newMessage);
    }
}

setInterval(getUpdates, 5000);

