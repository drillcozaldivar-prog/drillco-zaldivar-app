export type NetworkState =
  | 'ONLINE'
  | 'OFFLINE'
  | 'LIMITED'
  | 'SERVER_DOWN'
  | 'SESSION_INVALID';

export class ConnectionProber {
  private static status: NetworkState = 'ONLINE';
  private static listeners: Set<(status: NetworkState) => void> = new Set();
  private static probeIntervalId: any = null;

  // Registrar callback para notificar cambios de conexión
  static subscribe(listener: (status: NetworkState) => void): () => void {
    this.listeners.add(listener);
    listener(this.status);
    return () => this.listeners.delete(listener);
  }

  // Iniciar sondeo periódico de conectividad real
  static startProbing(intervalMs: number = 10000) {
    if (this.probeIntervalId) return;

    this.checkConnection();
    this.probeIntervalId = setInterval(() => {
      this.checkConnection();
    }, intervalMs);

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.checkConnection());
      window.addEventListener('offline', () => this.notify('OFFLINE'));
    }
  }

  // Realizar prueba de conectividad real mediante fetch HTTP liviano con timeout
  static async checkConnection(): Promise<NetworkState> {
    if (typeof window !== 'undefined' && !navigator.onLine) {
      this.notify('OFFLINE');
      return 'OFFLINE';
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch('/api/health', {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        this.notify('ONLINE');
        return 'ONLINE';
      } else if (response.status === 401 || response.status === 403) {
        this.notify('SESSION_INVALID');
        return 'SESSION_INVALID';
      } else {
        this.notify('SERVER_DOWN');
        return 'SERVER_DOWN';
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        this.notify('LIMITED');
        return 'LIMITED';
      }
      this.notify('OFFLINE');
      return 'OFFLINE';
    }
  }

  private static notify(newStatus: NetworkState) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.listeners.forEach((listener) => listener(newStatus));
    }
  }

  static getStatus(): NetworkState {
    return this.status;
  }
}
