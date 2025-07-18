import * as vscode from "vscode";
import { build } from "arenaless-bundler";
import * as path from "path-browserify";
import { logger } from "./logger";
import { isFileExists } from "./utils";

const BLOCKED_STARTSWITHS = [
    ".git/",
    "server/dist/",
    "client/dist/",
    "server/.log/",
    "client/.log/",
    "node_modules/",
    // "dist/",
    // ".log/",
];
function isblockedfile(name: string) {
    return BLOCKED_STARTSWITHS.some((startswith) => {
        return name.startsWith(startswith);
    });
}
export async function walk(folder: vscode.Uri): Promise<string[]> {
    const list: string[] = [];
    for (const [name, type] of await vscode.workspace.fs.readDirectory(folder)) {
        const filePath = path.join(folder.path, name).replace(/\\/g, "/");
        if (type === vscode.FileType.File) {
            list.push(filePath);
        } else if (type === vscode.FileType.Directory) {
            // if (name.startsWith('.')) {
            //   continue;
            // }
            const subList = await walk(vscode.Uri.joinPath(folder, name));
            list.push(...subList);
        }
    }
    return list;
}

async function walkDirectory(
    folder: vscode.Uri,
): Promise<Record<string, Uint8Array>> {
    let list = await walk(folder);
    let res:Record<string,any> = {};
    for (let name of list) {
        // logger.info(name);
        name = path.relative(folder.path, name).replace(/\\/g, "/").replace(
            "./",
            "",
        );
        // logger.info(name);
        if (isblockedfile(name)) { continue; }
        // logger.info(name);
        res[name] =
            await vscode.workspace.fs.readFile(
                // folder.with({ path: path.join(folder.path, name) }),
                vscode.Uri.joinPath(folder, name.replace(/\\/g, "/")),
            );
    }
    // logger.info("file list:", list,Object.keys(res));
    return res;
}

async function prebuild(workspaceUri: vscode.Uri, dao3Conf: any, files: Record<string, Uint8Array>) {
    const prebuildConf = dao3Conf?.ArenaLess?.prebuild;
    // console.log(JSON)
    if (prebuildConf?.enabled) {
        logger.info("prebuild enabled");
        let prebuildRes: any = {};
        if (prebuildConf?.dumpDirPrefixes) {
            const dumpDirPrefixes: string[] = prebuildConf.dumpDirPrefixes;
            if (!Array.isArray(dumpDirPrefixes)) { logger.error("prebuild.dumpDirPrefixes must be an array"); };
            const dumped: Record<string, Record<string, any>> = {};
            dumpDirPrefixes.forEach((dir) => {
                dumped[dir] = {};
            });
            for (let file in files) {
                let dir = dumpDirPrefixes.find(dir => file.startsWith(dir));
                if (!dir) { continue; }
                let relpath = path.relative(dir, file).replace(/\\/g, "/").replace("./", "");
                dumped[dir][relpath] = new TextDecoder().decode(files[file]);
            }
            prebuildRes["dumpDirPrefixes"] = dumped;
        }
        // is not dist folder exists
        try{
            await vscode.workspace.fs.stat(vscode.Uri.joinPath(workspaceUri,"shares"));
        }catch(e){
            await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(workspaceUri,"shares"));
        }
        await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(workspaceUri,"shares", "_arenaless_prebuild.json"),new TextEncoder().encode(JSON.stringify(prebuildRes)));
        files["shares/_arenaless_prebuild.json"]=new TextEncoder().encode(JSON.stringify(prebuildRes));
    }
}

export async function buildProject(workspaceUri: vscode.Uri) {
    // let res = await walkDirectory(workspaceUri);
    // // logger.info(JSON.stringify(res))
    // let dao3Conf = JSON.parse(res["dao3.config.json"]);
    // let importMap = res["importMap.arenaless.jsonc"];
    // use builtin fs directly
    let dao3Conf = JSON.parse(new TextDecoder().decode(await vscode.workspace.fs.readFile(vscode.Uri.joinPath(workspaceUri, "dao3.config.json"))));
    dao3Conf.ArenaPro.file.typescript.server.base=dao3Conf.ArenaPro.file.typescript.server.base||"./server";
    dao3Conf.ArenaPro.file.typescript.client.base=dao3Conf.ArenaPro.file.typescript.client.base||"./client";
    let importMap = `{"imports":{}}`;
    try {
        if(await isFileExists(vscode.Uri.joinPath(workspaceUri, "importMap.arenaless.json"))){
            importMap = new TextDecoder().decode(await vscode.workspace.fs.readFile(vscode.Uri.joinPath(workspaceUri, "importMap.arenaless.json")));
        }
        else {importMap = new TextDecoder().decode(await vscode.workspace.fs.readFile(vscode.Uri.joinPath(workspaceUri, "importMap.arenaless.jsonc")));}
    } catch (e) { };
    let outputName = (dao3Conf.ArenaPro.outputAndUpdate || [])[0] || "bundle.js";
    if(typeof outputName==="object"){
        dao3Conf.ArenaPro.file.typescript.server.entry=outputName.serverEntry||dao3Conf.ArenaPro.file.typescript.server.entry;
        dao3Conf.ArenaPro.file.typescript.client.entry=outputName.clientEntry||dao3Conf.ArenaPro.file.typescript.client.entry;
        outputName=outputName.name;
    }
    let overrideDev=false;
    if(dao3Conf.ArenaPro.file.typescript.developmentAll!==undefined&&dao3Conf.ArenaPro.file.typescript.developmentAll!==null){
        overrideDev=true;
    }
    let files = await walkDirectory(workspaceUri);
    await prebuild(workspaceUri, dao3Conf, files);
    // server build
    let serverBuilder = async () => {
        let serverPath = dao3Conf.ArenaPro.file.typescript.server.base.replace("./", "");
        // strip / behind serverPath
        serverPath = serverPath.replace(/\/$/, "");
        let serverEntry = dao3Conf.ArenaPro.file.typescript.server.entry;
        logger.info("serverPath:" + serverPath + " serverEntry:" + serverEntry);
        return await build(
            files,
            path.join(serverPath, serverEntry).replace(/\\/g, "/"),
            new TextDecoder().decode(files[path.join(serverPath, "tsconfig.json").replace(/\\/g, "/")]),
            logger,
            "cjs",
            importMap,
            (overrideDev?dao3Conf.ArenaPro.file.typescript.developmentAll:dao3Conf.ArenaPro.file.typescript.server.development),
            serverPath + "/"
        );
    };
    let clientBuilder = async () => {
        let clientPath = dao3Conf.ArenaPro.file.typescript.client.base.replace("./", "");
        // strip / behind clientPath
        clientPath = clientPath.replace(/\/$/, "");
        let clientEntry = dao3Conf.ArenaPro.file.typescript.client.entry;
        logger.info("clientPath:" + clientPath + " clientEntry:" + clientEntry);
        return await build(
            files,
            path.join(clientPath, clientEntry).replace(/\\/g, "/"),
            new TextDecoder().decode(files[path.join(clientPath, "tsconfig.json").replace(/\\/g, "/")]),
            logger,
            "esm",
            importMap,
            (overrideDev?dao3Conf.ArenaPro.file.typescript.developmentAll:dao3Conf.ArenaPro.file.typescript.client.development),
            clientPath + "/"
        );
    };
    let [serverBundle, clientBundle] = await Promise.all([
        serverBuilder(),
        clientBuilder(),
    ]);
    return {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        server_bundle: serverBundle,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        client_bundle: clientBundle,
        outputName
    };
}