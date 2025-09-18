import { PublicKey, Signer, Transaction } from "@solana/web3.js";
import { BigNumber } from "bignumber.js";

export const cluster = 'mainnet'; // 'mainnet' | 'devnet'

export const SELL_EXACT_IN_DISCRIMINATOR = Buffer.from([250, 234, 13, 123, 213, 156, 19, 236]);

export const BUY_EXACT_IN_DISCRIMINATOR = Buffer.from([149, 39, 222, 155, 211, 124, 152, 26]);

export interface RaydiumLaunchPadAccountKeys {
    inputMint : PublicKey,
    payer : PublicKey
}
export const FEE_RATE_DENOMINATOR_VALUE = BigNumber(1_000_000);
export const RAYDIUM_LAUNCHLAB_MAINNET_ADDR = new PublicKey("LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj")
export const LAUNCHPAD_AUTH_SEED = Buffer.from("vault_auth_seed", "utf8");
export const LAUNCHPAD_POOL_EVENT_AUTH_SEED = Buffer.from("__event_authority", "utf8");

export interface GlobalConfigAccount {
    epoch: BigNumber;
    curveType: number;
    index: number;
    migrateFee: BigNumber;
    tradeFeeRate: BigNumber;
    maxShareFeeRate: BigNumber;
    minBaseSupply: BigNumber;
    maxLockRate: BigNumber;
    minBaseSellRate: BigNumber;
    minBaseMigrateRate: BigNumber;
    minQuoteFundRaising: BigNumber;
    quoteMint: PublicKey;
    protocolFeeOwner: PublicKey;
    migrateFeeOwner: PublicKey;
    migrateToAmmWallet: PublicKey;
    migrateToCpswapWallet: PublicKey;
    padding: BigNumber[];
}

export interface PlatformConfigAccount {
    epoch: BigNumber;
    platformFeeWallet: PublicKey;
    platformNftWallet: PublicKey;
    platformScale: BigNumber;
    creatorScale: BigNumber;
    burnScale: BigNumber;
    feeRate: BigNumber;
    name: string;
    web: string;
    img: string;
}

export interface PoolStateAccount {
	epoch: BigNumber;
	authBump: number;
	status: number;
	baseDecimals: number;
	quoteDecimals: number;
	migrateType: number;
	supply: BigNumber;
	totalBaseSell: BigNumber;
	virtualBase: BigNumber;
	virtualQuote: BigNumber;
	realBase: BigNumber;
	realQuote: BigNumber;
	totalQuoteFundRaising: BigNumber;
	quoteProtocolFee: BigNumber;
	platformFee: BigNumber;
	migrateFee: BigNumber;
	vestingSchedule: VestingSchedule;
	globalConfig: PublicKey;
	platformConfig: PublicKey;
	baseMint: PublicKey;
	quoteMint: PublicKey;
	baseVault: PublicKey;
	quoteVault: PublicKey;
	creator: PublicKey;
}

export interface VestingSchedule {
	totalLockedAmount: BigNumber;
	cliffPeriod: BigNumber;
	unlockPeriod: BigNumber;
	startTime: BigNumber;
	allocatedShareAmount: BigNumber;
}

export const anchorDataBuf = {
  initialize: Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]),
  initializeV2: Buffer.from([67, 153, 175, 39, 218, 16, 38, 32]),

  buyExactIn: Buffer.from([250, 234, 13, 123, 213, 156, 19, 236]),
  buyExactOut: Buffer.from([24, 211, 116, 40, 105, 3, 153, 56]),
  sellExactIn: Buffer.from([149, 39, 222, 155, 211, 124, 152, 26]),
  sellExactOut: Buffer.from([95, 200, 71, 34, 8, 9, 11, 166]),
  createVestingAccount: Buffer.from([129, 178, 2, 13, 217, 172, 230, 218]),
  claimVestedToken: Buffer.from([49, 33, 104, 30, 189, 157, 79, 35]),

  createPlatformConfig: Buffer.from([176, 90, 196, 175, 253, 113, 220, 20]),
  claimPlatformFee: Buffer.from([156, 39, 208, 135, 76, 237, 61, 72]),
  updatePlaformConfig: Buffer.from([195, 60, 76, 129, 146, 45, 67, 143]),
  initializeWithToken2022: Buffer.from([37, 190, 126, 222, 44, 154, 171, 17]),
  claimPlatformFeeFromVault: Buffer.from([117, 241, 198, 168, 248, 218, 80, 29]),
  claimCreatorFee: Buffer.from([26, 97, 138, 203, 132, 171, 141, 252]),

  updatePlatformCurveParam: Buffer.from([138, 144, 138, 250, 220, 128, 4, 57]),
  removePlatformCurveParam: Buffer.from([27, 30, 62, 169, 93, 224, 24, 145]),
};