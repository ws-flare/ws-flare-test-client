import { Application, ApplicationConfig } from '@loopback/core';
import { Client1_10, config } from 'kubernetes-client';
import { connect } from 'amqplib';
import { Server } from './server';
import { NodesService } from './services/NodesService';
import { WebsocketService } from './services/WebsocketService';
import { TestService } from './services/TestService';
import { createLogger, transports } from 'winston';
import { KubernetesService } from './services/KubernetesService';
import { SocketsService } from './services/sockets.service';

/**
 * Bootstraps the loopback service and sets up dependency injection
 */
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
        this.bind('config.nodeId').to(options.config.nodeId);
        this.bind('config.totalSimulators').to(options.config.totalSimulators);
        this.bind('config.scriptIndex').to(options.config.scriptIndex);

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
        this.bind('queue.node.ready').to(`node.ready.${options.config.nodeId}`);
        this.bind('queue.node.complete').to(`node.complete.${options.config.jobId}`);

        // Services
        this.bind('services.nodes').toClass(NodesService);
        this.bind('services.websocket').toClass(WebsocketService);
        this.bind('services.test').toClass(TestService);
        this.bind('services.kubernetes').toClass(KubernetesService);
        this.bind('services.sockets').toClass(SocketsService);

        // Kubernetes
        this.bind('kubernetes.client').to(new Client1_10({config: config.getInCluster()}));
    }

}
