
const ytdl = require('@distube/ytdl-core');
const axios = require('axios');

async function test() {
  const url = 'https://www.youtube.com/watch?v=jNQXAC9IVRw';
  console.log('Testing YouTube...');
  try {
    const info = await ytdl.getInfo(url);
    const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });
    console.log('Format found:', format.mimeType);
    console.log('URL:', format.url.substring(0, 50) + '...');
  } catch (e) {
    console.error('YT Error:', e.message);
  }

  const tkUrl = 'https://www.tiktok.com/@centraldaivete/video/7346394145021200134';
  console.log('Testing TikTok...');
  try {
    const tiktokRes = await axios.get(`https://tiklydown.eu.org/api/download?url=${encodeURIComponent(tkUrl)}`);
    console.log('TikTok Res:', tiktokRes.data.status);
  } catch (e) {
    console.error('TikTok Error:', e.message);
  }
}

test();
