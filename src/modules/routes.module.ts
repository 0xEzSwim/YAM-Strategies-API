import { Express } from 'express';
import { RouteHandler } from '../library';

export const defineRoutes = (controllers: any, router: Express) => {
    for (let i = 0; i < controllers.length; i++) {
        const controller = new controllers[i]();

        const routeHandlers: RouteHandler = Reflect.getMetadata('routeHandlers', controller);
        const controllerPath: String = Reflect.getMetadata('baseRoute', controller.constructor);
        const methods: (keyof Express)[] = Array.from(routeHandlers.keys());

        for (let j = 0; j < methods.length; j++) {
            const method: keyof Express = methods[j];
            const routes = routeHandlers.get(method);

            if (routes) {
                const routeNames: string[] = Array.from(routes.keys());
                for (let k = 0; k < routeNames.length; k++) {
                    const handlers = routes.get(routeNames[k]);

                    if (handlers) {
                        router[method](controllerPath + routeNames[k], handlers);
                        logging.log('-> Loading route:', method, controllerPath + routeNames[k]);
                    }
                }
            }
        }
    }
};
