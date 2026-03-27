const express = require("express");
const puppeteer = require("puppeteer"); // full Puppeteer, includes Chromium
const XLSX = require("xlsx");

const app = express();
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.get("/scrape", async (req, res) => {
  console.log("Starting scrape...");

  let browser;

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
    // Launch Puppeteer browser
    browser = await puppeteer.launch({
      executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium-browser",
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
    );

    for (const category of categories) {
      console.log(`Scraping category: ${category.name}`);
      const sheetData = [];

      for (let pageNum = 1; pageNum <= category.pages; pageNum++) {
        const url =
          pageNum === 1
            ? category.baseUrl
            : `${category.baseUrl}?page=${pageNum}`;
        console.log(`Visiting: ${url}`);

        try {
          await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
          await page.waitForSelector("table tbody tr", { timeout: 60000 });
          await new Promise((resolve) => setTimeout(resolve, 1000));

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

          sheetData.push(...data);
          console.log(`Page ${pageNum} scraped`);
        } catch (err) {
          console.warn(`Failed to scrape ${url}: ${err.message}`);
        }
      }

      const worksheet = XLSX.utils.json_to_sheet(sheetData);
      XLSX.utils.book_append_sheet(workbook, worksheet, category.name);
    }

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Disposition", "attachment; filename=rate.xlsx");
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.send(buffer);
  } catch (err) {
    console.error("Scrape error:", err);
    res.status(500).send("An error occurred during scraping");
  } finally {
    if (browser) await browser.close();
  }
});

app.listen(3000, () => console.log("Server running at http://localhost:3000"));
