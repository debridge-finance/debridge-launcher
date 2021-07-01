const log4js = require('log4js');
const axios = require("axios");

const chainlinkCredentials = {
    base: {
        email: process.env.CHAINLINK_EMAIL,
        password: process.env.CHAINLINK_PASSWORD
    },
    bsc: {
        email: process.env.CHAINLINK_EMAIL_BSC,
        password: process.env.CHAINLINK_PASSWORD_BSC
    },
    heco: {
        email: process.env.CHAINLINK_EMAIL_HECO,
        password: process.env.CHAINLINK_PASSWORD_HECO
    }
}

const log = log4js.getLogger("Chainlink");

class Chainlink {
    /* set chainlink cookies */
    async getChainlinkCookies(eiChainlinkUrl, network) {
        const sessionUrl = "/sessions";
        const headers = {
            "content-type": "application/json",
        };
        let body = chainlinkCredentials[network];// { email: emailAddress, password: password };

        //Set default if undefined
        if (!body || !body.email) {
            body = chainlinkCredentials.base;
            log.debug(`get base chainlinkCredentials: ${body.email}`);
        }

        const response = await axios.post(eiChainlinkUrl + sessionUrl, body, {
            headers,
        });
        const cookies = response.headers["set-cookie"];
        log.debug(cookies);
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

            log.debug(response.data.data);
            return response.data.data.attributes;
        }
        catch (e) {
            log.error(e);
        }
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
        log.debug('postChainlinkRun', data);
        const body = { result: data };

        const response = await axios.post(eiChainlinkUrl + postJobUrl, body, {
            headers,
        });
        log.debug('postChainlinkRun response', response.data.data);
        return response.data.data.id;
    }
}

module.exports.Chainlink = Chainlink;
