/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from "vscode";
import parsejast from "json-to-ast";

// function getLoc(astres:any,path:Array<string>){
//     let curpath=[];
//     for(let i in astres.children){
//         if(astres.children[i].key.value===path[0]){
//             curpath.push(astres.children[i].key);
//             if(path.length>1){
//                 return getLoc(astres.children[i],path.slice(1));
//             }else{
//                 return curpath;
//             }
//         }
//     }
// }// wrong code
function getLoc(astres: any, path: Array<string>) {
    //   console.log(JSON.stringify(astres, null, 4));
    let que = [];
    // find first
    let findRes = (astres: any, name: string) => {
        for (let i in astres.children) {
            if (astres.children[i].key.value === name) {
                return astres.children[i];
            }
        }
        if (astres.value && astres.value.children) {
            for (let i in astres.value.children) {
                if (astres.value.children[i].key.value === name) {
                    return astres.value.children[i];
                }
            }
        }
    };
    que.push({ astres: findRes(astres, path[0]), nextpath: 1 });
    while (que.length > 0) {
        let cur = que.shift();
        if (cur.nextpath === path.length) {
            return cur.astres.loc;
        }
        let next = findRes(cur.astres, path[cur.nextpath]);
        let nextpath = cur.nextpath + 1;
        que.push({ astres: next, nextpath });
    }
}
export class Dao3ConfigCodeLensProvider implements vscode.CodeLensProvider {
    // match json entries
    // this means {"ArenaPro":{"map":...}}
    entries: {
        [key: string]: { title: string; command: string; preprocess?: Function }[];
    } = {
            "ArenaPro.map": [{
                title: "[AL]链接扩展地图",
                command: "arenaless.project.link",
            }, {
                title: "[AL]跳转创作端",
                command: "arenaless.project.openMap",
            }],
            "ArenaPro.outputAndUpdate": [{
                title: "[AL]编译输出文件名",
                command: "arenaless.project.dao3cfg.selectOutputAndUpdate",
                preprocess(data: any, json: any) {
                    data.title = `[AL]编译输出文件名: ${json.ArenaPro.outputAndUpdate[0] || "bundle.js"}`;
                    return data;
                },
            }],
        };
    logger: vscode.LogOutputChannel;
    constructor(logger) {
        this.logger = logger;
    }
    resolveCodeLens(
        codeLens: vscode.CodeLens,
        token: vscode.CancellationToken,
    ): vscode.ProviderResult<vscode.CodeLens> {
        return codeLens;
    }
    provideCodeLenses(
        document: vscode.TextDocument,
        token: vscode.CancellationToken,
    ): vscode.ProviderResult<vscode.CodeLens[]> {
        try {
            let codeLenses: vscode.CodeLens[] = [];
            let text = document.getText();
            let astres = parsejast(text, { loc: true });
            // find entries loc by path
            for (let entry in this.entries) {
                let loc:any;
                try {
                    loc = getLoc(astres, entry.split("."));
                } catch (e) {
                    this.logger.warn(e);
                    continue;
                }
                if (loc) {
                    let range = new vscode.Range(
                        new vscode.Position(loc.start.line - 1, loc.start.column),
                        new vscode.Position(loc.end.line - 1, loc.end.column),
                    );
                    this.entries[entry].forEach((cmd) => {
                        let codeLens = new vscode.CodeLens(range);
                        // this.logger.info(cmd.title);
                        let command = {
                            title: cmd.title,
                            command: cmd.command,
                        };
                        if (cmd.preprocess) {
                            command = cmd.preprocess(command, JSON.parse(text));
                        }
                        codeLens.command = command;
                        codeLenses.push(codeLens);
                    });
                }
            }
            return codeLenses;
        } catch (e) {
            this.logger.error(e);
        }
        return [];
    }
}
