#!/usr/bin/env node

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { render } from "oh-my-logo";
import { isPackageLatest } from "is-package-latest";
import axios from "axios";
import chalk from "chalk";
import * as cheerio from "cheerio";
import inquirer from "inquirer";
import MarkdownIt from "markdown-it";
import prettier from "prettier";
import open from "open";
import { exec } from "child_process";
import util from "util";

import pkg from "./package.json" with { type: "json" };

const currentVersion = pkg.version;
const packageName = pkg.name;

const TARGET_URL = "https://connpass.com/event/[id]/participation/";

async function checkVersion() {
  try {
    const res = await isPackageLatest(pkg);
    const latestVersion = res.latestVersion;

    if (!res.isLatest) {
      console.log(
        chalk.yellow(
          `[Notice] 新しいバージョンが利用可能です！: ${chalk.gray(
            currentVersion
          )} --> ${chalk.green(latestVersion)}`
        )
      );
      console.log(
        chalk.yellow(
          `更新コマンド: ${chalk.cyan(
            `npm install -g ${packageName}@latest`
          )}\n`
        )
      );

      const { shouldUpdate } = await inquirer.prompt([
        {
          type: "confirm",
          name: "shouldUpdate",
          message: "パッケージを更新しますか？",
          default: true,
        },
      ]);

      if (shouldUpdate) {
        console.log(chalk.cyan(`\nパッケージを更新しています...`));

        const execPromise = util.promisify(exec);
        const command = `npm install -g ${packageName}@latest`;

        try {
          await execPromise(command);
          console.log(chalk.green("完了しました！"));
          console.log(
            chalk.yellow(
              "再度コマンドを実行して、新しいバージョンをご利用ください"
            )
          );
        } catch (error) {
          console.error(chalk.red("失敗しました"));
          console.error(error);
          console.log(chalk.yellow("以下のコマンドを実行してください:"));
          console.log(chalk.cyan(`npm install -g ${packageName}@latest`));
        }
        process.exit(0);
      }
    }
  } catch (e) {
    console.error("バージョンチェックに失敗しました:", e.message);
  }
}

async function main() {
  try {
    console.log(`${packageName}@${currentVersion}\n`);

    const logo = await render("CONNPASS\nPICKUP", {
      palette: "sunset",
      direction: "horizontal",
    });

    console.log(logo, "\n");

    console.log("\n--- 免責事項 ---");
    console.log(
      chalk.yellow("本ツール（以下、ツール）は実験目的で作成・公開されました。")
    );
    console.log(chalk.yellow("ツールの使用を推奨しません。"));
    console.log(
      chalk.yellow(
        "ツールを使用して発生した損害に関しては一切責任を負いません。\n"
      )
    );

    await checkVersion();

    let eventId;

    const argEventId = process.argv[2];
    if (argEventId) {
      eventId = argEventId;
    } else {
      const answers = await inquirer.prompt([
        {
          type: "input",
          name: "event",
          message: "connpassのeventURLまたはeventIdを入力してください:",
          validate: (input) =>
            input
              ? true
              : "この項目は必須です(eventId: https://connpass.com/event/[id]/ の[id]の部分)",
        },
      ]);
      eventId = answers.event;
    }
    const matchEventId = eventId.match(
      /https?:\/\/.*?connpass\.com\/event\/(\d+)/
    );
    eventId = matchEventId ? matchEventId[1] : eventId;
    const target = TARGET_URL.replace("[id]", eventId);
    console.log(`\neventId: ${eventId}`);
    console.log(`取得中: ${target}`);

    const response = await axios.get(target);
    const data = response.data;
    const $ = cheerio.load(data);
    const participants = {};

    const adminTable = $(".concerned_area .participants_table");
    if (adminTable.length) {
      const adminNames = [];
      adminTable.find("tbody .user .display_name a").each((j, user) => {
        const userElement = $(user);
        const name = userElement.text().trim();
        const href = userElement.attr("href");
        const match = href ? href.match(/user\/([^\/]+)/) : null;
        const username = match ? match[1] : "";
        adminNames.push(`${name} (${username})`);
      });
      if (adminNames.length > 0) {
        participants["☆管理者"] = adminNames;
      }
    }

    $(".participation_table_area").each((i, section) => {
      const roleNameElement = $(section).find("thead .label_ptype_name");
      if (roleNameElement.length) {
        const roleName = roleNameElement.text().trim();
        const names = [];
        $(section)
          .find("tbody .user .display_name a")
          .each((j, user) => {
            const userElement = $(user);
            const name = userElement.text().trim();
            const href = userElement.attr("href");
            const match = href ? href.match(/user\/([^\/]+)/) : null;
            const username = match ? match[1] : "";
            names.push(`${name} (${username})`);
          });
        if (names.length > 0) {
          participants[roleName] = names;
        }
      }
    });

    console.log("\n--- 取得完了 ---");
    console.log(participants);

    let members = [];
    const availableRoles = Object.keys(participants);
    let followUpAnswers;

    if (availableRoles.length > 0) {
      followUpAnswers = await inquirer.prompt([
        {
          type: "checkbox",
          name: "selectedRoles",
          message: "対象の参加枠を選択してください:",
          choices: availableRoles,
        },
        {
          type: "confirm",
          name: "allowDuplicates",
          message: "抽選リストの重複を削除しますか？(同じ人が複数枠にいる場合)",
          default: true,
        },
        {
          type: "confirm",
          name: "saveHtml",
          message: "結果をHTMLファイルで保存・表示しますか？",
          default: true,
        },
        {
          type: "input",
          name: "additionalMembers",
          message:
            "追加参加者をカンマ(,)区切りで入力してください(Enterでスキップ):",
        },
      ]);

      const rolesToProcess = followUpAnswers.selectedRoles;

      if (followUpAnswers.allowDuplicates) {
        const memberSet = new Set();
        for (const role of rolesToProcess) {
          if (participants[role]) {
            for (const member of participants[role]) {
              memberSet.add(member);
            }
          }
        }
        members = [...memberSet];
      } else {
        for (const role of rolesToProcess) {
          if (participants[role]) {
            members.push(...participants[role]);
          }
        }
      }

      if (followUpAnswers.additionalMembers) {
        const additional = followUpAnswers.additionalMembers
          .split(",")
          .map((name) => name.trim())
          .filter((name) => name);
        members.push(...additional);
      }
    } else {
      console.log("\n参加者が見つかりませんでした");
    }

    if (members.length === 0) {
      console.log("\n参加者がいないので処理を終了します");
      return;
    }

    let markdown = `# 順番 \n[Event URL](https://connpass.com/event/${eventId})`;
    console.log("\n--- 順番 ---");
    for (let i = members.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [members[i], members[j]] = [members[j], members[i]];
    }
    members.forEach((member, index) => {
      const result = `${index + 1}. ${member}`;
      console.log(result);
      markdown += `\n${index + 1}. ${member}`;
    });

    if (followUpAnswers && followUpAnswers.saveHtml) {
      const md = new MarkdownIt();
      const htmlFragment = md.render(markdown);
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const stylePath = path.join(__dirname, "assets", "style.css");
      const style = await fs.readFile(stylePath, "utf-8");
      const htmlPath = path.join(__dirname, "assets", "index.html");
      const html = await fs.readFile(htmlPath, "utf-8");
      const editedHtml = await prettier.format(
        html
          .replace("<style></style>", `<style>${style}</style>`)
          .replace("<main></main>", `<main>${htmlFragment}</main>`),
        {
          parser: "html",
        }
      );

      const outputDir = path.join(__dirname, "results");
      const tempFilePath = path.join(
        outputDir,
        `${eventId}_${Date.now()}.html`
      );
      await fs.mkdir(outputDir, { recursive: true });
      await fs.writeFile(tempFilePath, editedHtml, "utf-8");
      await open(tempFilePath);

      console.log(`\nブラウザで結果を表示します: ${tempFilePath}`);
    }
  } catch (e) {
    if (e.isTtyError) {
      console.log("\n処理がキャンセルされました");
    } else {
      console.error("\nエラー:", e.message);
      console.log("処理がキャンセルされました");
    }
  }
}

main();
