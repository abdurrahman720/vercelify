const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const mime = require("mime-types");
const Redis = require("ioredis")
require('dotenv').config();



const publisher  = new Redis(`rediss://default:AVNS__TgN9_aSXGWGllN9Xne@redis-vercelify-vercelify.a.aivencloud.com:16820`)


function publishLog(log) {
  publisher.publish(`logs:${PROJECT_ID}`, JSON.stringify(log))
}


const s3Client = new S3Client({
  region: "ap-south-1",
  credentials: {
    accessKeyId: `${process.env.ACCESS_ID_KEY}`,
    secretAccessKey: `${process.env.SECRET_ACCESS_KEY}`,
  },
});



const PROJECT_ID = process.env.PROJECT_ID;

async function init() {
  console.log("executing script...");

  publishLog('Build started...')

  const outDirPath = path.join(__dirname, "output");

  const p = exec(`cd ${outDirPath} && npm install && npm run build`);

  p.stdout.on("data", function (data) {
    console.log(data.toString());
    publishLog(data.toString())
  });

  p.stdout.on("error", function (data) {
    console.log("ERROR", data.toString());
    publishLog(`error - ${data.toString()}`)
  });

  p.on("close", async function () {
    console.log("Build Completed");
    publishLog("Build Completed...")
    const distFolderPath = path.join(__dirname, "output/dist");
    const distFolderContents = fs.readdirSync(distFolderPath, {
      recursive: true,
    }); // will get every folder under folder

    for (const file of distFolderContents) {
      const filePath = path.join(distFolderPath, file);

      if (fs.lstatSync(filePath).isDirectory()) {
        continue;
      }

      console.log("uploading file path");
      publishLog("Uploading file to s3...")
      //else read the files and upload on s3
      const command = new PutObjectCommand({
        Bucket: "vercelify",
        Key: `__outputs/${PROJECT_ID}/${file}`,
        Body: fs.createReadStream(filePath),
        ContentType: mime.lookup(filePath),
      });

      await s3Client.send(command);
      publishLog(`uploaded ${file}`)
      console.log("Uploaded,", filePath);
  
    }

    console.log("done...");
    publishLog("Done")
  });
}

init();
