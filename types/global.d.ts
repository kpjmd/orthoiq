import { sdk } from '@farcaster/miniapp-sdk';

declare global {
  interface Window {
    __ORTHOIQ_MINI_APP__?: boolean;
    __FARCASTER_SDK__?: typeof sdk;
  }
}

export {};