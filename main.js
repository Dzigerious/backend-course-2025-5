const { program } = require("commander");
const http = require("http");
const fs = require("fs");
const { mkdir, access } = require("fs/promises");
const { constants } = require("fs");
const { URL } = require("url");

program
  .option("-h, --host <host>", "Input the host")
  .option("-p, --port <number>", "Input server port")
  .option("-c, --cache <path>", "Cache directory");

program.parse();
const options = program.opts();

const validHost = async (host) => {
  try {
    new URL(`http://${host}`);
    return true;
  } catch {
    return false;
  }
}

const checkPort = async (port) => {
  port = parseInt(port);
  if (Number.isNaN(port) || port <= 0 || port > 65535) {
    console.log("Введіть коректний порт (має бути число більше 0 та менше 65535)");
    process.exit(1);
  }
};

const ensureCacheDir = async (path) => {
  try {
    await access(path, constants.F_OK);
    console.log("Кеш директорія вже існує");
  } catch {
    await mkdir(path, { recursive: true });
    console.log("Створено нову кеш директорію");
  }
};

(async () => {
  await ensureCacheDir(options.cache);
  await checkPort(options.port);
  await validHost(options.host)
  const server = http.createServer((req, res) => {
    
  });

  server.listen(options.port, options.host, () => {
    console.log(`Сервер запущено на http://${options.host}:${options.port}`);
  })
})();
