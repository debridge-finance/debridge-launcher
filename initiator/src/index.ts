process.env['NODE_CONFIG_DIR'] = __dirname + '/configs';

import App from './app';

const app = new App();

app.listen();
