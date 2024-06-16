import { ElectronHandler } from '../../../desktop/src/preload';

declare global {
  interface Window {
    electron: ElectronHandler;
  }
}
