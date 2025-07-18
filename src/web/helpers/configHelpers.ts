import * as vscode from "vscode";
import { chooseWorkspace } from "../utils";
import { logger } from "../logger";

export async function readDao3Config(): Promise<{ folder: vscode.WorkspaceFolder; configpath: vscode.Uri | null } | undefined> {
    let folder = await chooseWorkspace();
    if (!folder) return undefined;
    let configpath = vscode.Uri.joinPath(folder.uri, "dao3.config.json");
    try {
        if (!await vscode.workspace.fs.stat(configpath)) {
            vscode.window.showErrorMessage("dao3.config.json不存在");
            return { folder, configpath: null };
        }
        return { folder, configpath };
    } catch (e) {
        vscode.window.showErrorMessage("dao3.config.json不存在");
        return { folder, configpath: null };
    }
}