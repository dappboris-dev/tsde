// Suppress specific warning types
process.env.NODE_NO_WARNINGS = "1";
process.env.NODE_OPTIONS = "--no-warnings";
process.removeAllListeners("warning");
process.removeAllListeners("ExperimentalWarning");

// Ensure UTF-8 encoding for input and output

import { extender_token, extender_sol } from "./bot";
import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { closeAcc } from "./retrieve";
import promptSync from "prompt-sync";
import figlet from "figlet";
import chalk from "chalk";
import { wallet, connection } from "./config";
import fs from "fs";

process.stdin.setEncoding("utf8");
process.stdout.setEncoding("utf8");

const prompt = promptSync();
// Function to fetch balance
async function getBalance(keypair: Keypair): Promise<number> {
	const balance = await connection.getBalance(keypair.publicKey);
	return balance / LAMPORTS_PER_SOL; // Convert lamports to SOL
}

export async function runBonkfunVolumeBot() {
	const args = process.argv.slice(2);
	let running = true;

	// If the '-c' flag is provided, read the config file and run extender with it
	if (args.length > 1 && args[0] === "-c") {
		// const configFilePath = args[1];
		// const config = JSON.parse(fs.readFileSync(configFilePath, "utf8"));
		// await extender_token(config);
		// return;
	}

	// Create ASCII art using figlet
	const asciiArt = figlet.textSync("Bonk.fun", {
		font: "Standard",
		horizontalLayout: "default",
		verticalLayout: "default",
		width: 80,
		whitespaceBreak: true,
	});

	// Color the ASCII art using chalk
	const coloredAsciiArt = chalk.cyan(asciiArt);

	while (running) {
		// Clear the console
		console.clear();

		// Display the colored ASCII art
		console.log(coloredAsciiArt);

		const walletBalance = await getBalance(wallet);
		// Display balances
		console.log("");
		console.log(chalk.green("Funder Balance: "), chalk.cyan(`${walletBalance.toFixed(4)} SOL`));

		console.log(chalk.green("\n---------- Menu ---------------"));
		console.log(chalk.green("| 1. SOL unit purchage mod    |"));
		console.log(chalk.green("| 2. Token unit purchage mod  |"));
		console.log(chalk.green("| 3. Retrieve SOL ALL WALLETS |"));
		console.log(chalk.green("| Type 'exit' to quit.        |"));
		console.log(chalk.green("-------------------------------"));

		const answer = prompt(chalk.yellow("Choose an option or 'exit': "));

		switch (answer) {
			case "1":
				await extender_sol();
				break;
			case "2":
				await extender_token();
				break;
			case "3":
				await closeAcc();
				break;
			
			case "exit":
				running = false;
				break;
			default:
				console.log(chalk.red("Invalid option, please choose again."));
		}
	}

	console.log(chalk.green("Exiting..."));
	process.exit(0);
}
