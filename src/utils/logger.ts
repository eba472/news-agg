export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  info(message: string, ...args: any[]) {
    console.log(`[${new Date().toISOString()}] [${this.context}] INFO:`, message, ...args);
  }

  error(message: string, error?: any) {
    console.error(`[${new Date().toISOString()}] [${this.context}] ERROR:`, message, error);
  }

  warn(message: string, ...args: any[]) {
    console.warn(`[${new Date().toISOString()}] [${this.context}] WARN:`, message, ...args);
  }

  debug(message: string, ...args: any[]) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[${new Date().toISOString()}] [${this.context}] DEBUG:`, message, ...args);
    }
  }

  success(message: string, ...args: any[]) {
    console.log(`[${new Date().toISOString()}] [${this.context}] ✅:`, message, ...args);
  }
}
