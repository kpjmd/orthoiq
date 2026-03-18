import { http, createConfig, createStorage, cookieStorage } from 'wagmi';
import { base } from 'wagmi/chains';
import { baseAccount, injected } from 'wagmi/connectors';
import { Attribution } from 'ox/erc8021';

// ERC-8021 Builder Code attribution — appended to all transactions automatically.
// Base App auto-appends this for in-app browser transactions; this config ensures
// coverage for web browser users too. Get code from base.dev → Settings → Builder Code.
const builderCode = process.env.NEXT_PUBLIC_BASE_BUILDER_CODE;
const DATA_SUFFIX = builderCode
  ? Attribution.toDataSuffix({ codes: [builderCode] })
  : undefined;

export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    injected(),                           // MetaMask, Rabby, Coinbase extension, Base App injected wallet
    baseAccount({ appName: 'OrthoIQ' }), // Base Account (native Base App flow)
  ],
  storage: createStorage({ storage: cookieStorage }),
  ssr: true,
  transports: { [base.id]: http() },
  ...(DATA_SUFFIX && { dataSuffix: DATA_SUFFIX }),
});
