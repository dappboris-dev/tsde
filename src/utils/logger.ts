import promptSync from "prompt-sync";
import figlet from "figlet";
import chalk from "chalk";

const prompt = promptSync();

export const warning_log = (message:any) : void => {
     console.log(chalk.yellow(message));
}
export const info_log = (message: any) : void => {
     console.log(chalk.blue(message));
}
export const error_log = (message: any) : void => {
     console.log(chalk.red(message));
}
export const success_log = (message: any) : void => {
     console.log(chalk.green(message));
}

export const showBuySellMode = () => {
    console.log(chalk.green("\n---------- Menu ---------------"));
    console.log(chalk.green("| 1. Token MODE Volume Bot      |"));
    console.log(chalk.green("| 2. SOL   MODE Volume Bot      |"));
    console.log(chalk.green("| Type 'exit' to quit.          |"));
    console.log(chalk.green("-------------------------------"));
    const answer = prompt(chalk.yellow("Choose an option or 'exit': "));
    return answer;
}
export const selectBotType = () => {
    // Create ASCII art using figlet
	const asciiArt = figlet.textSync("Bonk.fun & Raydium volume bot", {
		font: "Standard",
		horizontalLayout: "full",
		verticalLayout: "default",
		width: 150,
		whitespaceBreak: true,
	});
	// Color the ASCII art using chalk
	const coloredAsciiArt = chalk.red.bold(asciiArt);
    // Display the colored ASCII art
	console.log(coloredAsciiArt);
    console.log(chalk.green("\n---------- Menu ---------------"));
    console.log(chalk.green("| 1. Bonk.fun Volume Bot      |"));
    console.log(chalk.green("| 2. Raydium CPMM Volume Bot  |"));
    console.log(chalk.green("| Type 'exit' to quit.        |"));
    console.log(chalk.green("-------------------------------"));
    const answer = prompt(chalk.yellow("Choose an option or 'exit': "));
    return answer;
}