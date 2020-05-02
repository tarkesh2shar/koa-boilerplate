import Koa from 'koa';
import { createContainer, AwilixContainer, asValue } from 'awilix';
import { scopePerRequest, loadControllers } from 'awilix-koa';
import { createConnection, Connection } from 'typeorm';
import bodyParser from 'koa-bodyparser';
import kcors from 'kcors';

import errorMiddleware from './middleware/ErrorMiddleware';
import Logger from './Logger';
import SecurityService from './services/SecurityService';

export async function connectWithRetry(): Promise<Connection> {
	try {
		return await createConnection();
	} catch (err) {
		Logger.error('failed to connect to db on startup - retrying in 5 seconds ', err);
		await new Promise((resolve: any) => setTimeout(resolve, 5000));
		return connectWithRetry();
	}
}

export async function createApp(): Promise<Koa> {
	const app: Koa = new Koa();

	const securityService: SecurityService = new SecurityService();
	const connection: Connection = await connectWithRetry();

	Logger.info('successfully established db connection');

	const container: AwilixContainer = createContainer().register({
		securityService: asValue(securityService),
		connection: asValue(connection),
	});

	app
		.use(kcors())
		.use(bodyParser())
		.use(scopePerRequest(container))
		.use(errorMiddleware)
		.use(loadControllers('controllers/*.{ts,js}', { cwd: __dirname }));

	return app;
}
