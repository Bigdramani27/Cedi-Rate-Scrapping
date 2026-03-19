const express = require("express");
const puppeteer = require("puppeteer-core");
const chromium = require("chrome-aws-lambda");
const { Parser } = require("json2csv");

const app = express();

app.use(express.static(__dirname));

// home page
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

// SCRAPER ROUTE (IMPORTANT)
app.get("/scrape", async (req, res) => {
  let browser = null;

  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    const allData = [];

    for (let pageNum = 1; pageNum <= 4; pageNum++) {
      const url = `https://cedirates.com/exchange-rates/usd-to-ghs/?page=${pageNum}`;

      await page.goto(url, { waitUntil: "networkidle2" });
      await page.waitForSelector("table tbody tr");

      const data = await page.evaluate(() => {
        const rows = document.querySelectorAll("table tbody tr");

        return Array.from(rows).map(row => {
          const cols = row.querySelectorAll("td");

          return {
            name: cols[1]?.innerText.trim(),
            buying: cols[2]?.innerText.trim(),
            selling: cols[3]?.innerText.trim(),
            midRate: cols[4]?.innerText.trim(),
          };
        });
      });

      allData.push(...data);
    }

    const parser = new Parser();
    const csv = parser.parse(allData);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=rates.csv");
    res.status(200).send(csv);

  } catch (err) {
    console.error(err);
    res.status(500).send("Scraping failed");
  } finally {
    if (browser) await browser.close();
  }
});

module.exports = app;