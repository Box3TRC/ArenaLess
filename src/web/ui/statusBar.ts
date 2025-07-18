import * as vscode from "vscode";

let statusBarIcon: vscode.StatusBarItem;

export function createStatusBar() {
    statusBarIcon = vscode.window.createStatusBarItem(
        "arenaless",
        vscode.StatusBarAlignment.Right,
        Infinity,
    );
    statusBarIcon.text = "AL";
    statusBarIcon.tooltip = "ArenaLess(未登录)";
    statusBarIcon.command = "arenaless.panel";
    statusBarIcon.backgroundColor = new vscode.ThemeColor("statusBar.background");
    statusBarIcon.show();
    return statusBarIcon;
}

export function updateStatusBar(loggedIn: boolean, usercache: any) {
    if (loggedIn===true&&usercache!==null) {
        statusBarIcon.tooltip = `ArenaLess(已登录: ${usercache.nickname})`;
        statusBarIcon.backgroundColor = new vscode.ThemeColor("statusBar.prominentBackground");
    } else {
        statusBarIcon.tooltip = "ArenaLess(未登录)";
        statusBarIcon.backgroundColor = new vscode.ThemeColor("statusBar.background");
    }
}