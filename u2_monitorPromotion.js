"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const cheerio = __importStar(require("cheerio"));
const fs = __importStar(require("fs"));
const TORRENTS_URL = new URL('https://u2.dmhy.org/torrents.php');
const TEST_INTERVAL = 20 * 1000;
const INTERVAL = TEST_INTERVAL;
const cookie = fs.readFileSync(`${__dirname}/nexusphp_u2.ck`, 'utf-8');
function isFreeisLimitedTime(el) {
    let $ = cheerio.load(el);
    let result = [false, false];
    let row = $('td:nth-child(2) table tr:nth-child(2) td:nth-child(1)');
    let freeIcon = $('img.pro_free2up,img.pro_free', row);
    let otherIcon = $('img.pro_custom', row);
    if (freeIcon.length != 0) {
        result[0] = true;
        result[1] = /将于 [^]* 终止/.test(freeIcon.next().text());
    }
    else if (otherIcon.length != 0) {
        let arrowdownIcon = $('img.pro_custom ~ img.arrowdown', row);
        result[0] = arrowdownIcon.next().text() == "0.00X";
        result[1] = /将于 [^]* 终止/.test(arrowdownIcon.next().next().text());
    }
    return result;
}
function getTitleEl(el) {
    let $ = cheerio.load(el);
    return $('td:nth-child(2) table tr:nth-child(1) td:nth-child(1) .tooltip');
}
function getTitle(el) {
    let titleEl = getTitleEl(el);
    return titleEl.text();
}
function getID(el) {
    let titleEl = getTitleEl(el);
    return parseInt(titleEl.attr('href').match(/id=(\d+)/)[1]);
}
function getPromotion(el) {
}
function getBookmarkItem() {
    return __awaiter(this, void 0, void 0, function* () {
        let pageNum = 0;
        let torrents = {};
        while (true) {
            if (pageNum == 6)
                return torrents;
            let page = yield axios_1.default.get(TORRENTS_URL.href, {
                params: {
                    inclbookmarked: 1,
                    page: pageNum
                },
                headers: { 'cookie': `nexusphp_u2=${cookie}` }
            });
            let $ = cheerio.load(page.data);
            $('.torrents > tbody > tr').filter(function (i) { return $('.colhead', this).length == 0; }).each(function (i, el) {
                torrents[getID(el)] = { title: getTitle(el), isFree: isFreeisLimitedTime(el)[0], isLimitedTime: isFreeisLimitedTime(el)[1] };
            });
            pageNum++;
        }
    });
}
function alertFreeItem(itemList) {
    return __awaiter(this, void 0, void 0, function* () {
        for (const key in itemList) {
            if (itemList[key].isFree && itemList[key].isLimitedTime) {
                console.log(`FREE:  ${itemList[key].title}`);
            }
        }
    });
}
function diffItemList(newList, oldList) {
    var _a;
    let result = {};
    for (const key in newList) {
        if (newList[key].isFree != ((_a = oldList[key]) === null || _a === void 0 ? void 0 : _a.isFree)) {
            result[key] = newList[key];
        }
    }
    return result;
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        let itemList = yield getBookmarkItem();
        if (Object.keys(itemList).every((i) => itemList[i].isFree)) {
            console.log("ALL FREE!");
        }
        else {
            alertFreeItem(itemList);
        }
        setInterval(() => __awaiter(this, void 0, void 0, function* () {
            let oldItemList = itemList;
            itemList = yield getBookmarkItem();
            let diffList = diffItemList(itemList, oldItemList);
            if (Object.keys(itemList).every((i) => itemList[i].isFree)) {
                console.log("ALL FREE!");
            }
            else {
                alertFreeItem(diffList);
            }
        }), INTERVAL);
    });
}
main();
