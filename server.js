const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const XLSX = require("xlsx");

const app = express();
app.use(express.static(__dirname));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

app.get("/scrape", async (req, res) => {
  console.log("Starting scrape...");

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
      console.log(`Scraping category: ${category.name}`);
      const sheetData = [];

      for (let pageNum = 1; pageNum <= category.pages; pageNum++) {
        const url =
          pageNum === 1
            ? category.baseUrl
            : `${category.baseUrl}?page=${pageNum}`;
        console.log(`Fetching URL: ${url}`);

        try {
          const { data } = await axios.get(url);
          const $ = cheerio.load(data);

          $("table tbody tr").each((i, row) => {
            const cols = $(row).find("td");
            sheetData.push({
              name: $(cols[1]).text().trim(),
              buying: $(cols[2]).text().trim(),
              selling: $(cols[3]).text().trim(),
              midRate: $(cols[4]).text().trim(),
            });
          });

          console.log(`Page ${pageNum} scraped`);
        } catch (err) {
          console.warn(`Failed to fetch ${url}: ${err.message}`);
        }
      }

      const worksheet = XLSX.utils.json_to_sheet(
        sheetData.length
          ? sheetData
          : [{ name: "No data", buying: "-", selling: "-", midRate: "-" }],
      );
      XLSX.utils.book_append_sheet(workbook, worksheet, category.name);
    }

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=rates_${new Date().toISOString().split("T")[0]}.xlsx`,
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.send(buffer);

    console.log("Scraping finished and Excel sent");
  } catch (err) {
    console.error("Scrape error:", err);
    res.status(500).send("An error occurred during scraping");
  }
});

app.listen(3000, () => console.log("Server running at http://localhost:3000"));
