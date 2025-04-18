require('dotenv').config();
const express = require('express');
const line = require('@line/bot-sdk');
const { initDB, saveCheckin } = require('./database');
const { isNearby } = require('./utils');

const app = express();
const port = process.env.PORT || 3000;

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

const client = new line.Client(config);

// จุดตรวจที่อนุญาตให้เช็คอิน
const checkpoints = [
  { name: 'หน้าประตูใหญ่', lat: 13.123456, lon: 100.123456 },
  { name: 'โกดังสินค้า', lat: 13.111111, lon: 100.111111 }
];

app.post('/webhook', line.middleware(config), (req, res) => {
  Promise.all(req.body.events.map(handleEvent)).then(result => res.json(result));
});

const tempCheckins = {}; // เก็บ location ชั่วคราวก่อนรับรูป

async function handleEvent(event) {
  const userId = event.source.userId;

  if (event.type !== 'message') return;

  const message = event.message;

  if (message.type === 'location') {
    const { latitude, longitude } = message;
    const matchedCheckpoint = checkpoints.find(cp =>
      isNearby(latitude, longitude, cp.lat, cp.lon, 50)
    );

    if (!matchedCheckpoint) {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: 'คุณไม่ได้อยู่ในจุดตรวจที่อนุญาต โปรดเช็คตำแหน่งอีกครั้ง'
      });
    }

    // บันทึก location ชั่วคราว
    tempCheckins[userId] = {
      lat: latitude,
      lon: longitude,
      checkpoint: matchedCheckpoint.name,
      time: new Date().toISOString()
    };

    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: `พบคุณที่จุด: ${matchedCheckpoint.name} กรุณาส่งรูปถ่ายเพื่อเช็คอินให้สมบูรณ์`
    });
  }

  if (message.type === 'image' && tempCheckins[userId]) {
    const stream = await client.getMessageContent(message.id);
    const chunks = [];

    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);
    const base64Image = buffer.toString('base64');

    const checkinData = tempCheckins[userId];
    await saveCheckin({
      userId,
      checkpoint: checkinData.checkpoint,
      time: checkinData.time,
      image: base64Image
    });

    delete tempCheckins[userId];

    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: 'เช็คอินสำเร็จ ขอบคุณครับ'
    });
  }

  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: 'กรุณาส่งตำแหน่งก่อน แล้วจึงส่งรูปถ่ายครับ'
  });
}

initDB().then(() => {
  app.listen(port, () => {
    console.log(`Bot running at http://localhost:${port}`);
  });
});
