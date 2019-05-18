import { Application, CoreBindings } from '@loopback/core';
import { Context, inject } from '@loopback/context';
import { Connection, ConsumeMessage } from 'amqplib';
import { NodesService } from './services/NodesService';
import { TestService } from './services/TestService';
import { Logger } from 'winston';
import { KubernetesService } from './services/KubernetesService';

/**
 * Starts this service
 */
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

    @inject('config.scriptIndex')
    private scriptIndex: string;

    constructor(@inject(CoreBindings.APPLICATION_INSTANCE) public app?: Application) {
        super(app);
    }

    get listening() {
        return this._listening;
    }

    /**
     * Start the test
     */
    async start(): Promise<void> {
        const startTestChannel = await this.amqpConn.createChannel();
        const nodeReadyChannel = await this.amqpConn.createChannel();

        const queue = `${this.startTestQueue}.${this.jobId}`;

        const qok: any = await startTestChannel.assertExchange(queue, 'fanout', {durable: false});

        await startTestChannel.assertQueue('', {exclusive: true});

        await startTestChannel.bindQueue(qok.queue, queue, '');

        // Register node
        const node = await this.nodesService.registerNode();

        await nodeReadyChannel.assertQueue(this.nodeReadyQueue);

        this.logger.info('Registered node');
        this.logger.info(node.body);

        await nodeReadyChannel.sendToQueue(this.nodeReadyQueue, new Buffer((JSON.stringify({ready: true}))));

        // Wait for all nodes to be started then begin the test
        await startTestChannel.consume(qok.queue, async (message: ConsumeMessage) => {
            const parsed = JSON.parse((message).content.toString());

            const {successful, failed, dropped} = await this.testService.runTest(parsed.scripts[this.scriptIndex]);

            await this.nodesService.saveTestResults(node.body, successful, failed, dropped);

            await this.nodesService.sendTestCompleteMessage();

            await this.kubernetesService.shutdown();
        }, {noAck: true});
    }

    /**
     * Stops the server
     */
    async stop(): Promise<void> {
        await this.amqpConn.close();
    }
}
