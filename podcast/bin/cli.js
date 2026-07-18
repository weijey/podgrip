#!/usr/bin/env node

import { Command } from "commander";
import { registerSingleCommands } from "../cli/single.js";
import { registerBatchCommands } from "../cli/batch.js";
import { registerServeCommand } from "../cli/serve.js";

const program = new Command();

program.name("podgrip").description("🎵 小宇宙播客下载器 — Grip your podcasts").version("1.1.2");

registerSingleCommands(program);
registerBatchCommands(program);
registerServeCommand(program);

program.parse();
