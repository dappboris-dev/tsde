import { getCpmmPdaPoolId, getPdaLpMint, getPdaObservationId, getPdaPoolAuthority, getPdaVault } from "@raydium-io/raydium-sdk-v2";
import { PublicKey } from "@solana/web3.js";

export function getCreatePoolKeys({
  poolId: propPoolId,
  programId,
  configId,
  mintA,
  mintB,
}: {
  poolId?: PublicKey;
  programId: PublicKey;
  configId: PublicKey;
  mintA: PublicKey;
  mintB: PublicKey;
}): {
  poolId: PublicKey;
  configId: PublicKey;
  authority: PublicKey;
  lpMint: PublicKey;
  vaultA: PublicKey;
  vaultB: PublicKey;
  observationId: PublicKey;
} {
  // const configId = getCpmmPdaAmmConfigId(programId, 0).publicKey;
  const authority = getPdaPoolAuthority(programId).publicKey;
  const poolId = propPoolId || getCpmmPdaPoolId(programId, configId, mintA, mintB).publicKey;
  const lpMint = getPdaLpMint(programId, poolId).publicKey;
  const vaultA = getPdaVault(programId, poolId, mintA).publicKey;
  const vaultB = getPdaVault(programId, poolId, mintB).publicKey;
  const observationId = getPdaObservationId(programId, poolId).publicKey;

  return {
    poolId,
    configId,
    authority,
    lpMint,
    vaultA,
    vaultB,
    observationId,
  };
}