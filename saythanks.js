const Axios = require('axios');
const fs = require('fs');

const cookie = fs.readFileSync('./hda_cookie.secr', 'utf-8');
const list = fs.readFileSync('C:/users/n/desktop/ids.txt', 'utf-8').split('\n');
const sleep = async (time) => {
  return new Promise((res) => {
    setTimeout(res, time);
  });
};
const main = async () => {
  for (;;) {
    let id = Math.floor(Math.random() * 98165);
    if (list.some((value) => value === String(id))) {
      console.log('dupe');
      continue;
    }
    await Axios.post('https://hdarea.club/thanks.php', `id=${id}`, {
      headers: {
        cookie,
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
      },
    })
      .then(() => {
        console.log(id);
        fs.appendFileSync('C:/users/n/desktop/ids.txt', `${id}\n`);
      })
      .catch((e) => console.error(e));
    await sleep(Math.random() * 10000 + 5000);
  }
};

main();
