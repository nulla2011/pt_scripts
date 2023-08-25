import axios from 'axios';
import * as cheerio from 'cheerio';
import notifier from 'node-notifier';
import * as fs from 'fs';

const TORRENTS_URL = new URL('https://u2.dmhy.org/torrents.php');
const TEST_INTERVAL = 20 * 1000;
const INTERVAL = TEST_INTERVAL;

const cookie = fs.readFileSync(`${__dirname}/nexusphp_u2.ck`, 'utf-8');

function isFreeisLimitedTime(el: cheerio.Element): [boolean, boolean] {
  let $ = cheerio.load(el);
  let result: [boolean, boolean] = [false, false];
  let row = $('td:nth-child(2) table tr:nth-child(2) td:nth-child(1)');
  let freeIcon = $('img.pro_free2up,img.pro_free', row);
  let otherIcon = $('img.pro_custom', row);
  if (freeIcon.length != 0) {
    result[0] = true;
    result[1] = /将于 [^]* 终止/.test(freeIcon.next().text());
  } else if (otherIcon.length != 0) {
    let arrowdownIcon = $('img.pro_custom ~ img.arrowdown', row);
    result[0] = arrowdownIcon.next().text() == '0.00X';
    result[1] = /将于 [^]* 终止/.test(arrowdownIcon.next().next().text());
  }
  return result;
}
function getTitleEl(el: cheerio.Element) {
  let $ = cheerio.load(el);
  return $('td:nth-child(2) table tr:nth-child(1) td:nth-child(1) .tooltip');
}
function getTitle(el: cheerio.Element): string {
  let titleEl = getTitleEl(el);
  return titleEl.text();
}
function getID(el: cheerio.Element): number {
  let titleEl = getTitleEl(el);
  return parseInt(titleEl.attr('href')!.match(/id=(\d+)/)![1]);
}
function getPromotion(el: cheerio.Element) {}
interface ITorrentStatus {
  [key: number]: {
    title: string;
    isFree: boolean;
    isLimitedTime: boolean;
  };
}
async function getBookmarkItem() {
  let pageNum = 0;
  let torrents: ITorrentStatus = {};
  while (true) {
    if (pageNum == 6) return torrents;
    let page = await axios
      .get(TORRENTS_URL.href, {
        params: {
          inclbookmarked: 1,
          page: pageNum,
        },
        headers: { cookie: `nexusphp_u2=${cookie}` },
      })
      .catch((e) => (console.error(e.message), process.exit(1)));
    let $ = cheerio.load(page.data);
    $('.torrents > tbody > tr')
      .filter(function (i) {
        return $('.colhead', this).length == 0;
      })
      .each(function (i, el) {
        torrents[getID(el)] = {
          title: getTitle(el),
          isFree: isFreeisLimitedTime(el)[0],
          isLimitedTime: isFreeisLimitedTime(el)[1],
        };
      });
    pageNum++;
  }
}
async function alertFreeItem(itemList: ITorrentStatus) {
  for (const key in itemList) {
    if (itemList[key].isFree && itemList[key].isLimitedTime) {
      console.log(`FREE:  ${itemList[key].title}`);
    }
  }
}
function diffItemList(newList: ITorrentStatus, oldList: ITorrentStatus): ITorrentStatus {
  let result: ITorrentStatus = {};
  for (const key in newList) {
    if (newList[key].isFree != oldList[key]?.isFree) {
      result[key] = newList[key];
    }
  }
  return result;
}
async function main() {
  let itemList = await getBookmarkItem();
  if (Object.keys(itemList).every((i) => itemList[i as any].isFree)) {
    console.log('ALL FREE!');
  } else {
    alertFreeItem(itemList);
  }
  setInterval(async () => {
    let oldItemList = itemList;
    itemList = await getBookmarkItem();
    let diffList = diffItemList(itemList, oldItemList);
    if (Object.keys(itemList).every((i) => itemList[i as any].isFree)) {
      console.log('ALL FREE!');
    } else {
      alertFreeItem(diffList);
    }
  }, INTERVAL);
}

main();
