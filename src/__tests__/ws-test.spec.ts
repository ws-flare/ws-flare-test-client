import { Channel } from 'amqplib';
import { apis, Container, getAMQPConn, getWsServer, restoreFS, setupK8sConfig, startMqContainer } from './test-helpers';
import * as nock from 'nock';
import { expect } from 'chai';
import * as WebSocket from 'ws';
import { OrchestrationApplication } from '../application';
import { main } from '..';

/**
 * Tests for web socket functionality
 */
describe('WS', () => {

    const startTestQueue = 'job.start.job1';
    const nodeReadyQueue = 'node.ready.node1';
    const nodeCompleteQueue = 'node.complete.job1';

    let app: OrchestrationApplication;
    let container: Container;
    let port: number;
    let startTestChannel: Channel;
    let nodeReadyChannel: Channel;
    let nodeCompleteChannel: Channel;
    let registerInterceptor: any;
    let saveTestResults: any;
    let shutdownSelf: any;
    let wsServer: WebSocket.Server;

    beforeEach(async () => {
        registerInterceptor = nock(apis.jobsApi)
            .intercept('/nodes', 'POST')
            .reply(200, {id: 'node1'});

        saveTestResults = nock(apis.jobsApi)
            .intercept('/nodes/node1', 'PATCH', {
                id: 'node1',
                running: false,
                totalSuccessfulConnections: 1000,
                totalFailedConnections: 0,
                totalDroppedConnections: 0
            })
            .reply(200, {});

        shutdownSelf = nock('http://localhost:9000')
            .intercept(/\/api\/v1\/namespaces\/default\/pods\/ws-flare-test-client-node1/g, 'DELETE')
            .reply(200, {});

        wsServer = getWsServer();

        ({container, port} = await startMqContainer());

        setupK8sConfig();

        app = await main({amqp: {port}});

        const conn = await getAMQPConn(port);
        startTestChannel = await conn.createChannel();
        nodeReadyChannel = await conn.createChannel();
        nodeCompleteChannel = await conn.createChannel();

        await nodeReadyChannel.assertQueue(nodeReadyQueue);
        await nodeCompleteChannel.assertQueue(nodeCompleteQueue);

        await startTestChannel.assertExchange(startTestQueue, 'fanout', {durable: false});
    });

    afterEach(async () => {
        await app.stop();
        await container.stop();
        wsServer.close();

        nock.cleanAll();
        nock.restore();
        nock.activate();
        restoreFS();
    });

    it('should register node with the jobs api', async () => {
        expect(registerInterceptor.isDone()).to.eql(true);
    });

    it('should stress test websocket server', async () => {
        let totalConnections = 0;
        let totalDisconnections = 0;
        let nodeReady = false;
        let nodeComplete = false;

        nock(apis.jobsApi)
            .post('/sockets')
            .times(2000)
            .reply(200, {id: 'abc123'});

        nock(apis.jobsApi)
            .patch('/sockets/abc123')
            .times(2000)
            .reply(200, {id: 'abc123'});

        wsServer.on('connection', (ws) => {
            totalConnections += 1;

            ws.on('close', () => {
                totalDisconnections += 1;
            });
        });

        await nodeReadyChannel.consume(nodeReadyQueue, () => {
            nodeReady = true;
        }, {noAck: true});

        await nodeCompleteChannel.consume(nodeCompleteQueue, () => {
            nodeComplete = true;
        }, {noAck: true});

        await new Promise(resolve => setTimeout(() => resolve(), 2000));

        await startTestChannel.publish(startTestQueue, '', new Buffer((JSON.stringify({
            start: true, scripts: [
                {
                    target: 'ws://localhost',
                    start: 0,
                    totalSimulators: 1000,
                    timeout: 30
                },
                {
                    target: 'ws://localhost:9001',
                    start: 0,
                    totalSimulators: 1000,
                    timeout: 0
                }
            ],
        }))));

        await new Promise(resolve => setTimeout(() => resolve(), 5000));

        expect(totalConnections).to.equal(1000);
        expect(totalDisconnections).to.equal(1000);

        expect(saveTestResults.isDone()).to.eql(true);
        expect(shutdownSelf.isDone()).to.eql(true);
        expect(nodeReady).to.eql(true);
        expect(nodeComplete).to.eql(true);
    });
});
