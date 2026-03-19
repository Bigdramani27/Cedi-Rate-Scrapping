const express = require("express");
const puppeteer = require("puppeteer");
const { Parser } = require("json2csv");

const app = express();

app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.get("/scrape", async (req, res) => {
  const browser = await puppeteer.launch({
    headless: true,
    slowMo: 50
  });

  const page = await browser.newPage();
  const allData = [];

  try {
    for (let pageNum = 1; pageNum <= 4; pageNum++) {
      const url = `https://cedirates.com/exchange-rates/usd-to-ghs/?page=${pageNum}`;
      console.log(`Scraping ${url}...`);

      await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
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

      console.log(`Page ${pageNum} done`);
      allData.push(...data);
    }

    const parser = new Parser();
    const csv = parser.parse(allData);

    res.header("Content-Type", "text/csv");
    res.attachment("rate.csv");
    res.send(csv);

  } catch (err) {
    console.error(err);
    res.status(500).send("Error occurred");
  } finally {
    await browser.close();
  }
});

app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});