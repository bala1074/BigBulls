// Note: Change the Jun 2024
// Run: node index.js > June2024.csv
const RECENT_QUARTER = "Jun 2024";
const PAST_QUARTER = "Mar 2024";

const DII = [
  "https://www.screener.in/people/97814/parag-parikh-flexi-cap-fund/",
  "https://www.screener.in/people/144848/mirae-asset-large-midcap-fund/",
  "https://www.screener.in/people/130713/3p-india-equity-fund-1/",
  "https://www.screener.in/people/116734/hdfc-mutual-fund-hdfc-mid-cap-nopportunities-fund/",
  "https://www.screener.in/people/5233/kotak-emergency-equity-scheme/",
  "https://www.screener.in/people/145014/quant-mutual-fund-quant-small-cap-fund/",
];
const FII = [
  "https://www.screener.in/people/131399/massachusetts-institue-of-technology/",
  "https://www.screener.in/people/19335/goldman-sachs-funds-goldman-sachs-india-equity-p/",
  "https://www.screener.in/people/436/small-cap-world-fund-inc/",
  "https://www.screener.in/people/73618/nalanda-india-equity-fund-nlimited/",
  "https://www.screener.in/people/1555/jupiter-india-fund/",
];

const BIGBULLS = [...DII, ...FII];

const puppeteer = require("puppeteer");
const HtmlTableToJson = require("html-table-to-json");

async function login(page) {
  // Navigate to the Screener login page
  await page.goto("https://www.screener.in/login/");

  // Enter login credentials (replace 'your-email' and 'your-password' with your actual credentials)
  await page.type("#id_username", "satish1074@gmail.com");
  await page.type("#id_password", "123_bala");

  // Click the login button
  await page.click('button[type="submit"]');

  // Wait for navigation after login
  // await page.waitForNavigation();
}

async function fetchFromUrl(page, url) {
  // Navigate to the specific page
  await page.goto(url);

  // Wait for the "shareholdings" div to load
  await page.waitForSelector("#shareholdings");

  const { key, tableHTML } = await page.evaluate(() => {
    const key = document.querySelector("h1").innerHTML;
    const tableHTML = document.querySelector("#shareholdings")?.innerHTML;
    return { key, tableHTML };
  });
  const formatVals = {};
  for (const item of HtmlTableToJson.parse(tableHTML)?.results[0]) {
    formatVals[item["1"]] = { [key]: item };
  }
  return formatVals;
}

async function fetchBigBulls(page) {
  let result = {};
  for (const url of BIGBULLS) {
    const res = await fetchFromUrl(page, url);
    for (const key in res) {
      if (result[key]) {
        result[key] = { ...result[key], ...res[key] };
      } else {
        result[key] = { ...res[key] };
      }
    }
  }
  return result;
}

function isValidNumber(str) {
  return !isNaN(str) && str.trim() !== "";
}

function performCalc(result) {
  const finalResult = {};
  for (const company in result) {
    finalResult[company] = {
      company,
      investedBy: [],
      recentAdds: [],
      recentDels: [],
    };

    const fundHouses = result[company];
    for (const fundName in fundHouses) {
      const fundDetails = fundHouses[fundName];
      finalResult[company].investedBy.push(fundName);

      const recent = isValidNumber(fundDetails[RECENT_QUARTER])
        ? parseFloat(fundDetails[RECENT_QUARTER])
        : 0;
      const past = isValidNumber(fundDetails[PAST_QUARTER])
        ? parseFloat(fundDetails[PAST_QUARTER])
        : 0;

      if (recent > 0 && past < recent) {
        finalResult[company].recentAdds.push(fundName);
      }
      if (past > 0 && past > recent) {
        finalResult[company].recentDels.push(fundName);
      }
    }
  }
  return Object.values(finalResult);
}

function log(res, type) {
  for (const item of res) {
    console.log(
      `${item.company},${type},${item.investedBy.length},${
        item.recentAdds.length
      },${item.recentDels.length},${item.investedBy?.join(
        " | "
      )},${item.recentAdds?.join(" | ")},${item.recentDels?.join(" | ")}`
    );
  }
}

function logRes(res) {
  console.log(
    `Company,Type,InvestedBy,RecentAdds,RecentDels,InvestedByList,RecentAddsList,RecentDelsList`
  );
  // recent adds
  let recentAdds = [...res];
  recentAdds = recentAdds.filter((item) => item.recentAdds.length >= 1);
  recentAdds.sort((a, b) => {
    return b.recentAdds.length == a.recentAdds.length
      ? b.investedBy.length - a.investedBy.length
      : b.recentAdds.length - a.recentAdds.length;
  });
  log(recentAdds, "RecentAdd");

  // recent dels
  let recentDels = [...res];
  recentDels = recentDels.filter((item) => item.recentDels.length >= 1);
  recentDels.sort((a, b) => {
    return b.recentDels.length == a.recentDels.length
      ? b.investedBy.length - a.investedBy.length
      : b.recentDels.length - a.recentDels.length;
  });
  log(recentDels, "RecentDel");

  //all
  log(res, "ALL");

  console.log(
    `Recent Adds: ${recentAdds.length}, Recent Dels: ${recentDels.length}, All: ${res.length} `
  );
}

async function goBigBull() {
  const browser = await puppeteer.launch({ headless: false }); // Set to true for headless mode
  const page = await browser.newPage();

  await login(page);

  const result = await fetchBigBulls(page);

  const calcRes = performCalc(result);

  logRes(calcRes);

  await browser.close();
}

// Run the function
goBigBull();
