/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable curly */
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { ChatWebViewProvider } from "./caiplus/webview";
import { Box3ExtMapTreeProvider } from "./box3ExtMapTreeProvider";
import { Dao3ConfigCodeLensProvider } from "./codelensProvider";
import { logger } from "./logger";
import { registerProjectCommands } from "./commands/projectCommands";
import {
    checkLogin,
    login,
    registerAuthCommands,
    user,
    usercache,
} from "./commands/authCommands";
import { createStatusBar, updateStatusBar } from "./ui/statusBar";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    logger.info("ArenaLess: Activated");
    const statusBarIcon = createStatusBar();

    // 注册命令
    registerProjectCommands(context);
    registerAuthCommands(context);

    // sidebar panel caiplus
    const webviewProvider = new ChatWebViewProvider(context, logger);
    let opt = { webviewOptions: { retainContextWhenHidden: true } };
    vscode.window.registerWebviewViewProvider(
        "caiplusaichat",
        webviewProvider,
        opt,
    );

    // sidebar extMap
    let box3extmaptree = new Box3ExtMapTreeProvider(() => user);
    vscode.window.registerTreeDataProvider(
        "submaptree",
        box3extmaptree,
    );
    context.subscriptions.push(
        vscode.commands.registerCommand("submaptree.refreshEntry", async () => {
            box3extmaptree.refresh();
        }),
    );
    context.subscriptions.push(
        vscode.commands.registerCommand(
            "submaptree.openMapInBrowser",
            (editHash: string) => {
                vscode.env.openExternal(
                    vscode.Uri.parse(`https://dao3.fun/edit/${editHash}`),
                );
            },
        ),
    );

    // 面板命令
    context.subscriptions.push(
        vscode.commands.registerCommand("arenaless.panel", async () => {
            let menu: Record<string, string> = {};
            let loggined = await checkLogin(true);
            menu[
                loggined
                    ? `(ID:${usercache.userId})${usercache.nickname}`
                    : "登录神岛账号"
            ] = "arenaless.dao3.login";
            menu["创建ArenaLess项目"] = "arenaless.project.create";
            menu["链接扩展地图"] = "arenaless.project.link";
            menu["构建并上传"] = "arenaless.project.buildNUpload";
            menu["同步.d.ts声明文件(手动)【ArenaPro提供+ArenaLess扩充】"] =
                "arenaless.project.updateDTS";
            if (loggined) {
                menu["登出"] = "arenaless.dao3.logout";
            }
            let act = await vscode.window.showQuickPick(Object.keys(menu), {
                placeHolder: "请选择操作",
            });
            if (act && menu[act]) {
                vscode.commands.executeCommand(menu[act]);
            }
        }),
    );

    // CaiPlus命令
    context.subscriptions.push(
        vscode.commands.registerCommand(
            "arenaless.caiplus.ask_with_code",
            async () => {
                webviewProvider.show();
                let editor = vscode.window.activeTextEditor;
                if (!editor) {
                    return;
                }
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
        vscode.commands.registerCommand("arenaless.activate-ext", () => {}),
    );

    // Code Lens for dao3.config.json
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider({
            language: "json",
            pattern: "**/dao3.config.json",
        }, new Dao3ConfigCodeLensProvider(logger)),
    );

    // 初始化登录状态
    let testLogin = async (message = false) => {
        const res=await login();
        if (res) {
            logger.info("登录成功");
            if (message) {
                vscode.window.showInformationMessage(
                    `登录成功！(ID:${usercache.userId})${usercache.nickname}`,
                );
                try {
                    await fetch(
                        "https://box3lab-api.fanhat.cn/dao3lab/arenapro_count",
                        {
                            method: "POST",
                            body: JSON.stringify({
                                userId: usercache.userId,
                                nickname: usercache.nickname + "@al",
                            }),
                        },
                    );
                } catch (e) {
                    logger.error("lab", (e as any).message);
                }
            }
            updateStatusBar(true, usercache);
        } else if(res===false) {
            updateStatusBar(false, null);
            if (message) {
                let token = vscode.workspace.getConfiguration(
                    "arenaless.dao3.user",
                ).get<string>("userToken");
                let userAgent = vscode.workspace.getConfiguration(
                    "arenaless.dao3.user",
                ).get<string>("userAgent");
                if (!token && !userAgent) {
                    return;
                }
                vscode.window.showErrorMessage("登录失败 请查看输出>ArenaLess");
            }
        }
    };
    testLogin(true);

    // 配置变更监听
    vscode.workspace.onDidChangeConfiguration(async (ev) => {
        if (ev.affectsConfiguration("arenaless.dao3.user")) {
            await testLogin(true);
        }
    });
}

// This method is called when your extension is deactivated
export function deactivate() {}
