import * as vscode from "vscode";
export async function chooseWorkspace(logger?:vscode.LogOutputChannel): Promise<vscode.WorkspaceFolder | undefined> {
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
      if (!folder) {return;}
    }
    logger?.info(`choose workspace:${folder.uri.path}`);
    return folder;
  }
  
export async function isFileExists(file:vscode.Uri) {
  try{
    await vscode.workspace.fs.stat(file);
    return true;
  }catch(e){
    return false;
  }
}