declare global {
    namespace NodeJS {
        interface ProcessEnv {
            NODE_ENV: 'development' | 'production';
            PORT?: string;
            MIN_CONFIRMATIONS: string;
            CHAINLINK_EMAIL: string;
            CHAINLINK_PASSWORD: string;
        }
    }
}

export {}