const express = require("express");
const puppeteer = require("puppeteer");
const XLSX = require("xlsx");

const app = express();
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.get("/scrape", async (req, res) => {
  const PORT = process.env.PORT || 3000;

  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });

  const page = await browser.newPage();

  const categories = [
    {
      name: "All",
      baseUrl: "https://cedirates.com/exchange-rates/usd-to-ghs/",
      pages: 4,
    },
    {
      name: "Banks",
      baseUrl: "https://cedirates.com/exchange-rates/usd-to-ghs/banks/",
      pages: 3,
    },
    {
      name: "Forex Bureaus",
      baseUrl: "https://cedirates.com/exchange-rates/usd-to-ghs/forex-bureaus/",
      pages: 1,
    },
    {
      name: "Cards",
      baseUrl: "https://cedirates.com/exchange-rates/usd-to-ghs/card-payments/",
      pages: 1,
    },
    {
      name: "Remittances",
      baseUrl:
        "https://cedirates.com/exchange-rates/usd-to-ghs/money-transfers/",
      pages: 1,
    },
    {
      name: "Crypto Exchanges",
      baseUrl:
        "https://cedirates.com/exchange-rates/usd-to-ghs/crypto-exchanges/",
      pages: 1,
    },
  ];

  const workbook = XLSX.utils.book_new();

  try {
    for (const category of categories) {
      console.log(`\n=== Scraping ${category.name} ===`);
      const sheetData = [];

      for (let pageNum = 1; pageNum <= category.pages; pageNum++) {
        const url =
          pageNum === 1
            ? category.baseUrl
            : `${category.baseUrl}?page=${pageNum}`;
        console.log(`Scraping ${url}...`);

        await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
        await page.waitForSelector("table tbody tr");

        const data = await page.evaluate(() => {
          const rows = document.querySelectorAll("table tbody tr");
          return Array.from(rows).map((row) => {
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
        sheetData.push(...data);
      }

      const worksheet = XLSX.utils.json_to_sheet(sheetData);
      XLSX.utils.book_append_sheet(workbook, worksheet, category.name);
    }

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    const today = new Date().toISOString().split("T")[0];
    const filename = `rates_${today}.xlsx`;

    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error occurred");
  } finally {
    await browser.close();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
