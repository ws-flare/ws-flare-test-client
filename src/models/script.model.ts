export interface Script {
    start: number; // Seconds
    timeout: number; // Seconds
    totalSimulators: number;
    target: string;
    retryLimit: number;
    payloads?: SocketPayload[];
}

export interface SocketPayload {
    start: number; // Seconds
    payload: any;
}
