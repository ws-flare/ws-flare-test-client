import { Channel } from 'amqplib';
import { apis, Container, getAMQPConn, getWsServer, setupK8sConfig, startMqContainer } from './test-helpers';
import * as nock from 'nock';
import { expect } from 'chai';
import * as WebSocket from 'ws';
import { OrchestrationApplication } from '../application';
import { main } from '..';

describe('Orchestration', () => {

    const startTestQueue = 'job.start.job1';

    let app: OrchestrationApplication;
    let container: Container;
    let port: number;
    let startTestChannel: Channel;
    let registerInterceptor: any;
    let markNodeAsNotRunning: any;
    let shutdownSelf: any;
    let wsServer: WebSocket.Server;

    beforeEach(async () => {
        registerInterceptor = nock(apis.jobsApi)
            .intercept('/nodes', 'POST')
            .reply(200, {id: 'node1'});

        markNodeAsNotRunning = nock(apis.jobsApi)
            .intercept('/nodes/node1', 'PATCH')
            .reply(200, {});

        shutdownSelf = nock('http://localhost:9000')
            .intercept(/\/api\/v1\/namespaces\/default\/pods\/ws-flare-test-client-job1/g, 'DELETE')
            .reply(200, {});

        wsServer = getWsServer();

        ({container, port} = await startMqContainer());

        setupK8sConfig();

        app = await main({amqp: {port}});

        const conn = await getAMQPConn(port);
        startTestChannel = await conn.createChannel();

        await startTestChannel.assertExchange(startTestQueue, 'fanout', {durable: false});
    });

    afterEach(async () => {
        await app.stop();
        await container.stop();
        wsServer.close();

        nock.cleanAll();
        nock.restore();
        nock.activate();
    });

    it('should register node with the jobs api', async () => {
        expect(registerInterceptor.isDone()).to.eql(true);
    });

    it('should stress test websocket server', async () => {
        let totalConnections = 0;
        let totalDisconnections = 0;

        wsServer.on('connection', (ws) => {
            totalConnections += 1;

            ws.on('close', () => {
                totalDisconnections += 1;
            });
        });

        await new Promise(resolve => setTimeout(() => resolve(), 2000));

        await startTestChannel.publish(startTestQueue, '', new Buffer((JSON.stringify({start: true}))));

        await new Promise(resolve => setTimeout(() => resolve(), 5000));

        expect(totalConnections).to.equal(1000);
        expect(totalDisconnections).to.equal(1000);

        expect(markNodeAsNotRunning.isDone()).to.eql(true);
        expect(shutdownSelf.isDone()).to.eql(true);
    });
});
