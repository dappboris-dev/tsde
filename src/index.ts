import { runBonkfunVolumeBot } from "./bonkfun";
import { runRaydiumVolumeBot } from "./raydiumcpmm";

import { error_log, selectBotType, showBuySellMode } from "./utils/logger"
import chalk  from "chalk";

const main = () => {
    let running = true;
    const option1 = selectBotType();
//  error_log(input);
    switch (option1) {
			case "1":                           //  --- this is bonk.fun mode
                runBonkfunVolumeBot().catch((err) => {
					console.error(chalk.red("Error:"), err);
				})
                break;
			case "2":                           //  --- this is raydium cpmm mode
                runRaydiumVolumeBot().catch((err) => {
					console.error(chalk.red("Error:"), err);
				});
				break;
			case "exit":
				running = false;
				break;
			default:
				console.log(chalk.red("Invalid option, please choose again."));
    }
}

main()