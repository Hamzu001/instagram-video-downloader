import puppeteer from "puppeteer";
import cors from "cors";
import http from "https";
import fs from "fs";
import express from "express";
import { v4 as uuidv4 } from "uuid";
const app = express();

app.use(cors());

app.use(express.static("./public"));

app.use(express.json());

app.post("/instapi", async (req, res) => {
  console.log(req.body.url);
try {
  const browser = await puppeteer.launch({ headless: "new" }); //{headless: false}
  const page = await browser.newPage();

  await page.goto(req.body.url);

  await page.setViewport({ width: 1080, height: 1024 });

  const video = page.waitForSelector("video");
  const error = page.waitForSelector("section > main > div > div > span");

  await Promise.race([video,error])
  
  // await page.waitForNavigation({
  //   waitUntil: "networkidle0",
  // });
  const video_url = await page.evaluate(async () => {
    let url = null;
      try {
        url = document.querySelector("video").getAttribute("src");
      } catch (e) {
        console.log("error no video");
      }
    return url;
  });

  if (video_url) {
    const filename = "videos/" + Date.now() + "-" + uuidv4() + ".mp4";
    const file = fs.createWriteStream("./public/" + filename);
    http.get(video_url, function (response) {
      response.pipe(file);

      // after download completed close filestream
      file.on("finish", () => {
        file.close();
        console.log("Download Completed");
        res.send({ url: filename });
      });
    });
  }
  else{
    res.send({ url: null });

  }

  console.log({ url: video_url });
  await browser.close();
   
} catch (e) {
  res.send({ url: null })
}
});

app.listen(5000);

const interval = 10 * 60 * 1000;

setInterval(() => {
  console.log(new Date());
  const time = Date.now() - interval;
  fs.readdirSync("./public/videos").forEach((file) => {
    if (file.split("-")[0] < time) {
      fs.unlinkSync("./public/videos/" + file);
    }
  });
}, interval);
