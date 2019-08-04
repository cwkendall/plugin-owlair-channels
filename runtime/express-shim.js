const run = require("twilio-run").handlerToExpressRoute;
const express = require("express");
const morgan = require("morgan");

const app = express();
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(morgan("dev"));

app.all("/api/:name", (req, res) => {
  const twilioFunction = require(`./functions/${req.params.name}.js`).handler;
  console.log(req.url);
  run(twilioFunction, {
    logs: true,
    url: req.get('host'),
    env: process.env
  })(req, res);
});

module.exports = app;
