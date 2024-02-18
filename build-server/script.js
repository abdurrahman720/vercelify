const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const mime = require("mime-types");

const s3Client = new S3Client({
  region: "ap-south-1",
  credentials: {
    accessKeyId: ``,
    secretAccessKey: ``,
  },
});

console.log(process.env.ACCESS_ID_KEY)

const PROJECT_ID = process.env.PROJECT_ID;

async function init() {
  console.log("executing script...");

  const outDirPath = path.join(__dirname, "output");

  const p = exec(`cd ${outDirPath} && npm install && npm run build`);

  p.stdout.on("data", function (data) {
    console.log(data.toString());
  });

  p.stdout.on("error", function (data) {
    console.log("ERROR", data.toString());
  });

  p.on("close", async function () {
    console.log("Build Completed");
    const distFolderPath = path.join(__dirname, "output/dist");
    const distFolderContents = fs.readdirSync(distFolderPath, {
      recursive: true,
    }); // will get every folder under folder

    for (const file of distFolderContents) {
      const filePath = path.join(distFolderPath, file);

      if (fs.lstatSync(filePath).isDirectory()) {
        continue;
      }
        
        console.log("uploading file path")
      //else read the files and upload on s3
      const command = new PutObjectCommand({
        Bucket: "vercelify",
        Key: `__outputs/${PROJECT_ID}/${filePath}`,
        Body: fs.createReadStream(filePath),
        ContentType: mime.lookup(filePath),
      });

        await s3Client.send(command);
        console.log("Uploaded,", filePath)
    }

    console.log("done...");
  });
}

init();
