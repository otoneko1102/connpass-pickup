import fs from "fs/promises";
import path from "path";
import { render } from "oh-my-logo";
import axios from "axios";
import * as cheerio from "cheerio";
import inquirer from "inquirer";
import MarkdownIt from "markdown-it";
import prettier from "prettier";
import open from "open";

const TARGET_URL = "https://connpass.com/event/[id]/participation/";

async function main() {
  try {
    const logo = await render("CONNPASS\nPICKUP", {
      palette: "sunset",
      direction: "horizontal",
    });

    console.log(logo, "\n");

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

    const match = answers.event.match(/https?:\/\/.*?connpass\.com\/event\/(\d+)/);
    const eventId = match ? match[1] : answers.event;
    const target = TARGET_URL.replace("[id]", eventId);
    console.log(`\neventId: ${eventId}`);
    console.log(`取得中: ${target}`);

    const response = await axios.get(target);
    const data = response.data;
    const $ = cheerio.load(data);
    const participants = {};

    $(".participation_table_area").each((i, section) => {
      const roleNameElement = $(section).find("thead .label_ptype_name");
      if (roleNameElement.length) {
        const roleName = roleNameElement.text().trim();
        const names = [];
        $(section)
          .find("tbody .user .display_name a")
          .each((j, user) => {
            names.push($(user).text().trim());
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

    if (availableRoles.length > 0) {
      const followUpAnswers = await inquirer.prompt([
        {
          type: "checkbox",
          name: "selectedRoles",
          message:
            "対象の参加枠を選択してください(Spaceで選択/選択なしで全選択/Enterで確定)",
          choices: availableRoles,
        },
        {
          type: "input",
          name: "additionalMembers",
          message:
            "追加参加者をカンマ(,)区切りで入力してください(Enterでスキップ):",
        },
      ]);

      let rolesToProcess = followUpAnswers.selectedRoles;
      if (rolesToProcess.length === 0) {
        rolesToProcess = availableRoles;
      }

      for (const role of rolesToProcess) {
        members.push(...participants[role]);
      }

      if (followUpAnswers.additionalMembers) {
        const additional = followUpAnswers.additionalMembers
          .split(",")
          .map((name) => name.trim())
          .filter((name) => name);
        members.push(...additional);
      }
    } else {
      console.log("\n参加枠が見つかりませんでした");
    }

    if (members.length === 0) {
      console.log("\n発表者がいないので処理を終了します");
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

    const md = new MarkdownIt();
    const htmlFragment = md.render(markdown);
    const stylePath = path.join("./assets", "style.css");
    const style = await fs.readFile(stylePath, "utf-8");
    const htmlPath = path.join("./assets", "index.html");
    const html = await fs.readFile(htmlPath, "utf-8");
    const editedHtml = await prettier.format(
      html
        .replace("<style></style>", `<style>${style}</style>`)
        .replace("<main></main>", `<main>${htmlFragment}</main>`),
      {
        parser: "html",
      }
    );

    const outputDir = path.resolve("./results");
    const tempFilePath = path.join(
      outputDir,
      `${eventId}_${Date.now()}.html`
    );
    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(tempFilePath, editedHtml, "utf-8");
    await open(tempFilePath);

    console.log(`\nブラウザで結果を表示します: ${tempFilePath}`);
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
