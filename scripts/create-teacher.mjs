import process from "node:process";
import { createInterface } from "node:readline/promises";

import prismaPackage from "@prisma/client";
import bcrypt from "bcryptjs";

const { PrismaClient } = prismaPackage;
const prisma = new PrismaClient();

function normalizeEmail(value) {
  return value.trim().toLowerCase();
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function readHidden(prompt) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
    const readline = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return readline.question(prompt).finally(() => readline.close());
  }

  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    const stdout = process.stdout;

    let value = "";
    const previousRawMode = stdin.isRaw;

    function cleanup() {
      stdin.off("data", handleData);
      stdin.setRawMode(previousRawMode ?? false);
      stdin.pause();
    }

    function finish() {
      cleanup();
      stdout.write("\n");
      resolve(value);
    }

    function handleData(chunk) {
      for (const character of String(chunk)) {
        if (character === "\u0003") {
          cleanup();
          stdout.write("\n");
          reject(new Error("Создание аккаунта отменено"));
          return;
        }

        if (character === "\r" || character === "\n") {
          finish();
          return;
        }

        if (character === "\u007f" || character === "\b") {
          if (value.length > 0) {
            value = value.slice(0, -1);
            stdout.write("\b \b");
          }

          continue;
        }

        value += character;
        stdout.write("*");
      }
    }

    stdout.write(prompt);
    stdin.setEncoding("utf8");
    stdin.setRawMode(true);
    stdin.resume();
    stdin.on("data", handleData);
  });
}

async function main() {
  const readline = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const rawName = await readline.question("Имя учителя: ");
  const rawEmail = await readline.question("Email учителя: ");

  readline.close();

  const name = rawName.trim();
  const email = normalizeEmail(rawEmail);

  if (!name) {
    throw new Error("Имя не может быть пустым");
  }

  if (!isValidEmail(email)) {
    throw new Error("Некорректный email");
  }

  const password = await readHidden("Пароль, минимум 12 символов: ");
  const passwordConfirmation = await readHidden("Повтори пароль: ");

  if (password.length < 12) {
    throw new Error("Пароль должен содержать минимум 12 символов");
  }

  if (password !== passwordConfirmation) {
    throw new Error("Пароли не совпадают");
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (existingUser) {
    throw new Error(
      `Пользователь с email ${email} уже существует, роль: ${existingUser.role}`
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const teacher = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "TEACHER",
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  console.log("");
  console.log("Учитель успешно создан:");
  console.log(`Имя: ${teacher.name}`);
  console.log(`Email: ${teacher.email}`);
  console.log(`Роль: ${teacher.role}`);
}

main()
  .catch((error) => {
    console.error("");
    console.error(
      error instanceof Error ? error.message : "Неизвестная ошибка"
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });