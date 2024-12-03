import http from 'http';
import https from 'https';
import express from 'express';
import fs from 'fs';
import { server } from './config';
import 'reflect-metadata';
import { corsHandler, loggingHandler, notFoundHandler } from './middlewares';
import { defineRoutes } from './modules';
import { MainController, CryptoMarketController, CleanSatMiningController } from './controllers';
import { CleanSatMiningBusiness, YAMStrategyCSMBusiness } from './business';

export const router = express();
export let httpServer: ReturnType<typeof http.createServer>;
export let httpsServer: ReturnType<typeof https.createServer>;
var options = {
    key: fs.readFileSync('private-key.pem'),
    cert: fs.readFileSync('certificate.pem')
};

export const Main = async () => {
    logging.log('Initializing API');
    router.use(express.urlencoded({ extended: true }));
    router.use(express.json());
    logging.log('----------------------------------------\n');

    logging.log('Logging & Configuration');
    router.use(loggingHandler);
    router.use(corsHandler as express.RequestHandler);
    logging.log('----------------------------------------\n');

    logging.log('Define Controller Routing');
    logging.log('----------------------------------------');
    defineRoutes([MainController, CryptoMarketController, CleanSatMiningController], router);
    logging.log('----------------------------------------\n');

    logging.log('Define Routing Error');
    router.use(notFoundHandler as unknown as express.ErrorRequestHandler);
    logging.log('----------------------------------------\n');

    logging.log('Starting Server');
    logging.log('----------------------------------------');
    await YAMStrategyCSMBusiness.instance.listenToYAMStrategyCSMStorage();
    await CleanSatMiningBusiness.instance.getAllOffers();
    logging.log(`${CleanSatMiningBusiness.instance.offers?.length} CSM offers fetched`);
    await CleanSatMiningBusiness.instance.listenToNewSellingOffers();
    await CleanSatMiningBusiness.instance.listenToEditedSellingOffers();
    logging.log(`Listening to new and updated selling offers on CleanSat Mining`);
    httpsServer = https.createServer(options, router);
    httpsServer.listen(server.HTTPS_SERVER_PORT, () => {
        logging.log(`HTTPS Server started on https://${server.SERVER_HOSTNAME}:${server.HTTPS_SERVER_PORT}`);
    });
    httpServer = http.createServer(router);
    httpServer.listen(server.HTTP_SERVER_PORT, () => {
        logging.log(`HTTP Server started on http://${server.SERVER_HOSTNAME}:${server.HTTP_SERVER_PORT}`);
        logging.log('----------------------------------------\n');
    });
};

export const ShutdownHttps = (callback?: any) => httpsServer && httpsServer.close(callback);
export const ShutdownHttp = (callback?: any) => httpServer && httpServer.close(callback);

Main();
