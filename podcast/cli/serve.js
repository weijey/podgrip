import { createApp } from "../lib/server.js";

export function registerServeCommand(program) {
  program
    .command("serve")
    .description("启动 Web 管理面板")
    .option("-p, --port <port>", "端口号", "3456")
    .action(async (opts) => {
      const port = parseInt(opts.port) || 3456;
      const app = createApp();
      app.listen(port, () => {
        console.log(`\n🎵 podgrip 已启动 → http://localhost:${port}`);
      });
    });
}
