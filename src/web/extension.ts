/* eslint-disable curly */
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
// import { build } from "./old_builder/builder";
import { Dao3Account } from "./account";
import { ChatWebViewProvider } from "./caiplus/webview";
import { ungzip } from "pako";
import { Dao3ConfigCodeLensProvider } from "./codelensProvider";
import { Box3ExtMapTreeProvider } from "./box3ExtMapTreeProvider";
import { chooseWorkspace } from "./utils";
import { updateAllDts } from "./dtsUpdate";
import { logger } from "./logger";
import { buildProject } from "./build";
// import * as relative from "relative";

// let logger: vscode.LogOutputChannel | undefined;
async function readDao3Config() {
  let folder = await chooseWorkspace();
  if (!folder) return;
  let configpath = vscode.Uri.joinPath(folder.uri, "dao3.config.json");
  try {
    if (!await vscode.workspace.fs.stat(configpath)) {
      // error
      vscode.window.showErrorMessage("dao3.config.json不存在");
      return { folder, configpath: null };
    }
    return { folder, configpath };
  } catch (e) {
    vscode.window.showErrorMessage("dao3.config.json不存在");
    return { folder, configpath: null };
  }
}

const TEMPLATE_CONFIG: Record<string, string[]> = {
  base: ["base.json.gzip"],
};
async function copyTemplate(
  context: vscode.ExtensionContext,
  workspaceUri: vscode.Uri,
  template: string,
) {
  for (let dir of TEMPLATE_CONFIG[template]) {
    let tplPathUri = context.extensionUri;
    tplPathUri = tplPathUri.with({
      path: tplPathUri.path + `/src/web/project-templates/${dir}`,
    });
    // read json
    let data = ungzip(await vscode.workspace.fs.readFile(tplPathUri));
    await copyTemplateData(data, workspaceUri);
  }
}
async function copyTemplateData(data: any, workspaceUri: vscode.Uri) {
  let files = JSON.parse(new TextDecoder().decode(data)); //{filepath:text,"aaa/bbb/ccc.txt":"hello"}
  for (let filepath in files) {
    let filepathUri = workspaceUri.with({
      path: workspaceUri.path + "/" + filepath,
    });
    await vscode.workspace.fs.writeFile(
      filepathUri,
      new TextEncoder().encode(files[filepath]),
    );
    logger?.info("copy " + filepath + " to " + filepathUri.path);
  }
}

let user: Dao3Account | null = null;
let usercache: any;
async function checkLogin(immediate: boolean = false) {
  if (!user) return false;
  if (immediate) {
    try {
      let data = await user.getUserData();
      usercache = data;
      if (!data) return false;
    } catch (e) {
      usercache = null;
      logger.error("登录失败", e.message);
    }
  }
  setTimeout(async () => {
    try {
      usercache = await user.getUserData();
    } catch (e) {
      usercache = null;
      logger.error("登录失败", e.message);
    }
  }, 100);
  if (!usercache) return false;
  return true;
}
async function login() {
  let token = vscode.workspace.getConfiguration("arenaless.dao3.user").get(
    "userToken",
  );
  let userAgent = vscode.workspace.getConfiguration("arenaless.dao3.user").get(
    "userAgent",
  );
  if (!token || !userAgent) return;
  user = new Dao3Account(
    token,
    userAgent,
    logger,
  );
  // logger.info("user:", user.token,"ua",user.userAgent)
  if (await checkLogin(true)) {
    return true;
  }
  return false;
}
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  logger.info("ArenaLess: Activated");
  const statusBarIcon = vscode.window.createStatusBarItem(
    "arenaless",
    vscode.StatusBarAlignment.Right,
    Infinity,
  );
  // context.logger=logger;
  statusBarIcon.text = "AL";
  statusBarIcon.tooltip = "ArenaLess(未登录)";
  statusBarIcon.command = "arenaless.panel";
  statusBarIcon.backgroundColor = new vscode.ThemeColor("statusBar.background");
  statusBarIcon.show();

  // sidebar panel caiplus
  const webviewProvider = new ChatWebViewProvider(context, logger);
  let opt = { webviewOptions: { retainContextWhenHidden: true } };
  vscode.window.registerWebviewViewProvider(
    "caiplusaichat",
    webviewProvider,
    opt,
  );
  // sidebar scm extMap
  let box3extmaptree = new Box3ExtMapTreeProvider(() => user);
  vscode.window.registerTreeDataProvider(
    "submaptree",
    box3extmaptree
  );
  context.subscriptions.push(vscode.commands.registerCommand("submaptree.refreshEntry", async () => {
    box3extmaptree.refresh();
  }));
  context.subscriptions.push(vscode.commands.registerCommand("submaptree.openMapInBrowser", (editHash: string) => {
    vscode.env.openExternal(vscode.Uri.parse(`https://dao3.fun/edit/${editHash}`));
  }));
  let testLogin = async (message = false) => {
    if (await login()) {
      logger.info("登录成功");
      if (message) {
        vscode.window.showInformationMessage(
          `登录成功！(ID:${usercache.userId})${usercache.nickname}`,
        );
      }
      statusBarIcon.tooltip = "ArenaLess(已登录)";
      statusBarIcon.backgroundColor = new vscode.ThemeColor(
        "statusBar.prominentBackground",
      );
    } else {
      statusBarIcon.tooltip = "ArenaLess(未登录)";
      statusBarIcon.backgroundColor = new vscode.ThemeColor(
        "statusBar.background",
      );
      if (message) {
        let token = vscode.workspace.getConfiguration("arenaless.dao3.user").get(
          "userToken",
        );
        let userAgent = vscode.workspace.getConfiguration("arenaless.dao3.user").get(
          "userAgent",
        );
        if (!token && !userAgent) {
          return;
          // vscode.window.showErrorMessage("请设置Dao3用户信息");
        }
        vscode.window.showErrorMessage("登录失败 请查看输出>ArenaLess");
      }
    }
  };
  testLogin(true);
  vscode.workspace.onDidChangeConfiguration(async (ev) => {
    if (ev.affectsConfiguration("arenaless.dao3.user")) {
      testLogin(true);
    }
  });
  context.subscriptions.push(
    vscode.commands.registerCommand("arenaless.project.create", async () => {
      let folder = await chooseWorkspace();
      if (!folder) return;
      let files = await vscode.workspace.fs.readDirectory(folder.uri);
      if (files.length > 0) {
        vscode.window.showErrorMessage(
          "文件夹不为空，请选择一个空文件夹来创建项目",
        );
        return;
      }
      // eslint-disable-next-line @typescript-eslint/naming-convention
      let createMenu1 = { "创建普通项目(ArenaLess+TS)": "create-base", "使用在线模板……": "create-online" };
      let act = await vscode.window.showQuickPick(Object.keys(createMenu1));
      if (!act) return;
      if (createMenu1[act] === "create-base") {
        try {
          copyTemplate(context, folder.uri, "base");
        } catch (e) {
          logger?.error(e);
        }
      } else if (createMenu1[act] === "create-online") {
        vscode.window.showInformationMessage("正在获取模板列表……");
        const url = "https://arenaless-assets.tobylai.fun/templates.json";
        let resp = await fetch(url);
        let templates: { name: string, url: string }[] = await resp.json();
        let selname = await vscode.window.showQuickPick(templates.map(item => item.name),{title:"选择在线模板[ArenaPro使用需要执行`npm install`]",placeHolder:"请选择在线模板 本地使用爆红请npm install"});
        if (!selname) return;
        let template = templates.find(item => item.name === selname)!;
        let templateUrl = new URL(template.url, url);
        vscode.window.showInformationMessage(`正在下载模板${selname}……`);
        let resp2 = await fetch(templateUrl);
        let gzip=await resp2.arrayBuffer();
        copyTemplateData(ungzip(gzip),folder.uri);
      }
    }),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("arenaless.project.buildtest", async () => {
      let folder = await chooseWorkspace();
      if (!folder) return;
      try {
        let res = await buildProject(folder.uri);
        logger.info(res.server_bundle);
        logger.info(res.client_bundle);
      } catch (e) {
        logger?.error(e);
      }
    }),
  );
  // panel
  context.subscriptions.push(
    vscode.commands.registerCommand("arenaless.panel", async () => {
      // show quick pick
      let menu = {};
      let loggined = await checkLogin();
      menu[
        loggined
          ? `(ID:${usercache.userId})${usercache.nickname}`
          : "登录神岛账号"
      ] = "arenaless.dao3.login";
      menu["创建ArenaLess项目"] = "arenaless.project.create";
      menu["链接扩展地图"] = "arenaless.project.link";
      menu["构建并上传"] = "arenaless.project.buildNUpload";
      menu["同步.d.ts声明文件(手动)【ArenaPro提供+ArenaLess扩充】"] = "arenaless.project.updateDTS";
      if (loggined) {
        menu["登出"] = "arenaless.dao3.logout";
      }
      let act = await vscode.window.showQuickPick(Object.keys(menu), {
        placeHolder: "请选择操作",
      });
      if (menu[act]) {
        vscode.commands.executeCommand(menu[act]);
      }
    }),
  );
  // login(open settings ui to user)
  context.subscriptions.push(
    vscode.commands.registerCommand("arenaless.dao3.login", async () => {
      vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "arenaless.dao3.user",
      );
    }),
  );
  // link
  context.subscriptions.push(
    vscode.commands.registerCommand("arenaless.project.link", async () => {
      if (!await checkLogin()) {
        vscode.window.showErrorMessage("请先登录神岛账号");
        return;
      }
      let folder = await chooseWorkspace();
      if (!folder) return;
      let extMaps: Array<any> | undefined = await user.getExtMaps();
      // logger.info("maps", extMaps);
      if (!extMaps) {
        vscode.window.showErrorMessage("获取扩展地图列表失败");
        return;
      }
      // title and description
      let maps = extMaps.map((map) => {
        return {
          label: map.name,
          description: map.id.toString(),
          detail: map.describe.replace("\n", "  "),
        };
      });
      let picked = await vscode.window.showQuickPick(maps, {
        placeHolder: "请选择要链接的扩展地图",
      });
      if (!picked) {
        return;
      }
      let pickeddata = extMaps.find((map) =>
        map.id.toString() === picked.description
      );
      // write to dao3.config.json
      let playHash = pickeddata.playHash,
        editHash = pickeddata.editHash,
        id = pickeddata.id.toString();
      // load json
      let configpath = folder.uri.with({
        path: folder.uri.path + "/dao3.config.json",
      });
      // check exists
      if (!await vscode.workspace.fs.stat(configpath)) {
        // error
        vscode.window.showErrorMessage("dao3.config.json不存在");
        return;
      }
      let dao3config = JSON.parse(
        new TextDecoder().decode(
          await vscode.workspace.fs.readFile(configpath),
        ),
      );
      try {
        Object.assign(dao3config["ArenaPro"]["map"], {
          id,
          playHash,
          editHash,
        });
      } catch (e) {
        // 配置异常
        vscode.window.showErrorMessage(
          "dao3.config.json配置异常，请检查是否有ArenaPro.map",
        );
        return;
      }
      // write
      await vscode.workspace.fs.writeFile(
        configpath,
        new TextEncoder().encode(JSON.stringify(dao3config, null, 4)),
      );
    }),
  );
  // arenaless.project.buildNUpload
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "arenaless.project.buildNUpload",
      async () => {
        let folder = await chooseWorkspace();
        if (!folder) return;
        if (!await checkLogin()) {
          vscode.window.showErrorMessage("请先登录神岛账号");
          return;
        }
        // dao3.config.json
        let configpath = vscode.Uri.joinPath(folder.uri, "dao3.config.json");
        try {
          if (!await vscode.workspace.fs.stat(configpath)) {
            // error
            vscode.window.showErrorMessage("dao3.config.json不存在");
            return;
          }
        } catch (e) {
          vscode.window.showErrorMessage("dao3.config.json不存在");
          return;
        }
        let id, playHash, editHash;
        try {
          let dao3config = JSON.parse(
            new TextDecoder().decode(
              await vscode.workspace.fs.readFile(configpath),
            ),
          );
          id = dao3config["ArenaPro"]["map"]["id"],
            playHash = dao3config["ArenaPro"]["map"]["playHash"],
            editHash = dao3config["ArenaPro"]["map"]["editHash"];
          if (!id || !playHash || !editHash) {
            vscode.window.showErrorMessage(
              "dao3.config.json配置异常，请检查是否有ArenaPro.map.id等配置",
            );
            return;
          }
        } catch (e) {
          vscode.window.showErrorMessage(
            "dao3.config.json配置异常，请检查是否有ArenaPro.map",
          );
          return;
        }
        // build
        logger?.show();
        vscode.window.showInformationMessage("构建中……");
        let startTime = Date.now();
        let buildRes: any;
        try {
          buildRes = await buildProject(folder.uri);
        } catch (e) {
          vscode.window.showErrorMessage("构建失败，请查看输出");
          logger?.error(e);
          return;
        }
        // upload
        try {
          let success = await user.uploadBuild(
            id.toString(),
            buildRes.server_bundle,
            buildRes.client_bundle,
            buildRes.outputName
          );
          if (success) {
            vscode.window.showInformationMessage(
              "上传成功，耗时" + (Date.now() - startTime) + "ms",
            );
          } else {
            vscode.window.showErrorMessage("上传失败，请查看输出");
          }
        } catch (e) {
          logger?.error(e);
        }
      },
    ),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "arenaless.caiplus.ask_with_code",
      async () => {
        webviewProvider.show();
        // get text editor selection
        let editor = vscode.window.activeTextEditor;
        let doc = editor.document;
        let text = doc.getText(editor.selection);
        webviewProvider.sendMessage({
          "code": text,
          "action": "ask_with_code",
        });
      },
    ),
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("arenaless.activate-ext", () => { }),
  );
  // logout
  context.subscriptions.push(
    vscode.commands.registerCommand("arenaless.dao3.logout", async () => {
      // erase settings
      await vscode.workspace.getConfiguration().update(
        "arenaless.dao3.user.userToken",
        "",
        vscode.ConfigurationTarget.Global,
      );
      await vscode.workspace.getConfiguration().update(
        "arenaless.dao3.user.userAgent",
        "",
        vscode.ConfigurationTarget.Global,
      );
      user = null;
      if (!await checkLogin()) {
        vscode.window.showInformationMessage("已退出登录");
      } else vscode.window.showInformationMessage("退出登录失败");
    }),
  );
  // Code Lens for dao3.config.json
  context.subscriptions.push(vscode.languages.registerCodeLensProvider({ language: "json", pattern: "**/dao3.config.json" }, new Dao3ConfigCodeLensProvider(logger)));
  context.subscriptions.push(vscode.commands.registerCommand("arenaless.project.dao3cfg.selectOutputAndUpdate", async () => {
    let { folder, configpath } = await readDao3Config();
    if (!configpath) return;
    // read
    try {
      let dao3config = JSON.parse(
        new TextDecoder().decode(
          await vscode.workspace.fs.readFile(configpath),
        ),
      );
      if (!dao3config.ArenaPro.outputAndUpdate || dao3config.ArenaPro.outputAndUpdate.length === 0) {
        dao3config.ArenaPro.outputAndUpdate = ["bundle.js"];
      }
      let selList2conf:Record<string,any>={};
      let selList = dao3config.ArenaPro.outputAndUpdate.map((x:any)=>{
        if(typeof x==="string"){
          selList2conf[x]=x;
          return x;
        }else{
          selList2conf[x.name]=x;
          return x.name;
        }
      });
      if (!selList.includes("bundle.js")) {
        selList.push("bundle.js");
      }
      let selected = await vscode.window.showQuickPick(selList, {
        canPickMany: false,
        title: "选择编译输出文件名",
      });
      if (!selected) return;
      // remove selected
      dao3config.ArenaPro.outputAndUpdate = dao3config.ArenaPro.outputAndUpdate.filter((item: string) => item !== selList2conf[selected]);
      // add selected to the first
      dao3config.ArenaPro.outputAndUpdate.unshift(selList2conf[selected]);
      // write config
      await vscode.workspace.fs.writeFile(configpath, new TextEncoder().encode(JSON.stringify(dao3config, null, 4)));
    } catch (e) {
      vscode.window.showErrorMessage("dao3.config.json outputAndUpdate 读取失败");
      logger?.error(e);
      return;
    }
  }));
  context.subscriptions.push(vscode.commands.registerCommand("arenaless.project.openMap", async () => {
    let { folder, configpath } = await readDao3Config();
    if (!configpath) return;
    // read
    try {
      let dao3config = JSON.parse(
        new TextDecoder().decode(
          await vscode.workspace.fs.readFile(configpath),
        ),
      );
      let editHash = dao3config["ArenaPro"]["map"]["editHash"];
      vscode.env.openExternal(vscode.Uri.parse(`https://dao3.fun/edit/${editHash}`));
    } catch (e) {
      vscode.window.showErrorMessage("dao3.config.json 读取失败");
      logger?.error(e);
      return;
    }
  }));
  context.subscriptions.push(vscode.commands.registerCommand("arenaless.project.updateDTS", () => {
    updateAllDts().then(() => {
      // vscode.window.showInformationMessage("ArenaLess: 已更新所有dts文件");
    }).catch((e) => {
      vscode.window.showErrorMessage("ArenaLess: 更新dts文件失败");
      logger?.error(e);
    });
  }));
}


// This method is called when your extension is deactivated
export function deactivate() { }
