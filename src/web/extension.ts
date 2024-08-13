/* eslint-disable curly */
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { build } from "./builder";
import * as path from "path-browserify";
import { Dao3Account } from "./account";
// import * as relative from "relative";

let logger: vscode.LogOutputChannel | undefined;
async function chooseWorkspace(): Promise<vscode.WorkspaceFolder | undefined> {
  let folders: any = vscode.workspace.workspaceFolders;
  if (!folders) {
    vscode.window.showErrorMessage("未检测到已打开的工作区");
    return;
  }
  let folder = folders[0];
  if (folders.length > 1) {
    folder = await vscode.window.showWorkspaceFolderPick({
      placeHolder: "请选择要创建项目的文件夹",
    });
    if (!folder) return;
  }
  logger?.info(`choose workspace:${folder.uri.path}`);
  return folder;
}

const TEMPLATE_CONFIG: Record<string, string[]> = {
  base: ["base.json"],
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
    let data = await vscode.workspace.fs.readFile(tplPathUri);
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
}

let user: Dao3Account | null = null;
let usercache: any;
async function checkLogin() {
  if (!user) return false;
  try {
    let data = await user.getUserData();
    if (!data) return false;
    usercache = data;
  } catch (e) {
    logger.error(e);
    return false;
  }
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
  if (await checkLogin()) {
    return true;
  }
  return false;
}
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  logger = vscode.window.createOutputChannel("ArenaLess", { log: true });
  logger.info("ArenaLess: Activated");
  const statusBarIcon = vscode.window.createStatusBarItem(
    "arenaless",
    vscode.StatusBarAlignment.Right,
    Infinity,
  );
  statusBarIcon.text = "AL";
  statusBarIcon.tooltip = "ArenaLess(未登录)";
  statusBarIcon.command = "arenaless.panel";
  statusBarIcon.backgroundColor = new vscode.ThemeColor("statusBar.background");
  statusBarIcon.show();
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
    }
  };
  testLogin();
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
      try {
        copyTemplate(context, folder.uri, "base");
      } catch (e) {
        logger?.error(e);
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
      menu[
        (await checkLogin())
          ? `(ID:${usercache.userId})${usercache.nickname}`
          : "登录神岛账号"
      ] = "arenaless.dao3.login";
      menu["创建ArenaLess项目"] = "arenaless.project.create";
      menu["链接扩展地图"] = "arenaless.project.link";
      menu["构建并上传"] = "arenaless.project.buildNUpload";
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
        let configpath = folder.uri.with({
          path: folder.uri.path + "/dao3.config.json",
        });
        if (!await vscode.workspace.fs.stat(configpath)) {
          // error
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
}

// async function getFileContent(uri: vscode.Uri): Promise<string> {
//   return new Promise((resolve, reject) => {
//     vscode.workspace.fs.readFile(uri).then(
//       (content) => {
//         const textDecoder = new TextDecoder();
//         const fileContent = textDecoder.decode(content);
//         resolve(fileContent);
//       },
//       (error) => {
//         reject(error);
//       },
//     );
//   });
// }

export async function walk(folder: vscode.Uri): Promise<string[]> {
  const list: string[] = [];
  for (const [name, type] of await vscode.workspace.fs.readDirectory(folder)) {
    const filePath = path.join(folder.path, name);
    if (type === vscode.FileType.File) {
      list.push(filePath);
    } else if (type === vscode.FileType.Directory) {
      // if (name.startsWith('.')) {
      //   continue;
      // }
      const subList = await walk(vscode.Uri.file(filePath));
      list.push(...subList);
    }
  }
  return list;
}
async function walkDirectory(
  folder: vscode.Uri,
): Promise<Record<string, string>> {
  let list = await walk(folder);
  let res = {};
  for (let name of list) {
    // logger.info(name);
    name = path.relative(folder.path, name);
    res[name] = new TextDecoder().decode(
      await vscode.workspace.fs.readFile(
        folder.with({ path: path.join(folder.path, name) }),
      ),
    );
  }
  return res;
}

// function pathJoin(...paths: string[]): string {
//   return paths.filter(Boolean).join("/");
// }
// function relative(from, to) {
//   return path.relative(from, to);
// }
async function buildProject(workspaceUri: vscode.Uri) {
  let res = await walkDirectory(workspaceUri);
  // logger.info(JSON.stringify(res))
  let dao3Conf = JSON.parse(res["dao3.config.json"]);
  // server build
  let serverPath = dao3Conf.ArenaPro.file.typescript.server.base;
  let serverEntry = dao3Conf.ArenaPro.file.typescript.server.entry;
  // if (!serverEntry.startsWith("/")) serverEntry = "/" + serverEntry;
  logger.info("serverPath:" + serverPath + " serverEntry:" + serverEntry);
  let serverFiles_ = await walkDirectory(
    workspaceUri.with({ path: path.join(workspaceUri.path, serverPath) }),
  );
  // add a "/" before them
  let serverFiles: Record<string, string> = {};
  for (let key in serverFiles_) {
    serverFiles[key] = serverFiles_[key];
  }
  // logger.info(JSON.stringify(serverFiles))
  // vscode.workspace.fs.writeFile(workspaceUri.with({ path: workspaceUri.path + "/serverFiles" }),new TextEncoder().encode(JSON.stringify(serverFiles)))
  // logger.info(Object.keys(serverFiles).toString())
  let serverBundle = await build(
    serverFiles,
    serverEntry,
    serverFiles["tsconfig.json"],
    logger,
    dao3Conf,
  );
  // logger.info(`serverBundle:${serverBundle}`);
  // client(the same!)
  let clientPath = dao3Conf.ArenaPro.file.typescript.client.base;
  let clientEntry = dao3Conf.ArenaPro.file.typescript.client.entry;
  // if (!clientEntry.startsWith("/")) clientEntry = "/" + clientEntry;
  logger.info("clientPath:" + clientPath + " clientEntry:" + clientEntry);
  let clientFiles_ = await walkDirectory(
    workspaceUri.with({ path: path.join(workspaceUri.path, clientPath) }),
  );
  let clientFiles: Record<string, string> = {};
  for (let key in clientFiles_) {
    clientFiles[key] = clientFiles_[key];
  }
  let clientBundle = await build(
    clientFiles,
    clientEntry,
    clientFiles["tsconfig.json"],
    logger,
    dao3Conf,
  );
  // logger.info(`clientBundle:${clientBundle}`);
  return {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    server_bundle: serverBundle,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    client_bundle: clientBundle,
  };
}

// This method is called when your extension is deactivated
export function deactivate() {}
