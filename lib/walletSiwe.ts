import { verifyMessage, getAddress, isAddress } from 'viem';

export interface SiweMessageParams {
  domain: string;
  uri: string;
  address: string;
  nonce: string;
  issuedAt: string;
  statement?: string;
  chainId?: number;
}

const DEFAULT_STATEMENT =
  'Sign in to OrthoIQ to link your wallet to your profile. This signature does not authorize any transaction.';

export function buildSiweMessage(params: SiweMessageParams): string {
  const statement = params.statement ?? DEFAULT_STATEMENT;
  const chainId = params.chainId ?? 1;
  // Plain SIWE-style template — keeping format simple and stable so we can reproduce
  // it verbatim during verification without depending on a third-party SIWE library.
  return (
    `${params.domain} wants you to sign in with your Ethereum account:\n` +
    `${getAddress(params.address)}\n\n` +
    `${statement}\n\n` +
    `URI: ${params.uri}\n` +
    `Version: 1\n` +
    `Chain ID: ${chainId}\n` +
    `Nonce: ${params.nonce}\n` +
    `Issued At: ${params.issuedAt}`
  );
}

export async function verifySiwe(opts: {
  message: string;
  signature: string;
  expectedAddress: string;
  expectedNonce: string;
  expectedDomain: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!isAddress(opts.expectedAddress)) {
    return { ok: false, reason: 'invalid_address' };
  }

  // Embedded fields must match what the caller expects — this is what prevents
  // a signature collected on another domain from being replayed here.
  if (!opts.message.startsWith(`${opts.expectedDomain} wants you to sign in`)) {
    return { ok: false, reason: 'domain_mismatch' };
  }
  if (!opts.message.includes(`\nNonce: ${opts.expectedNonce}\n`)) {
    return { ok: false, reason: 'nonce_mismatch' };
  }

  try {
    const valid = await verifyMessage({
      address: getAddress(opts.expectedAddress) as `0x${string}`,
      message: opts.message,
      signature: opts.signature as `0x${string}`,
    });
    if (!valid) return { ok: false, reason: 'signature_invalid' };
    return { ok: true };
  } catch (err) {
    console.error('[walletSiwe] verify error:', err);
    return { ok: false, reason: 'signature_invalid' };
  }
}

export function normalizeAddress(addr: string): string {
  return addr.toLowerCase();
}
