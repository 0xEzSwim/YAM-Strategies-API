import request from 'supertest';
import { router, ShutdownHttps, ShutdownHttp } from '../../src/server';

describe('The Server File', () => {
    afterAll((done) => {
        ShutdownHttps();
        ShutdownHttp(done);
    });

    it('Starts and has the proper environment', async () => {
        expect(process.env.NODE_ENV).toBe('test');
        expect(router).toBeDefined();
    }, 10000);

    it('Returns all options allowed to be called by client (http methods)', async () => {
        const response = await request(router).options('/');
        expect(response.status).toBe(200);
        expect(response.headers['access-control-allow-methods']).toBe('PUT, POST, PATCH, DELETE, GET');
    }, 10000);
});
