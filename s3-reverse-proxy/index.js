const express = require("express");
const httpProxy = require("http-proxy");

const app = express();

const PORT = 8000;

const BASE_PATH = `https://vercelify.s3.ap-south-1.amazonaws.com/__outputs`;

const proxy = httpProxy.createProxy();

app.use((req, res) => {
  const hostName = req.hostname;
  console.log("hostName...", hostName);

  const subDomain = hostName.split(".")[0];
  console.log("splitting hostname...", hostName.split("."));

  console.log("subDomain...", subDomain);

  const resolvesTo = `${BASE_PATH}/${subDomain}`;

    console.log("resolving to path... ", resolvesTo);
    
    return proxy.web(req, res, { target: resolvesTo, changeOrigin: true });
    

});

proxy.on('proxyReq', (proxyReq, req, res) => {
    const url = req.url;
    
    if (url === '/') {
        
    }
})

app.listen(PORT, () => {
  console.log(`Reverse Proxy on ${PORT}`);
});
