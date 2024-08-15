import * as vscode from "vscode";
import path from "path-browserify";

export function getNonce() {
    let text = "";
    const possible =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

export class ChatWebViewProvider implements vscode.WebviewViewProvider{
    extentionContext: vscode.ExtensionContext;
    logger:vscode.LogOutputChannel;
    webviewView:vscode.WebviewView;
    constructor(extentionContext: vscode.ExtensionContext,logger:vscode.LogOutputChannel){
        this.extentionContext=extentionContext;
        this.logger=logger;
    }
    async resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext, token: vscode.CancellationToken): Promise<void> {
        webviewView.webview.options={
            localResourceRoots:[vscode.Uri.joinPath(this.extentionContext.extensionUri,"src/web/caiplus/page")],
            enableScripts:true,
            enableForms: true,
            enableCommandUris: true,
        };
        let html=new TextDecoder().decode(await vscode.workspace.fs.readFile(vscode.Uri.joinPath(this.extentionContext.extensionUri,"src/web/caiplus/page/index.dist.html")));
        // replace All!
        // html.replace(/%assets%/g,"https:/")
        // html=html.replace(/%assets%/g,webviewView.webview.asWebviewUri(vscode.Uri.joinPath(this.extentionContext.extensionUri,"src/web/caiplus/page/assets")).toString());
        // html=html.replace(/%nonce%/g,getNonce());
        // this.logger.info(html);
        webviewView.webview.html=html;
        this.webviewView=webviewView;
    }
    sendMessage(data:any) {
        this.webviewView.webview.postMessage(data);
    }
    show(){
        this.webviewView.show();
    }
}