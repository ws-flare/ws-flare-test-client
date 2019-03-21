import { Application, ApplicationConfig } from '@loopback/core';
import { connect } from 'amqplib';
import { Server } from './server';
import { NodesService } from './services/NodesService';
import { WebsocketService } from './services/WebsocketService';
import { TestService } from './services/TestService';
import { createLogger, transports } from 'winston';

export class OrchestrationApplication extends Application {

    constructor(options: ApplicationConfig = {}) {
        super(options);

        this.options.port = this.options.port || 3000;

        this.server(Server);

        const logger = createLogger({
            transports: [
                new transports.Console(),
            ],
        });

        // Logger
        this.bind('logger').to(logger);

        // Config
        this.bind('config.nodes.connectionLimitPerNode').to(1000);
        this.bind('config.job.id').to(options.config.jobId);
        this.bind('config.name').to(options.config.name);

        // Task
        this.bind('task.uri').to(options.task.uri);
        this.bind('task.totalSimulatedUsers').to(options.task.totalSimulatedUsers);
        this.bind('task.runTime').to(options.task.runTime);

        // Remote APIS
        this.bind('api.user').to(options.apis.userApi);
        this.bind('api.projects').to(options.apis.projectsApi);
        this.bind('api.jobs').to(options.apis.jobsApi);

        // AMQP
        this.bind('amqp.url').to(options.amqp.url);
        this.bind('amqp.port').to(options.amqp.port);
        this.bind('amqp.user').to(options.amqp.user);
        this.bind('amqp.pwd').to(options.amqp.pwd);
        this.bind('amqp.conn').toDynamicValue(async () => await connect({
            hostname: options.amqp.url,
            port: options.amqp.port,
            username: options.amqp.user,
            password: options.amqp.pwd
        }));

        // Queues
        this.bind('queue.job.start').to('job.start');

        // Services
        this.bind('services.nodes').toClass(NodesService);
        this.bind('services.websocket').toClass(WebsocketService);
        this.bind('services.test').toClass(TestService);
    }

}
