import { Application, CoreBindings } from '@loopback/core';
import { Context, inject } from '@loopback/context';
import { Connection } from 'amqplib';
import { NodesService } from './services/NodesService';
import { TestService } from './services/TestService';
import { Logger } from 'winston';
import { KubernetesService } from './services/KubernetesService';

export class Server extends Context implements Server {
    private _listening: boolean = false;

    @inject('logger')
    private logger: Logger;

    @inject('amqp.conn')
    private amqpConn: Connection;

    @inject('queue.job.start')
    private startTestQueue: string;

    @inject('config.job.id')
    private jobId: string;

    @inject('services.nodes')
    private nodesService: NodesService;

    @inject('services.test')
    private testService: TestService;

    @inject('services.kubernetes')
    private kubernetesService: KubernetesService;

    @inject('queue.node.ready')
    private nodeReadyQueue: string;

    constructor(@inject(CoreBindings.APPLICATION_INSTANCE) public app?: Application) {
        super(app);
    }

    get listening() {
        return this._listening;
    }

    async start(): Promise<void> {
        const createJobChannel = await this.amqpConn.createChannel();
        const nodeReadyChannel = await this.amqpConn.createChannel();

        const queue = `${this.startTestQueue}.${this.jobId}`;

        const qok: any = await createJobChannel.assertExchange(queue, 'fanout', {durable: false});

        await createJobChannel.assertQueue('', {exclusive: true});

        await createJobChannel.bindQueue(qok.queue, queue, '');

        const node = await this.nodesService.registerNode();

        await nodeReadyChannel.assertQueue(this.nodeReadyQueue);

        this.logger.info('Registered node');
        this.logger.info(node.body);

        await nodeReadyChannel.sendToQueue(this.nodeReadyQueue, new Buffer((JSON.stringify({ready: true}))));

        await createJobChannel.consume(qok.queue, async () => {
            await this.testService.runTest();

            await this.nodesService.markNodeAsNotRunning(node.body);

            await this.kubernetesService.shutdown();
        }, {noAck: true});
    }

    async stop(): Promise<void> {
        await this.amqpConn.close();
    }
}
