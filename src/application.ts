import { Application, ApplicationConfig } from '@loopback/core';
import { connect } from 'amqplib';
import { Server } from './server';

export class OrchestrationApplication extends Application {

    constructor(options: ApplicationConfig = {}) {
        super(options);

        this.options.port = this.options.port || 3000;

        this.server(Server);

        // Config
        this.bind('config.nodes.connectionLimitPerNode').to(1000);
        this.bind('config.kubernetes.testImage').to(options.kubernetes.testImage);

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
        this.bind('queue.job.create').to('job.create');
        this.bind('queue.job.start').to('job.start');
    }

}
