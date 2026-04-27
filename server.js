const axios = require("axios");
const cheerio = require("cheerio");

app.get("/scrape", async (req, res) => {

  const categories = [
    {
      name: "All",
      baseUrl: "https://cedirates.com/exchange-rates/usd-to-ghs/",
      pages: 4
    },
    {
      name: "Banks",
      baseUrl: "https://cedirates.com/exchange-rates/usd-to-ghs/banks/",
      pages: 3
    },
    {
      name: "Forex Bureaus",
      baseUrl: "https://cedirates.com/exchange-rates/usd-to-ghs/forex-bureaus/",
      pages: 1
    },
    {
      name: "Cards",
      baseUrl: "https://cedirates.com/exchange-rates/usd-to-ghs/card-payments/",
      pages: 1
    },
    {
      name: "Remittances",
      baseUrl: "https://cedirates.com/exchange-rates/usd-to-ghs/money-transfers/",
      pages: 1
    },
    {
      name: "Crypto Exchanges",
      baseUrl: "https://cedirates.com/exchange-rates/usd-to-ghs/crypto-exchanges/",
      pages: 1
    }
  ];

  const workbook = XLSX.utils.book_new();

  try {
    for (const category of categories) {

      const sheetData = [];

      for (let pageNum = 1; pageNum <= category.pages; pageNum++) {

        const url =
          pageNum === 1
            ? category.baseUrl
            : `${category.baseUrl}?page=${pageNum}`;

        const { data: html } = await axios.get(url);

        const $ = cheerio.load(html);

        $("table tbody tr").each((i, el) => {
          const cols = $(el).find("td");

          sheetData.push({
            name: $(cols[1]).text().trim(),
            buying: $(cols[2]).text().trim(),
            selling: $(cols[3]).text().trim(),
            midRate: $(cols[4]).text().trim(),
          });
        });
      }

      const worksheet = XLSX.utils.json_to_sheet(sheetData);
      XLSX.utils.book_append_sheet(workbook, worksheet, category.name);
    }

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx"
    });

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=rate.xlsx"
    );

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.send(buffer);

  } catch (err) {
    console.error(err);
    res.status(500).send("Error occurred");
  }
});