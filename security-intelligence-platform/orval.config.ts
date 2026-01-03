import { defineConfig } from 'orval';

export default defineConfig({
    api: {
        input: '../security-intelligence-platform-backend/swagger.json',
        output: {
            mode: 'single',
            target: './lib/api/index.ts',
            client: 'react-query',
            baseUrl: 'http://localhost:5000',
            override: {
                mutator: {
                    path: './lib/api/axios.ts',
                    name: 'customInstance',
                },
            },
        },
    },
});
