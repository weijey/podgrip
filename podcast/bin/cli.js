#!/usr/bin/env node

import { Command } from "commander";
import { registerSingleCommands } from "../cli/single.js";
import { registerBatchCommands } from "../cli/batch.js";

const program = new Command();

program.name("xyz-dl").description("🎵 小宇宙播客下载器").version("1.1.0");

registerSingleCommands(program);
registerBatchCommands(program);

program.parse();
