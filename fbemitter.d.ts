declare module 'fbemitter' {
    export class EventEmitter {
        addListener(eventType: string, callback: Function): { remove: () => void };
        emit(eventType: string, ...args: any[]): void;
        removeAllListeners(): void;
        listeners(eventType: string): Function[];
    }
}