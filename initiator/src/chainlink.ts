import log4js from "log4js";
import axios from "axios";
import credentials from "./config/credentials.json";

const emailAddress = process.env.CHAINLINK_EMAIL;
const password = process.env.CHAINLINK_PASSWORD;

const log = log4js.getLogger("Chainlink");

class Chainlink {
    /* set chainlink cookies */
    async getChainlinkCookies(eiChainlinkUrl, network) {
        const sessionUrl = "/sessions";
        const headers = {
            "content-type": "application/json",
        };
        let body = { email: emailAddress, password: password };

        // get for the specific node if found
        let chainlinkCredentials = credentials[network];
        if (chainlinkCredentials !== undefined) {
            body = chainlinkCredentials;
            log.debug(`override base chainlinkCredentials: ${body.email}`);
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

export {
    Chainlink
};
