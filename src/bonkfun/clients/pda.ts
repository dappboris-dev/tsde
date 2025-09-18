
import { findProgramAddress, ProgramAddress } from "./common/txTool/txUtils";
import { PublicKey } from "@solana/web3.js";

export function getPdaCpiEvent(programId: PublicKey): ProgramAddress {
  return findProgramAddress([Buffer.from("__event_authority", "utf8")], programId);
}