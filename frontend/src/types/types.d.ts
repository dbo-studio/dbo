import { ElectronHandler } from '../../../desktop/preload';

declare global {
  interface Window {
    electron: ElectronHandler;
  }
}
