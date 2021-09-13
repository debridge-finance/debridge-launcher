export interface Logger {
  debug: (message: any, ...args: any[]) => void;
  info: (message: any, ...args: any[]) => void;
  error: (message: any, ...args: any[]) => void;
}
