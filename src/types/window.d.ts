import { Provider } from 'quais';

declare global {
  interface Window {
    pelagus?: Provider & {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (eventName: string, handler: (...args: any[]) => void) => void;
      removeListener: (eventName: string, handler: (...args: any[]) => void) => void;
      isConnected: () => boolean;
      send: (method: string, params?: any[]) => Promise<any>;
    };
  }
}

export {};