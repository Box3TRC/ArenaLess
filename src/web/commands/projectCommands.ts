/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from "vscode";
import { copyTemplate } from "../helpers/templateHelpers";
import { buildProject } from "../build";
import { logger } from "../logger";
import { chooseWorkspace, isFileExists } from "../utils";
import { checkLogin } from "./authCommands";
import { readDao3Config } from "../helpers/configHelpers";
import { updateAllDts } from "../dtsUpdate";
import { user,usercache } from "./authCommands";

export function registerProjectCommands(context: vscode.ExtensionContext) {
    // 创建项目命令
    context.subscriptions.push(
        vscode.commands.registerCommand(
            "arenaless.project.create",
            async () => {
                let folder = await chooseWorkspace();
                if (!folder) return;
                let files = await vscode.workspace.fs.readDirectory(folder.uri);
                if (files.length > 0) {
                    vscode.window.showErrorMessage(
                        "文件夹不为空，请选择一个空文件夹来创建项目",
                    );
                    return;
                }
                const createMenu1: Record<string, string> = {
                    "创建普通项目(ArenaLess+TS)": "create-base",
                    "使用在线模板……": "create-online",
                };
                let act = await vscode.window.showQuickPick(
                    Object.keys(createMenu1),
                );
                if (!act) return;
                if (createMenu1[act] === "create-base") {
                    try {
                        copyTemplate(context, folder.uri, "base");
                    } catch (e) {
                        logger?.error(
                            e instanceof Error ? e : new Error(String(e)),
                        );
                    }
                } else if (createMenu1[act] === "create-online") {
                    vscode.window.showInformationMessage("正在获取模板列表……");
                    const url =
                        "https://arenaless-assets.tobylai.fun/templates.json";
                    let resp = await fetch(url);
                    let templates: { name: string; url: string }[] = await resp
                        .json();
                    let selname = await vscode.window.showQuickPick(
                        templates.map((item) => item.name),
                        {
                            title:
                                "选择在线模板[ArenaPro使用需要执行`npm install`]",
                            placeHolder:
                                "请选择在线模板 本地使用爆红请npm install",
                        },
                    );
                    if (!selname) return;
                    let template = templates.find((item) =>
                        item.name === selname
                    )!;
                    let templateUrl = new URL(template.url, url);
                    vscode.window.showInformationMessage(
                        `正在下载模板${selname}……`,
                    );
                    let resp2 = await fetch(templateUrl);
                    let gzip = await resp2.arrayBuffer();
                    const {ungzip} = await import("pako");
                    copyTemplateData(ungzip(gzip), folder.uri);
                }
            },
        ),
        vscode.commands.registerCommand("arenaless.project.link", async () => {
            if (!await checkLogin()) {
                vscode.window.showErrorMessage("请先登录神岛账号");
                return;
            }
            let folder = await chooseWorkspace();
            if (!folder) return;
            let extMaps: Array<any> | undefined = await user!.getExtMaps();
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
            if (!await isFileExists(configpath)) {
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
        // 构建测试命令
        vscode.commands.registerCommand(
            "arenaless.project.buildtest",
            async () => {
                let folder = await chooseWorkspace();
                if (!folder) return;
                try {
                    let res = await buildProject(folder.uri);
                    logger.info(res.server_bundle);
                    logger.info(res.client_bundle);
                } catch (e) {
                    logger?.error(
                        e instanceof Error ? e : new Error(String(e)),
                    );
                }
            },
        ),
        // 构建并上传命令
        vscode.commands.registerCommand(
            "arenaless.project.buildNUpload",
            async () => {
                let folder = await chooseWorkspace();
                if (!folder) return;
                if (!await checkLogin()) {
                    vscode.window.showErrorMessage("请先登录神岛账号");
                    return;
                }
                let configpath = vscode.Uri.joinPath(
                    folder.uri,
                    "dao3.config.json",
                );
                if(!isFileExists(configpath)){
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
                    id = dao3config["ArenaPro"]["map"]["id"];
                    playHash = dao3config["ArenaPro"]["map"]["playHash"];
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
                logger?.show();
                vscode.window.showInformationMessage("构建中……");
                let startTime = Date.now();
                let buildRes: any;
                try {
                    buildRes = await buildProject(folder.uri);
                } catch (e) {
                    vscode.window.showErrorMessage("构建失败，请查看输出");
                    logger?.error(
                        e instanceof Error ? e : new Error(String(e)),
                    );
                    return;
                }
                try {
                    let success = await user!.uploadBuild(
                        id.toString(),
                        buildRes.server_bundle,
                        buildRes.client_bundle,
                        buildRes.outputName,
                    );
                    if (success) {
                        vscode.window.showInformationMessage(
                            "上传成功，耗时" + (Date.now() - startTime) + "ms",
                        );
                    } else {
                        vscode.window.showErrorMessage("上传失败，请查看输出");
                    }
                } catch (e) {
                    logger?.error(
                        e instanceof Error ? e : new Error(String(e)),
                    );
                }
                try {
                    if (usercache && usercache.userId && usercache.nickname) {
                        await fetch(
                            "https://box3lab-api.fanhat.cn/dao3lab/arenapro_building_count",
                            {
                                method: "POST",
                                body: JSON.stringify({
                                    type: 1,
                                    userid: usercache.userId,
                                    name: usercache.nickname + "@al",
                                    mapid: id.toString(),
                                    buildingTime:
                                        ((Date.now() - startTime) / 1000)
                                            .toFixed(2) + "s",
                                }),
                            },
                        );
                    }
                } catch (e) {
                    logger?.error("lab", e);
                }
            },
        ),
        // 选择输出文件并更新命令
        vscode.commands.registerCommand(
            "arenaless.project.dao3cfg.selectOutputAndUpdate",
            async () => {
                const result = await readDao3Config();
                if (!result) return;
                const { folder, configpath } = result;
                if (!configpath) return;
                try {
                    let dao3config = JSON.parse(
                        new TextDecoder().decode(
                            await vscode.workspace.fs.readFile(configpath),
                        ),
                    );
                    if (
                        !dao3config.ArenaPro.outputAndUpdate ||
                        dao3config.ArenaPro.outputAndUpdate.length === 0
                    ) {
                        dao3config.ArenaPro.outputAndUpdate = ["bundle.js"];
                    }
                    let selList2conf: Record<string, any> = {};
                    let selList = dao3config.ArenaPro.outputAndUpdate.map(
                        (x: any) => {
                            if (typeof x === "string") {
                                selList2conf[x] = x;
                                return x;
                            } else {
                                selList2conf[x.name] = x;
                                return x.name;
                            }
                        },
                    );
                    if (!selList.includes("bundle.js")) {
                        selList.push("bundle.js");
                    }
                    let selected = await vscode.window.showQuickPick(selList, {
                        canPickMany: false,
                        title: "选择编译输出文件名",
                    });
                    if (!selected) {
                        return;
                    }
                    dao3config.ArenaPro.outputAndUpdate = dao3config.ArenaPro
                        .outputAndUpdate.filter((item: string) =>
                            item !== selList2conf[selected]
                        );
                    dao3config.ArenaPro.outputAndUpdate.unshift(
                        selList2conf[selected],
                    );
                    await vscode.workspace.fs.writeFile(
                        configpath,
                        new TextEncoder().encode(
                            JSON.stringify(dao3config, null, 4),
                        ),
                    );
                } catch (e) {
                    vscode.window.showErrorMessage(
                        "dao3.config.json outputAndUpdate 读取失败",
                    );
                    logger?.error(
                        e instanceof Error ? e : new Error(String(e)),
                    );
                    return;
                }
            },
        ),
        // 打开地图命令
        vscode.commands.registerCommand(
            "arenaless.project.openMap",
            async () => {
                let cfg = await readDao3Config();
                if (!cfg) return;
                let { folder, configpath } = cfg;
                if (!configpath) return;
                try {
                    let dao3config = JSON.parse(
                        new TextDecoder().decode(
                            await vscode.workspace.fs.readFile(configpath),
                        ),
                    );
                    let editHash = dao3config["ArenaPro"]["map"]["editHash"];
                    vscode.env.openExternal(
                        vscode.Uri.parse(`https://dao3.fun/edit/${editHash}`),
                    );
                } catch (e) {
                    vscode.window.showErrorMessage("dao3.config.json 读取失败");
                    logger?.error(
                        e instanceof Error ? e : new Error(String(e)),
                    );
                    return;
                }
            },
        ),
        // 更新DTS命令
        vscode.commands.registerCommand("arenaless.project.updateDTS", () => {
            updateAllDts().then(() => {
                vscode.window.showInformationMessage(
                    "ArenaLess: 已更新所有dts文件",
                );
            }).catch((e) => {
                vscode.window.showErrorMessage("ArenaLess: 更新dts文件失败");
                logger?.error(e);
            });
        }),
    );
}

async function copyTemplateData(data: any, workspaceUri: vscode.Uri) {
    let files = JSON.parse(new TextDecoder().decode(data));
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
