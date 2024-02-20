const express = require("express");
const { generateSlug } = require("random-word-slugs");
const { ECSClient, RunTaskCommand } = require("@aws-sdk/client-ecs");
const { Server } = require("socket.io");
const Redis = require("ioredis");
require('dotenv').config();
const app = express();

const PORT = 9000;

const subscriber = new Redis(
  `${process.env.REDIS_AIVEN_URI}`
);

const io = new Server({ cors: "*" });

io.listen(9001, () => console.log("Socket Server on 9001"));

io.on("connection", (socket) => {
  socket.on("subscribe", (channel) => {
    socket.join(channel);
    socket.emit("message", `Joined ${channel}`);
  });
});

const ecsClient = new ECSClient({
  region: "eu-north-1",
  credentials: {
    accessKeyId: `${process.env.ACCESS_ID_KEY}`,
    secretAccessKey: `${process.env.SECRET_ACCESS_KEY}`,
  },
});

console.log(process.env.ACCESS_ID_KEY);

const config = {
  CLUSTER: `arn:aws:ecs:eu-north-1:381492053463:cluster/vercelify-build-server-cluster`,
  TASK: `arn:aws:ecs:eu-north-1:381492053463:task-definition/vercelify-builder-server-task2`,
};

app.use(express.json());

app.post("/project", async (req, res) => {
  const { gitUrl } = req.body;
  const projectSlug = generateSlug();

  //spin the container

  const command = new RunTaskCommand({
    cluster: config.CLUSTER,
    taskDefinition: config.TASK,
    launchType: "FARGATE",
    count: 1,
    networkConfiguration: {
      awsvpcConfiguration: {
        assignPublicIp: "ENABLED",
        subnets: [
          "subnet-08752b48b302ac27d",
          "subnet-0f4eff334b9c46c60",
          "subnet-09fb5962cd16bff6b",
        ],
        securityGroups: ["sg-06c619ae8647464ca"],
      },
    },
    overrides: {
      containerOverrides: [
        {
          name: "vercelify-builder-server-container2",
          environment: [
            { name: "GIT_REPOSITORY__URL", value: gitUrl },
            { name: "PROJECT_ID", value: projectSlug },
          ],
        },
      ],
    },
  });

  await ecsClient.send(command);

  return res.json({
    status: "queued",
    data: { projectSlug, url: `http://${projectSlug}.localhost:8000` },
  });
});

async function initRedisSubscribe() {
  console.log("subscribe to logs...");
  subscriber.psubscribe("logs:*");
  subscriber.on("pmessage", (pattern, channel, message) => {
    io.to(channel).emit("message", message);
  });
}

initRedisSubscribe();

app.listen(PORT, () => {
  console.log(`Api Server on ${PORT}`);
});
