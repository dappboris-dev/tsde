//@ts-ignore
import {
	createBurnCheckedInstruction,
	createCloseAccountInstruction,
	harvestWithheldTokensToMint,
	getAssociatedTokenAddressSync,
	NATIVE_MINT,
	TOKEN_PROGRAM_ID,
	TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { connection, wallet } from "./config";
import {
	Connection,
	PublicKey,
	Keypair,
	TransactionInstruction,
	clusterApiUrl,
  AccountMeta,
  SystemProgram
} from "@solana/web3.js";
import BN from "bn.js";
import { anchorDataBuf, buyExactOutInstruction,  getMultipleAccountsInfoWithCustomFlags,  getPdaCpiEvent, getPdaCreatorVault, LaunchpadConfig, LaunchpadPool, sellExactOut } from "@raydium-io/raydium-sdk-v2";
import { publicKey, str, struct, u16, u64, u8 } from "./clients/marshmallow";
import { 
	Raydium,
	TxVersion,
	getPdaLaunchpadPoolId,
	Curve,
	PlatformConfig,
	LAUNCHPAD_PROGRAM,
 } from "@raydium-io/raydium-sdk-v2";
import Decimal from 'decimal.js'
import { parseGlobalConfigAccount, parsePoolStateAccount, parsePlatformConfigAccount } from "./clients/encrypt";
import { cluster, SELL_EXACT_IN_DISCRIMINATOR, BUY_EXACT_IN_DISCRIMINATOR, RaydiumLaunchPadAccountKeys, FEE_RATE_DENOMINATOR_VALUE, RAYDIUM_LAUNCHLAB_MAINNET_ADDR, LAUNCHPAD_AUTH_SEED, LAUNCHPAD_POOL_EVENT_AUTH_SEED } from "./clients/constants";
import { BigNumber } from "bignumber.js";
import chalk from "chalk";
import { buyExactInIx } from "../raydiumcpmm/utils";

let raydium: Raydium | undefined;

export const burnAccount = async (wallet: Keypair, keypair: Keypair, connection: Connection, ata: PublicKey, tokenprogram: PublicKey) => {
	const instructions: Array<TransactionInstruction> = [];

	const ataInfo = // @ts-ignore
		(await connection.getParsedAccountInfo(ata)).value?.data.parsed.info;
	console.log("ata info", ataInfo);

	if (tokenprogram === TOKEN_2022_PROGRAM_ID) {
		const sig = await harvestWithheldTokensToMint(connection, keypair, new PublicKey(ataInfo.mint), [ata], undefined, tokenprogram);
	}
	// const solanaBalance = await connection.getBalance(keypair.publicKey);
	// console.log("token amount---------", ataInfo.tokenAmount.uiAmount);
	// console.log("sol balance---------", solanaBalance);

	if (ataInfo.tokenAmount.uiAmount != 0) {
	  const mint = ataInfo.mint;
	  const burnInx = createBurnCheckedInstruction(
	    ata,
	    new PublicKey(mint),
	    keypair.publicKey,
	    ataInfo.tokenAmount.amount,
	    ataInfo.tokenAmount.decimals,
	    [],
	    tokenprogram
	  );
	  instructions.push(burnInx);
	}

	const closeAtaInx = createCloseAccountInstruction(
		ata, // token account which you want to close
		wallet.publicKey, // destination
		keypair.publicKey, // owner of token account
		[],
		tokenprogram
	);
	instructions.push(closeAtaInx);
	return instructions;
	// for (let i = 0; i < instructions.length; i += 20) {
	//   const instructionsList = instructions.slice(
	//     i,
	//     Math.min(i + 20, instructions.length)
	//   );
	//   if (instructionsList.length == 0) break;
	//   const blockhash = await connection
	//     .getLatestBlockhash()
	//     .then((res) => res.blockhash);
	//   const messageV0 = new TransactionMessage({
	//     payerKey: keypair.publicKey,
	//     recentBlockhash: blockhash,
	//     instructions: [
	//       // ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 200000 }),
	//       ...instructionsList,
	//     ],
	//   }).compileToV0Message();

	//   const vtx = new VersionedTransaction(messageV0);
	//   vtx.sign([wallet, keypair]);

	//   const sim = await connection.simulateTransaction(vtx, {
	//     sigVerify: true,
	//   });
	//   console.log(sim);
	//   try {
	//     if (!sim.value.err) {
	//       const sig = await connection.sendTransaction(vtx);
	//       const closeConfirm = await connection.confirmTransaction(sig);
	//       console.log("sig", sig);
	//     } else console.error("simulation error");
	//   } catch (e) {
	//     console.error(e);
	//   }
	// }
};

/**
 * Retrieves the balance of an SPL token associated with a given token account.
 * @param {Connection} connection - The connection object for interacting with the Solana network.
 * @param {PublicKey} tokenAccount - The public key of the token account.
 * @param {PublicKey} payerPubKey - The public key of the payer account.
 * @returns {Promise<number>} The balance of the SPL token.
 * @throws {Error} If no balance is found.
 */
export async function getSPLTokenBalance(connection:Connection, tokenAccount:PublicKey, payerPubKey:PublicKey): Promise<number> {
  const address = getAssociatedTokenAddressSync(tokenAccount, payerPubKey);
  const info = await connection.getTokenAccountBalance(address);
  if (info.value.uiAmount == null) throw new Error("No balance found");
  return info.value.uiAmount;
}

export const buy = async (mint: string, amount: number, keypair: Keypair) => {
  const raydium = await initSdk({ keypair })

  const mintA = new PublicKey(mint)
  const mintB = NATIVE_MINT
  const inAmount = new BN(amount)

  const programId = LAUNCHPAD_PROGRAM // devnet: DEV_LAUNCHPAD_PROGRAM

  const poolId = getPdaLaunchpadPoolId(programId, mintA, mintB).publicKey
  const poolInfo = await raydium.launchpad.getRpcPoolInfo({ poolId })
  const data = await raydium.connection.getAccountInfo(poolInfo.platformId)
  const platformInfo = PlatformConfig.decode(data!.data)
  const mintInfo = await raydium.token.getTokenInfo(mintA)
  const epochInfo = await raydium.connection.getEpochInfo()
  const shareFeeReceiver = undefined
  const shareFeeRate = shareFeeReceiver ? new BN(0) : new BN(10000) // do not exceed poolInfo.configInfo.maxShareFeeRate
  const slippage = new BN(100) // means 1%
  
  const res = Curve.buyExactOut({
    poolInfo,
    amountA: inAmount,
    protocolFeeRate: poolInfo.configInfo.tradeFeeRate,
    platformFeeRate: platformInfo.feeRate,
    curveType: poolInfo.configInfo.curveType,
    shareFeeRate,
    creatorFeeRate: platformInfo.creatorFeeRate,
    transferFeeConfigA: mintInfo.extensions.feeConfig
      ? {
          transferFeeConfigAuthority: PublicKey.default,
          withdrawWithheldAuthority: PublicKey.default,
          withheldAmount: BigInt(0),
          olderTransferFee: {
            epoch: BigInt(mintInfo.extensions.feeConfig.olderTransferFee.epoch ?? epochInfo?.epoch ?? 0),
            maximumFee: BigInt(mintInfo.extensions.feeConfig.olderTransferFee.maximumFee),
            transferFeeBasisPoints: mintInfo.extensions.feeConfig.olderTransferFee.transferFeeBasisPoints,
          },
          newerTransferFee: {
            epoch: BigInt(mintInfo.extensions.feeConfig.newerTransferFee.epoch ?? epochInfo?.epoch ?? 0),
            maximumFee: BigInt(mintInfo.extensions.feeConfig.newerTransferFee.maximumFee),
            transferFeeBasisPoints: mintInfo.extensions.feeConfig.newerTransferFee.transferFeeBasisPoints,
          },
        }
      : undefined,
    slot: await raydium.connection.getSlot(),
  })

  // Raydium UI usage: https://github.com/raydium-io/raydium-ui-v3-public/blob/master/src/store/useLaunchpadStore.ts#L563
  let { transaction, extInfo, execute } = await raydium.launchpad.buyToken({
    programId,
    mintA,
    // mintB: poolInfo.configInfo.mintB, // optional, default is sol
    // minMintAAmount: res.amountA, // optional, default sdk will calculated by realtime rpc data
    slippage,
    configInfo: poolInfo.configInfo,
    platformFeeRate: platformInfo.feeRate,
    txVersion: TxVersion.V0,
    buyAmount: inAmount,
    // shareFeeReceiver, // optional
    // shareFeeRate,  // optional, do not exceed poolInfo.configInfo.maxShareFeeRate

    // computeBudgetConfig: {
    //   units: 600000,
    //   microLamports: 600000,
    // },
  })
  
  console.log('expected receive amount:', extInfo.amountA.amount.toString())
  // printSimulate([transaction])
  try {
    const sentInfo = await execute({ sendAndConfirm: true })
    console.log(sentInfo)
    return transaction;
  } catch (e: any) {
    console.log(e)
  }

  process.exit() // if you don't want to end up node execution, comment this line
}

export const sell = async (mint: string, amount: number, keypair: Keypair) => {
  const raydium = await initSdk()

  const mintA = new PublicKey(mint);
  const mintB = NATIVE_MINT

  const programId = LAUNCHPAD_PROGRAM // devnet: DEV_LAUNCHPAD_PROGRAM

  const poolId = getPdaLaunchpadPoolId(programId, mintA, mintB).publicKey
  const poolInfo = await raydium.launchpad.getRpcPoolInfo({ poolId })
  const data = await raydium.connection.getAccountInfo(poolInfo.platformId)
  const platformInfo = PlatformConfig.decode(data!.data)

  const inAmount = new BN(amount)
  const shareFeeReceiver = undefined
  const shareFeeRate = shareFeeReceiver ? new BN(0) : new BN(10000) // do not exceed poolInfo.configInfo.maxShareFeeRate
  const slippage = new BN(100) // means 1%
  const mintInfo = await raydium.token.getTokenInfo(mintA)
  const epochInfo = await raydium.connection.getEpochInfo()
  const res = Curve.sellExactIn({
    poolInfo,
    amountA: inAmount,
    protocolFeeRate: poolInfo.configInfo.tradeFeeRate,
    platformFeeRate: platformInfo.feeRate,
    curveType: poolInfo.configInfo.curveType,
    shareFeeRate,
    creatorFeeRate: platformInfo.creatorFeeRate,
    transferFeeConfigA: mintInfo.extensions.feeConfig
      ? {
          transferFeeConfigAuthority: PublicKey.default,
          withdrawWithheldAuthority: PublicKey.default,
          withheldAmount: BigInt(0),
          olderTransferFee: {
            epoch: BigInt(mintInfo.extensions.feeConfig.olderTransferFee.epoch ?? epochInfo?.epoch ?? 0),
            maximumFee: BigInt(mintInfo.extensions.feeConfig.olderTransferFee.maximumFee),
            transferFeeBasisPoints: mintInfo.extensions.feeConfig.olderTransferFee.transferFeeBasisPoints,
          },
          newerTransferFee: {
            epoch: BigInt(mintInfo.extensions.feeConfig.newerTransferFee.epoch ?? epochInfo?.epoch ?? 0),
            maximumFee: BigInt(mintInfo.extensions.feeConfig.newerTransferFee.maximumFee),
            transferFeeBasisPoints: mintInfo.extensions.feeConfig.newerTransferFee.transferFeeBasisPoints,
          },
        }
      : undefined,
    slot: await raydium.connection.getSlot(),
  })
  console.log(
    'expected out amount: ',
    res.amountB.toString(),
    'minimum out amount: ',
    new Decimal(res.amountB.toString()).mul((10000 - slippage.toNumber()) / 10000).toFixed(0)
  )

  // Raydium UI usage: https://github.com/raydium-io/raydium-ui-v3-public/blob/master/src/store/useLaunchpadStore.ts#L637
  const { execute, transaction, builder } = await raydium.launchpad.sellToken({
    programId,
    mintA,
    // mintB, // default is sol
    configInfo: poolInfo.configInfo,
    platformFeeRate: platformInfo.feeRate,
    txVersion: TxVersion.V0,
    sellAmount: inAmount,
  })

  // printSimulate([transaction])
  try {
    return transaction
  } catch (e: any) {
    console.log(e)
  }

  process.exit() // if you don't want to end up node execution, comment this line
}
export const initSdk = async (params?: { loadToken?: boolean, keypair: Keypair }) => {
  if (raydium) return raydium
  if (connection.rpcEndpoint === clusterApiUrl('mainnet-beta'))
  console.warn('using free rpc node might cause unexpected error, strongly suggest uses paid rpc node')

  console.log(`connect to rpc ${connection.rpcEndpoint} in ${cluster}`)
  raydium = await Raydium.load({
    owner: params?.keypair,
    connection,
    cluster,
    disableFeatureCheck: true,
    disableLoadToken: !params?.loadToken,
    blockhashCommitment: 'finalized',
  })
  return raydium
}

export async function getPoolInfo(mint: string) {

  const mintA = new PublicKey(mint)
  const mintB = NATIVE_MINT

  const programId = LAUNCHPAD_PROGRAM // devnet: DEV_LAUNCHPAD_PROGRAM

  const poolId = getPdaLaunchpadPoolId(programId, mintA, mintB).publicKey;
  console.log('poolID', poolId)
    const poolRawData = await connection.getAccountInfo(poolId);
  if (!poolRawData) {
    return null
  }
  const poolData = parsePoolStateAccount(poolRawData.data);

  return {poolData, poolId}
}

export async function getSwapQuote(baseAmountIn: number, inputMint: string, tokenMint: string, slippage1: number = 0): Promise<number> {
    
  const raydium = await initSdk()

  const mintA = new PublicKey(inputMint)
  const mintInfo = await raydium.token.getTokenInfo(mintA)
  const mintB = NATIVE_MINT
  const inAmount = new BN(baseAmountIn * (10 ** mintInfo.decimals))

  const programId = LAUNCHPAD_PROGRAM // devnet: DEV_LAUNCHPAD_PROGRAM

  const poolId = getPdaLaunchpadPoolId(programId, mintA, mintB).publicKey
  const poolInfo = await raydium.launchpad.getRpcPoolInfo({ poolId })
  const data = await raydium.connection.getAccountInfo(poolInfo.platformId)
  const platformInfo = PlatformConfig.decode(data!.data)

  const epochInfo = await raydium.connection.getEpochInfo()
  const shareFeeReceiver = undefined
  const shareFeeRate = shareFeeReceiver ? new BN(0) : new BN(10000) // do not exceed poolInfo.configInfo.maxShareFeeRate
  const slippage = new BN(slippage1) // means 1%
  
  const res = Curve.buyExactOut({
    poolInfo,
    amountA: inAmount ,
    protocolFeeRate: poolInfo.configInfo.tradeFeeRate,
    platformFeeRate: platformInfo.feeRate,
    curveType: poolInfo.configInfo.curveType,
    shareFeeRate,
    creatorFeeRate: platformInfo.creatorFeeRate,
    transferFeeConfigA: mintInfo.extensions.feeConfig
      ? {
          transferFeeConfigAuthority: PublicKey.default,
          withdrawWithheldAuthority: PublicKey.default,
          withheldAmount: BigInt(0),
          olderTransferFee: {
            epoch: BigInt(mintInfo.extensions.feeConfig.olderTransferFee.epoch ?? epochInfo?.epoch ?? 0),
            maximumFee: BigInt(mintInfo.extensions.feeConfig.olderTransferFee.maximumFee),
            transferFeeBasisPoints: mintInfo.extensions.feeConfig.olderTransferFee.transferFeeBasisPoints,
          },
          newerTransferFee: {
            epoch: BigInt(mintInfo.extensions.feeConfig.newerTransferFee.epoch ?? epochInfo?.epoch ?? 0),
            maximumFee: BigInt(mintInfo.extensions.feeConfig.newerTransferFee.maximumFee),
            transferFeeBasisPoints: mintInfo.extensions.feeConfig.newerTransferFee.transferFeeBasisPoints,
          },
        }
      : undefined,
    slot: await raydium.connection.getSlot(),
  })
  console.log("---------------- expect out amount" , res.amountB)
  return res.amountB.toNumber()
}

export async function getSwapInstruction(
    amountIn: number,
    minAmountOut: number,
    swapAccountkey: RaydiumLaunchPadAccountKeys,
    mint: PublicKey
): Promise<TransactionInstruction | null> {
  const poolInfo = await getPoolInfo(mint.toBase58());
  const { inputMint, payer } = swapAccountkey;
  const [authority] = PublicKey.findProgramAddressSync([LAUNCHPAD_AUTH_SEED], RAYDIUM_LAUNCHLAB_MAINNET_ADDR);
  const [eventAuth] = PublicKey.findProgramAddressSync([LAUNCHPAD_POOL_EVENT_AUTH_SEED], RAYDIUM_LAUNCHLAB_MAINNET_ADDR);
  if (!poolInfo?.poolData) {
    return null
  }
  const baseUserAta = getAssociatedTokenAddressSync(poolInfo?.poolData.baseMint, payer);
  const quoteUserAta = getAssociatedTokenAddressSync(poolInfo?.poolData.quoteMint, payer);

  if (inputMint.toBase58() == NATIVE_MINT.toBase58()) {
      return buyExactInInstruction(
          RAYDIUM_LAUNCHLAB_MAINNET_ADDR,
          payer,
          authority,
          poolInfo?.poolData.globalConfig,
          poolInfo?.poolData.platformConfig,
          poolInfo.poolId,
          baseUserAta,
          quoteUserAta,
          poolInfo?.poolData.baseVault,
          poolInfo?.poolData.quoteVault,
          poolInfo?.poolData.baseMint,
          poolInfo?.poolData.quoteMint,
          TOKEN_PROGRAM_ID,
          TOKEN_PROGRAM_ID,
          getPdaCreatorVault(RAYDIUM_LAUNCHLAB_MAINNET_ADDR, poolInfo?.poolData.platformConfig, poolInfo?.poolData.quoteMint).publicKey,
          getPdaCreatorVault(RAYDIUM_LAUNCHLAB_MAINNET_ADDR, poolInfo?.poolData.creator, poolInfo?.poolData.quoteMint).publicKey,
          new BN(Math.trunc(amountIn)),
          new BN(minAmountOut)
      )
  } else {
    console.log(chalk.red("--------------------", poolInfo?.poolData.baseDecimals))
    console.log(chalk.red("--------------------", amountIn))
      return sellExactInInstruction(  
          RAYDIUM_LAUNCHLAB_MAINNET_ADDR,
          payer,
          authority,
          poolInfo?.poolData.globalConfig,
          poolInfo?.poolData.platformConfig,
          poolInfo.poolId,
          baseUserAta,
          quoteUserAta,
          poolInfo?.poolData.baseVault,
          poolInfo?.poolData.quoteVault,
          poolInfo?.poolData.baseMint,
          poolInfo?.poolData.quoteMint,
          TOKEN_PROGRAM_ID,
          TOKEN_PROGRAM_ID,
          getPdaCreatorVault(RAYDIUM_LAUNCHLAB_MAINNET_ADDR, poolInfo?.poolData.platformConfig, poolInfo?.poolData.quoteMint).publicKey,
          getPdaCreatorVault(RAYDIUM_LAUNCHLAB_MAINNET_ADDR, poolInfo?.poolData.creator, poolInfo?.poolData.quoteMint).publicKey,
          new BN(Math.trunc(amountIn * (10 ** poolInfo?.poolData.baseDecimals))),
          new BN(Math.trunc(minAmountOut))
      )
  }

}

//  updated buy
export function buyExactInInstruction(
  programId: PublicKey,

  owner: PublicKey,
  auth: PublicKey,
  configId: PublicKey,
  platformId: PublicKey,
  poolId: PublicKey,
  userTokenAccountA: PublicKey,
  userTokenAccountB: PublicKey,
  vaultA: PublicKey,
  vaultB: PublicKey,
  mintA: PublicKey,
  mintB: PublicKey,
  tokenProgramA: PublicKey,
  tokenProgramB: PublicKey,

  platformClaimFeeVault: PublicKey,
  creatorClaimFeeVault: PublicKey,

  amountB: BN,
  minAmountA: BN,
  shareFeeRate?: BN,

  shareFeeReceiver?: PublicKey,
): TransactionInstruction {
  const dataLayout = struct([u64("amountB"), u64("minAmountA"), u64("shareFeeRate")]);

  const keys: Array<AccountMeta> = [
    { pubkey: owner, isSigner: true, isWritable: true },
    { pubkey: auth, isSigner: false, isWritable: false },
    { pubkey: configId, isSigner: false, isWritable: false },
    { pubkey: platformId, isSigner: false, isWritable: false },
    { pubkey: poolId, isSigner: false, isWritable: true },

    { pubkey: userTokenAccountA, isSigner: false, isWritable: true },
    { pubkey: userTokenAccountB, isSigner: false, isWritable: true },
    { pubkey: vaultA, isSigner: false, isWritable: true },
    { pubkey: vaultB, isSigner: false, isWritable: true },
    { pubkey: mintA, isSigner: false, isWritable: false },
    { pubkey: mintB, isSigner: false, isWritable: false },

    { pubkey: tokenProgramA, isSigner: false, isWritable: false },
    { pubkey: tokenProgramB, isSigner: false, isWritable: false },

    { pubkey: getPdaCpiEvent(programId).publicKey, isSigner: false, isWritable: false },
    { pubkey: programId, isSigner: false, isWritable: false },
  ];

  if (shareFeeReceiver) {
    keys.push({ pubkey: shareFeeReceiver, isSigner: false, isWritable: true });
  }

  keys.push({ pubkey: SystemProgram.programId, isSigner: false, isWritable: false });
  keys.push({ pubkey: platformClaimFeeVault, isSigner: false, isWritable: true });
  keys.push({ pubkey: creatorClaimFeeVault, isSigner: false, isWritable: true });

  const data = Buffer.alloc(dataLayout.span);
  dataLayout.encode(
    {
      amountB,
      minAmountA,
      shareFeeRate: shareFeeRate ?? new BN(0),
    },
    data,
  );

  return new TransactionInstruction({
    keys,
    programId,
    data: Buffer.from([...anchorDataBuf.buyExactIn, ...data]),
  });
}
// updated sell
export function sellExactInInstruction(
  programId: PublicKey,

  owner: PublicKey,
  auth: PublicKey,
  configId: PublicKey,
  platformId: PublicKey,
  poolId: PublicKey,
  userTokenAccountA: PublicKey,
  userTokenAccountB: PublicKey,
  vaultA: PublicKey,
  vaultB: PublicKey,
  mintA: PublicKey,
  mintB: PublicKey,
  tokenProgramA: PublicKey,
  tokenProgramB: PublicKey,

  platformClaimFeeVault: PublicKey,
  creatorClaimFeeVault: PublicKey,

  amountA: BN,
  minAmountB: BN,
  shareFeeRate?: BN,

  shareFeeReceiver?: PublicKey,
): TransactionInstruction {
  const dataLayout = struct([u64("amountA"), u64("minAmountB"), u64("shareFeeRate")]);

  const keys: Array<AccountMeta> = [
    { pubkey: owner, isSigner: true, isWritable: true },
    { pubkey: auth, isSigner: false, isWritable: false },
    { pubkey: configId, isSigner: false, isWritable: false },
    { pubkey: platformId, isSigner: false, isWritable: false },
    { pubkey: poolId, isSigner: false, isWritable: true },

    { pubkey: userTokenAccountA, isSigner: false, isWritable: true },
    { pubkey: userTokenAccountB, isSigner: false, isWritable: true },
    { pubkey: vaultA, isSigner: false, isWritable: true },
    { pubkey: vaultB, isSigner: false, isWritable: true },
    { pubkey: mintA, isSigner: false, isWritable: false },
    { pubkey: mintB, isSigner: false, isWritable: false },

    { pubkey: tokenProgramA, isSigner: false, isWritable: false },
    { pubkey: tokenProgramB, isSigner: false, isWritable: false },

    { pubkey: getPdaCpiEvent(programId).publicKey, isSigner: false, isWritable: false },
    { pubkey: programId, isSigner: false, isWritable: false },
  ];

  if (shareFeeReceiver) {
    keys.push({ pubkey: shareFeeReceiver, isSigner: false, isWritable: true });
  }

  keys.push({ pubkey: SystemProgram.programId, isSigner: false, isWritable: false });
  keys.push({ pubkey: platformClaimFeeVault, isSigner: false, isWritable: true });
  keys.push({ pubkey: creatorClaimFeeVault, isSigner: false, isWritable: true });

  const data = Buffer.alloc(dataLayout.span);
  dataLayout.encode(
    {
      amountA,
      minAmountB,
      shareFeeRate: shareFeeRate ?? new BN(0),
    },
    data,
  );

  return new TransactionInstruction({
    keys,
    programId,
    data: Buffer.from([...anchorDataBuf.sellExactIn, ...data]),
  });
}

export function calculateFee({ amount, feeRate }: { amount: BigNumber; feeRate: BigNumber }): BigNumber {
    return ceilDiv(amount, feeRate, FEE_RATE_DENOMINATOR_VALUE);
}

export function ceilDiv(
    tokenAmount: BigNumber,
    feeNumerator: BigNumber,
    feeDenominator: BigNumber
): BigNumber {
    return tokenAmount
        .multipliedBy(feeNumerator)
        .plus(feeDenominator)
        .minus(1)
        .dividedToIntegerBy(feeDenominator);
}

export function getAmountOut({
    amountIn,
    inputReserve,
    outputReserve,
}: {
    amountIn: BigNumber;
    inputReserve: BigNumber;
    outputReserve: BigNumber;
}): BigNumber {
    const numerator = amountIn.times(outputReserve);
    const denominator = inputReserve.plus(amountIn);
    const amountOut = numerator.div(denominator);
    return amountOut;
}

export function isValidTwoNumberInput(input: string): [number, number] | null {
  const regex = /^\d*\.?\d+\s\d*\.?\d+$/;
  if (!regex.test(input)) return null;

  const [firstStr, secondStr] = input.trim().split(" ");
  const first = Number(firstStr);
  const second = Number(secondStr);

  if (first > 0 && second > 0) {
    return [first, second];
  }

  return null;
}

export function isPositiveInteger(input: string): boolean {
  const num = Number(input);

  // Check if it's a number, an integer, and greater than 0
  return Number.isInteger(num) && num > 0;
}

export async function checkMintKey(input: string) {
  try {    
    const pubkey = new PublicKey(input);
    return PublicKey.isOnCurve(pubkey.toBytes());
  } catch {
    return false;
  }
}