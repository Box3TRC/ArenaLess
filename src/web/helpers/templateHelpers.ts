import * as vscode from "vscode";
import { ungzip } from "pako";
import { logger } from "../logger";

const TEMPLATE_CONFIG: Record<string, string[]> = {
    base: ["base.json.gzip"],
};

export async function copyTemplate(
    context: vscode.ExtensionContext,
    workspaceUri: vscode.Uri,
    template: string,
) {
    for (let dir of TEMPLATE_CONFIG[template]) {
        let tplPathUri = context.extensionUri;
        tplPathUri = tplPathUri.with({
            path: tplPathUri.path + `/src/web/project-templates/${dir}`,
        });
        let data = ungzip(await vscode.workspace.fs.readFile(tplPathUri));
        await copyTemplateData(data, workspaceUri);
    }
}

export async function copyTemplateData(data: any, workspaceUri: vscode.Uri) {
    let files = JSON.parse(new TextDecoder().decode(data));
    for (let filepath in files) {
        let filepathUri = workspaceUri.with({
            path: workspaceUri.path + "/" + filepath,
        });
        await vscode.workspace.fs.writeFile(
            filepathUri,
            new TextEncoder().encode(files[filepath]),
        );
        logger?.info("copy " + filepath + " to " + filepathUri.path);
    }
}