import * as vscode from "vscode";
import { build } from "arenaless-bundler";
import * as path from "path-browserify";
import { logger } from "./logger";

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
    let res = {};
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

export async function buildProject(workspaceUri: vscode.Uri) {
    // let res = await walkDirectory(workspaceUri);
    // // logger.info(JSON.stringify(res))
    // let dao3Conf = JSON.parse(res["dao3.config.json"]);
    // let importMap = res["importMap.arenaless.jsonc"];
    // use builtin fs directly
    let dao3Conf = JSON.parse(new TextDecoder().decode(await vscode.workspace.fs.readFile(vscode.Uri.joinPath(workspaceUri, "dao3.config.json"))));
    let importMap = `{"imports":{}}`;
    try {
        importMap = new TextDecoder().decode(await vscode.workspace.fs.readFile(vscode.Uri.joinPath(workspaceUri, "importMap.arenaless.jsonc")));
    } catch (e) { };
    let outputName = (dao3Conf.ArenaPro.outputAndUpdate || [])[0] || "bundle.js";

    let files = await walkDirectory(workspaceUri);

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
            dao3Conf.ArenaPro.file.typescript.server.development,
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
            dao3Conf.ArenaPro.file.typescript.client.development,
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

    // let serverBuilder = async () => {
    //     // server build
    //     let serverPath = dao3Conf.ArenaPro.file.typescript.server.base;
    //     let serverEntry = dao3Conf.ArenaPro.file.typescript.server.entry;
    //     logger.info("serverPath:" + serverPath + " serverEntry:" + serverEntry);
    //     let serverFiles_ = await walkDirectory(
    //         vscode.Uri.joinPath(workspaceUri, serverPath),
    //     );
    //     // add a "/" before them
    //     let serverFiles: Record<string, Uint8Array> = {};
    //     for (let key in serverFiles_) {
    //         serverFiles[key] = serverFiles_[key];
    //     }
    //     // logger.info("serverFiles:" + JSON.stringify(Object.keys(serverFiles)));
    //     return await build(
    //         serverFiles,
    //         serverEntry,
    //         new TextDecoder().decode(serverFiles["tsconfig.json"]),
    //         logger,
    //         // dao3Conf,
    //         "cjs",
    //         importMap,
    //         dao3Conf.ArenaPro.file.typescript.server.development
    //     );
    // };
    // let clientBuilder = async () => {
    //     let clientPath = dao3Conf.ArenaPro.file.typescript.client.base;
    //     let clientEntry = dao3Conf.ArenaPro.file.typescript.client.entry;
    //     logger.info("clientPath:" + clientPath + " clientEntry:" + clientEntry);
    //     let clientFiles_ = await walkDirectory(
    //         vscode.Uri.joinPath(workspaceUri, clientPath),
    //     );
    //     let clientFiles: Record<string, Uint8Array> = {};
    //     for (let key in clientFiles_) {
    //         clientFiles[key] = clientFiles_[key];
    //     }
    //     console.log(Object.keys(clientFiles));
    //     return await build(
    //         clientFiles,
    //         clientEntry,
    //         new TextDecoder().decode(clientFiles["tsconfig.json"]),
    //         logger,
    //         // dao3Conf,
    //         "es",
    //         importMap,
    //         dao3Conf.ArenaPro.file.typescript.client.development
    //     );
    // };
    // let [serverBundle, clientBundle] = await Promise.all([
    //     serverBuilder(),
    //     clientBuilder(),
    // ]);
    // return {
    //     // eslint-disable-next-line @typescript-eslint/naming-convention
    //     server_bundle: serverBundle,
    //     // eslint-disable-next-line @typescript-eslint/naming-convention
    //     client_bundle: clientBundle,
    //     outputName
    // };
}