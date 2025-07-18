import * as vscode from "vscode";
import { Dao3Account } from "../account";
import { logger } from "../logger";

export let user: Dao3Account | null = null;
export let usercache: any = null;

export async function checkLogin(immediate: boolean = false) {
    if (!user) {
        return false;
    }
    if (immediate) {
        try {
            let data = await user.getUserData();
            usercache = data;
            if (!data) return false;
        } catch (e) {
            usercache = null;
            logger.error("登录失败", (e as any).message);
        }
    }
    setTimeout(async () => {
        try {
            usercache = await user!.getUserData();
        } catch (e) {
            usercache = null;
            logger.error("登录失败", (e as any).message);
        }
    }, 100);
    if (!usercache) {
        return false;
    }
    return true;
}

export async function login() {
    let token = vscode.workspace.getConfiguration("arenaless.dao3.user").get<string>(
        "userToken",
    );
    let userAgent = vscode.workspace.getConfiguration("arenaless.dao3.user")
        .get<string>(
            "userAgent",
        );
    if (!token || !userAgent) return;
    if(token.startsWith("{")){
        token=JSON.parse(token).data.token;
    }
    user = new Dao3Account(
        token!,
        userAgent,
        logger,
    );
    if (await checkLogin(true)) {
        return true;
    }
    return false;
}

export function registerAuthCommands(context: vscode.ExtensionContext) {
    // 登录命令
    context.subscriptions.push(
        vscode.commands.registerCommand("arenaless.dao3.login", async () => {
            vscode.commands.executeCommand(
                "workbench.action.openSettings",
                "arenaless.dao3.user",
            );
        }),
        // 登出命令
        vscode.commands.registerCommand("arenaless.dao3.logout", async () => {
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
            usercache = null;
            if (!await checkLogin()) {
                vscode.window.showInformationMessage("已退出登录");
            } else vscode.window.showInformationMessage("退出登录失败");
        }),
    );
}
