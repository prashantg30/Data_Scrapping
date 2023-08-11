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
  console.log($('.cb-schdl-nvtb a').text())
  $(".cb-sch-lst-itm").each((i, elem) => {
    let mydata = cheerio.load($(elem).html());
    data.push({
      seriesId: mydata("a").attr("href").split("/")[2],
      name: mydata("span").text(),
      time: mydata("div").text(),
      year : mydata("a").attr("title").split(','),
      // mydata : mydata.html()
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
  let ie = []
  let check = true;
  const { player_id, player_name } = req.params;
  const page = await browser.newPage();
  await page.goto(`https://cricbuzz.com/profiles/${player_id}/${player_name}`);
  $ = cheerio.load(await page.content());
 
      // console.log($('.cb-col.cb-col-40.text-bold').text())
      console.log($('.cb-font-16.text-bold').text())
 
   //cb-col cb-col-60 cb-lst-itm-sm

  let i = 0;

  for (let x of $(".cb-plyr-tbl table tbody tr")) {

 
   if(i<=3){            
    Batting.push({
      name: $(x.children[1]).text(),
      m: $(x.children[3]).text(),
      inn: $(x.children[5]).text(),
      no: $(x.children[7]).text(),
      runs: $(x.children[9]).text(),
      hs: $(x.children[11]).text(),
      avg: $(x.children[13]).text(),
      bf: $(x.children[15]).text(),
      sr: $(x.children[17]).text(),
      '100': $(x.children[19]).text(),
      '200': $(x.children[21]).text(),
      '50': $(x.children[23]).text(),
      "4s ": $(x.children[25]).text(),
      "6s": $(x.children[27]).text(),
    });}
    if(i>3){
      Bowling.push({
        name: $(x.children[1]).text(),
        m: $(x.children[3]).text(),
        inn: $(x.children[5]).text(),
        b: $(x.children[7]).text(),
        runs: $(x.children[9]).text(),
        wkts: $(x.children[11]).text(),
        bbi: $(x.children[13]).text(),
        bbm: $(x.children[15]).text(),
        econ: $(x.children[17]).text(),
        'avg': $(x.children[19]).text(),
        'rs': $(x.children[21]).text(),
        '5w': $(x.children[23]).text(),
        "10w ": $(x.children[25]).text(),
      })
    }
    i++
  }
  intro.img = `https:/` + $(".cb-col.cb-col-20.cb-col-rt img").attr("src");
  intro.Batting = Batting;
  intro.Bowling = Bowling;
  intro.ie = ie
  intro.profile = $(".cb-col.cb-col-100.cb-player-bio").text();
  res.send(intro);
};

const getTeams = async (req, res) => {
  const page = await browser.newPage();
  await page.goto(`https://www.cricbuzz.com/cricket-team`);
  $ = cheerio.load(await page.content());
  let data = [];
  for (let x of $(".cb-schdl-nvtb a")) {
    console.log($(x).attr("href"));
    let teamData = await getTeamsfromUrl(
      `https://www.cricbuzz.com` + $(x).attr("href")
    );
    data.push({ teamType: $(x).text(), data: teamData });
  }

  return res.send(data);
};

async function getTeamsfromUrl(url) {
  const page = await browser.newPage();
  await page.goto(url);
  $ = cheerio.load(await page.content());
  let finalData = [];
  $(".cb-col.cb-col-100 .cb-col.cb-col-50 ").each((i, ele) => {
    let team = cheerio.load($(ele).html());
    finalData.push({
      teamId: team(".cb-col.cb-col-25 a").attr("href").split("/")[3],
      teamName: team("h2").text(),
      img: `https://cricbuzz.com` + team(".cb-col.cb-col-25 a img").attr("src"),
    });
  });
  return finalData;
}

app.get("/cricbuzz/series", getSeriesData);
app.get("/getStats", getStats);
app.get("/player/:player_id/:player_name", player);
app.get("/cricbuzz/series/:id", getSeriesDetails);
app.get("/cricbuzz/squads/:series_id", getSquads);
app.get("/cricbuzz/getteams", getTeams);

async function start() {
  browser = await puppeteer.launch({ headless: true });
  app.listen(3000);
}

start();
