const express = require("express");
const cheerio = require("cheerio");
const axios = require("axios");
const randomUseragent = require("random-useragent");
const puppeteer = require("puppeteer");
// const router = require('./routes');
const rua = randomUseragent.getRandom();
const app = express();
var browser;
// app.use(router)
const getSeriesData = async (req, res) => {
  const page = await browser.newPage();
  await page.goto("https://www.cricbuzz.com/cricket-schedule/series");
  const { type } = req.query;
  if (type) {
    const selector = `[id="srs_category[${type}].dom_id"]`;
    await page.waitForSelector(selector);
    await page.click(selector);
  }
  let data = [];
  $ = cheerio.load(await page.content());
  await page.close();
  $(".cb-sch-lst-itm").each((i, elem) => {
    let mydata = cheerio.load($(elem).html());
    data.push({
      seriesId: mydata("a").attr("href").split("/")[2],
      name: mydata("span").text(),
      time: mydata("div").text(),
    });
  });
  res.send({ data });
};

const getSeriesDetails = async (req, res) => {
  const { id } = req.params;
  const page = await browser.newPage();
  await page.goto(
    `https://www.cricbuzz.com/cricket-series/${id}/the-ashes-2023/`
  );
  $ = cheerio.load(await page.content());
  let url;
  $(".cb-nav-tab").each((i, elem) => {
    if (i == 1) url = elem.attribs.href;
  });
  await page.goto(`https://www.cricbuzz.com/${url}`);
  $ = cheerio.load(await page.content());
  data = [];
  $(".cb-series-matches").each((i, elem) => {
    let mydata = cheerio.load($(elem).html());
    data.push({
      date: mydata(".schedule-date").text(),
      desc: mydata(".cb-col-60.cb-col.cb-srs-mtchs-tm").text(),
      time: mydata(".cb-col-40.cb-col.cb-srs-mtchs-tm").text(),
    });
  });
  res.send(data);
};

const selectorName = {
  sqd_box: ".cb-col-100.cb-col.cb-srs-sqd-box",
  sb_hdr: ".cb-col-100.cb-col.cb-srs-sqd-sb-hdr",
  col_20: ".cb-col.cb-col-20",
  left_tab:
    ".cb-col.cb-col-100.cb-series-brdr.cb-stats-lft-ancr.cb-stats-lft-tab-active",
  ful_comm: ".cb-col.cb-col-80.cb-ful-comm",
  hvr_underline: ".cb-col.cb-col-73 .cb-font-16.text-hvr-underline",
  text_gray: ".cb-col.cb-col-73 .cb-text-gray",
};

const getSquads = async (req, res) => {
  const { series_id } = req.params;
  const page = await browser.newPage();
  await page.goto(
    `https://www.cricbuzz.com/cricket-series/${series_id}/the-ashes-2023/squads`
  );
  let url;
  data = {};
  players = [];
  await page.waitForSelector(selectorName.sqd_box);
  const text = await page.$eval(selectorName.sqd_box, (elem) => elem.innerHTML);
  $ = cheerio.load(text);
  $(selectorName.sb_hdr).each((i, ele) => {
    let innerData = cheerio.load($(ele).html());
    innerData(selectorName.col_20).each(async (i, e) => {
      let newData = cheerio.load($(e).html());
      data.squads = [];
      for (const e of newData("a")) {
        const player = await getPlayersFromSeries(page, +e.attribs.id);
        data.squads.push({
          squadId: e.attribs.id,
          squadName: e.children[0].data,
          player,
        });
      }
      res.send({ data });
    });
  });
};

const getPlayersFromSeries = async (page, id) => {
  await page.waitForSelector(`[id="${id}"]`);
  await page.click(`[id="${id}"]`);
  await new Promise((r) => setTimeout(r, 500));
  const text = await page.$eval(selectorName.sqd_box, (elem) => elem.innerHTML);
  const newData = cheerio.load(text);
  let players = [];
  (data.matchTitle = newData(selectorName.left_tab).text()),
    newData(selectorName.ful_comm).each((i, ele) => {
      newData(".cb-col.cb-col-50").each((i, el) => {
        let playerId = el.attribs.href.split("/")[2];
        let player = cheerio.load($(el).html());
        let images = cheerio.load(player(".cb-col.cb-col-27").html());
        players.push({
          playerId,
          playerImage: `https://www.cricbuzz.com` + images("img").attr("src"),
          playerType: player(selectorName.text_gray).text(),
          playerName: player(selectorName.hvr_underline).text(),
        });
      });
    });
  return players;
};
const getStats = async (req, res) => {
  const page = await browser.newPage();
  await page.goto(
    `https://www.cricbuzz.com/cricket-series/4777/the-ashes-2023/stats`
  );
  $ = cheerio.load(await page.content());
  let myplayers = [];
  $(".cb-bg-white.cb-col-100.cb-col").each((i, elem) => {
    let mydata = cheerio.load($(elem).html());
    mydata(".cb-col-75.cb-col.pad10 ").each((i, ele) => {
      let pad10 = cheerio.load($(ele).html());
      headings = [];
      $("th").each((i, th) => {
        if (th.tagName === "th") {
          const heading = $(th).text();
          headings.push(heading || i);
        }
      });
      for (let tr of pad10(".cb-col-100.cb-col div table tbody tr")) {
        let player = {};
        let i = 0;
        tr.children.forEach((td) => {
          if (td.tagName === "td") player[headings[i++]] = $(td).text();
        });
        console.log(player);
        myplayers.push(player);
      }
    });
  });
  res.send(myplayers);
};

// player
const player = async (req, res) => {
    let intro = {};
    let Batting = [];
    let Bowling = [];
    let check = true;
    const { player_id , player_name } = req.params;
  const page = await browser.newPage();
  await page.goto(`https://m.cricbuzz.com/profiles/${player_id}/${player_name}`);
  $ = cheerio.load(await page.content());
  let img = cheerio.load($(".thumbnail").html());
  for (let x of $(".table.table-condensed tbody tr")) {
    let len = x.children.length;
    if (len === 2) {
      for (let i = 0; i < len; i += 1) {
        if (x.children[i].tagName === "td") {
          intro[$(x.children[i]).text()] = $(x.children[i + 1]).text();
        }
        break;
      }
    }
    if (len === 5 ) {
      for (let i = 0; i < len; i += 1) {
        if (x.children[i].tagName === "td") {
            if(check){
                Batting.push( {
                    "name" :  $(x.children[i]).text(),
                    "test": $(x.children[i + 1]).text() ,
                    "ODI" : $(x.children[i + 2]).text(),
                    "T20I" :   $(x.children[i + 3]).text(),
                    "IPL" : $(x.children[i + 4]).text(),
                })
                
                if($(x.children[i]).text() === '6s'){
                    check = false
                }
                break;
            }
            if(!check){
                Bowling.push( {
                    "name" :  $(x.children[i]).text(),
                    "test": $(x.children[i + 1]).text() ,
                    "ODI" : $(x.children[i + 2]).text(),
                    "T20I" :   $(x.children[i + 3]).text(),
                    "IPL" : $(x.children[i + 4]).text(),
                })
                break;
            }
        }
      }
    }
  }

  Batting.shift() 
  Bowling.shift()
  intro.img = "http:" + img("img").attr("src");
  intro.Batting = Batting;
  intro.Bowling = Bowling;
  intro.career = await career()
  res.send(intro);  
};

function career(){
    console.log(cheerio.load($(".cb-col.cb-col-100").html()))
    return "career"
}

app.get("/cricbuzz/series", getSeriesData);
app.get("/getStats", getStats);
app.get("/player/:player_id/:player_name", player);
app.get("/cricbuzz/series/:id", getSeriesDetails);
app.get("/cricbuzz/squads/:series_id", getSquads);

async function start() {
  browser = await puppeteer.launch({ headless: true });
  app.listen(3000);
}

start();