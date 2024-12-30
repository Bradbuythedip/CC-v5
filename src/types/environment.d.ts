/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONTRACT_ADDRESS: string
  readonly VITE_CHAIN_ID: string
  readonly VITE_RPC_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '@ethersproject/units' {
  export function formatUnits(value: bigint | string, decimals?: number): string;
  export function parseUnits(value: string, decimals?: number): bigint;
}