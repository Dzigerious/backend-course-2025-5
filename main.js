const { program } = require("commander");
const http = require("http");
const fs = require("fs/promises");
const { mkdir, access } = require("fs/promises");
const { constants } = require("fs");
const { URL } = require("url");
const path = require("path");


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
  
  if (!options.host || !options.port || !options.cache){
    console.log("Всі параметри є обов'язковими --host, --port, --cache");
    process.exit(1);
  }

  // const isValidHost = await validHost(options.host);

  // if (!isValidHost){
  //   console.log("Введіть правильний хост(як варіант localhost або 127.0.0.1)");
  //   process.exit(1);
  // }
  await ensureCacheDir(options.cache);
  await checkPort(options.port);


  const server = http.createServer(async (req, res) => {

  const url = new URL(req.url, `http://${req.headers.host}`);
  const code = url.pathname.replace(/^\/+/, "");

  if (!/^\d{3}$/.test(code)) {
    res.statusCode = 404;
    return res.end("Не знайдено");
  }

  const filePath = path.join(options.cache, `${code}.jpg`);

  const readBody = () =>
    new Promise((resolve, reject) => {
      const chunks = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => resolve(Buffer.concat(chunks)));
      req.on("error", reject);
    });

  try {
    switch (req.method) {
      case "GET": {
        try {
          const data = await fs.readFile(filePath);
          res.writeHead(200, { "Content-Type": "image/jpeg" });
          return res.end(data);
        } catch (err) {
          if (err.code === "ENOENT") {
            res.statusCode = 404;
            return res.end("Файл не знайдено в кеші");
          }
          res.statusCode = 500;
          return res.end("Проблеми із сервером");
        }
      }

      case "PUT": {
        const body = await readBody();
        if (!body || body.length === 0) {
          res.statusCode = 400;
          return res.end("Тіло пусте");
        }
        await fs.writeFile(filePath, body);
        res.statusCode = 201;
        return res.end("Створено");
      }

      case "DELETE": {
        try {
          await fs.unlink(filePath);
          res.statusCode = 200;
          return res.end(`Файл було успішно видалено: ${filePath}`);
        } catch (err) {
          if (err.code === "ENOENT") {
            res.statusCode = 404;
            return res.end("Файл не знайдено в кеші");
          }
          res.statusCode = 500;
          return res.end("Проблеми із сервером");
        }
      }

      default: {
        res.writeHead(405, { Allow: "GET, PUT, DELETE" });
        return res.end("Метод не дозволений");
      }
    }
  } catch (err) {
    res.statusCode = 500;
    return res.end("Проблеми із сервером");
  }
});

  server.on("error", (err) => {
    console.log("Помилка при запуску сервера: ", err.message)
    process.exit(1);
  });

  server.listen(options.port, options.host, () => {
    console.log(`Сервер запущено на http://${options.host}:${options.port}`);
  })
})();
