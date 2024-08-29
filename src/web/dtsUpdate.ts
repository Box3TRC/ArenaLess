/* eslint-disable @typescript-eslint/naming-convention */
import { md5 } from 'js-md5';
import * as vscode from "vscode";
import { chooseWorkspace } from './utils';

const DTS_PREFIX = "https://arenaless-assets.tobylai.fun";
const DTS_INDEX = "/dts.json";
let dts_dat: any = {};

/**{
    "server":{
        "GameAPI.d.ts":"/dts/GameAPI.d.ts",
        "GameMoreAPI.d.ts":"/dts/GameMoreAPI.d.ts"
    },"client":{
        "ClientAPI.d.ts":"/dts/ClientAPI.d.ts"
    }
} */
async function loadDtsDat() {
    let resp = await fetch(DTS_PREFIX + DTS_INDEX);
    if (resp.ok) {
        dts_dat = await resp.json();
    } else {
        throw new Error("ArenaLess: 检查dts更新失败");
    }
}
function compareIsDiff(text1: string, text2: string) {
    return md5(text1) !== md5(text2);
}
// server
async function checkServerDtsUpdate(workspace_uri: vscode.Uri) {
    let server_dts_dat = dts_dat.server;
    let updated=false;
    for (let dts_name in server_dts_dat) {
        // let dts_url = DTS_PREFIX + server_dts_dat[dts_name];
        let dts_url=new URL(server_dts_dat[dts_name],DTS_PREFIX).toString();
        let dts_url_content = await (await fetch(dts_url)).text();
        let dts_cur_content = "<unknown>";
        try {
            dts_cur_content = new TextDecoder().decode(await vscode.workspace.fs.readFile(vscode.Uri.joinPath(workspace_uri, "server", "types", dts_name)));
        } catch (e) { }
        if (compareIsDiff(dts_url_content, dts_cur_content)) {
            updated = true;
            // modify
            await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(workspace_uri, "server", "types", dts_name), new TextEncoder().encode(dts_url_content));
            vscode.window.showInformationMessage("ArenaLess: 已更新server端dts文件 " + dts_name);
        }
    }
    if(!updated){
        vscode.window.showInformationMessage("ArenaLess: server端dts文件已是最新");
    }
}
// client
async function checkClientDtsUpdate(workspace_uri: vscode.Uri) {
    let client_dts_dat = dts_dat.client;
    let updated=false;
    for (let dts_name in client_dts_dat) {
        // let dts_url = DTS_PREFIX + client_dts_dat[dts_name];
        let dts_url=new URL(client_dts_dat[dts_name],DTS_PREFIX).toString();
        let dts_url_content = await (await fetch(dts_url)).text();
        let dts_cur_content = "<unknown>";
        try {
            dts_cur_content = new TextDecoder().decode(await vscode.workspace.fs.readFile(vscode.Uri.joinPath(workspace_uri, "client", "types", dts_name)));
        } catch (e) { }
        if (compareIsDiff(dts_url_content, dts_cur_content)) {
            updated = true;
            // modify
            await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(workspace_uri, "client", "types", dts_name), new TextEncoder().encode(dts_url_content));
            vscode.window.showInformationMessage("ArenaLess: 已更新client端dts文件 " + dts_name);
        }
    }
    if(!updated){
        vscode.window.showInformationMessage("ArenaLess: client端dts文件已是最新");
    }
}

export async function updateAllDts() {
    let folder = await chooseWorkspace();
    if (!folder) { return; }
    await loadDtsDat();
    await checkServerDtsUpdate(folder.uri);
    await checkClientDtsUpdate(folder.uri);
}