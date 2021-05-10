const axios = require("axios");
const emailAddress = process.env.EMAIL_ADDRESS;
const password = process.env.PASSWORD;

class Chainlink {
  /* set chainlink cookies */
  async getChainlinkCookies(eiChainlinkUrl) {
    const sessionUrl = "/sessions";
    const headers = {
      "content-type": "application/json",
    };
    const body = { email: emailAddress, password: password };
    const response = await axios.post(eiChainlinkUrl + sessionUrl, body, {
      headers,
    });
    const cookies = response.headers["set-cookie"];
    return JSON.stringify(cookies);
  }

  /* set chainlink cookies */
  async getChainlinkRun(eiChainlinkUrl, runId, cookie) {
    const getRunUrl = "/v2/runs/" + runId;
    const headers = {
      "content-type": "application/json",
      Cookie: JSON.parse(cookie),
    };

    try {
      const response = await axios.get(eiChainlinkUrl + getRunUrl, {
        headers,
      });
      return response.data.data.attributes;
    } catch (e) {}
  }

  /* post chainlink run */
  async postChainlinkRun(
    jobId,
    data,
    eiChainlinkUrl,
    eiIcAccessKey,
    eiIcSecret
  ) {
    const postJobUrl = "/v2/specs/" + jobId + "/runs";
    const headers = {
      "content-type": "application/json",
      "X-Chainlink-EA-AccessKey": eiIcAccessKey,
      "X-Chainlink-EA-Secret": eiIcSecret,
    };
    const body = { result: data };

    const response = await axios.post(eiChainlinkUrl + postJobUrl, body, {
      headers,
    });
    return response.data.data.id;
  }
}

module.exports.Chainlink = Chainlink;
