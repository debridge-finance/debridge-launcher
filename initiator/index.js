require("dotenv-flow").config();
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const { Subscriber } = require("./src/subscriber");

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get("/", function (req, res) {
  res.sendStatus(200);
});

app.post("/jobs", function (req, res) {
  res.sendStatus(200);
});

/* TODO: add logger */
const server = app.listen(process.env.PORT || 8080, '127.0.0.1', async function () {
  const port = server.address().port;
  console.log("App now running on port", port);
  const subscriber = new Subscriber();
  await subscriber.init();
});
