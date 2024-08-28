import * as vscode from 'vscode';
import { Dao3Account } from './account';

export class Box3ExtMapTreeProvider implements vscode.TreeDataProvider<Box3Map> {
    accountFunc: Function;
    account: Dao3Account | null;
    private _onDidChangeTreeData: vscode.EventEmitter<Box3Map | undefined | null | void> = new vscode.EventEmitter<Box3Map | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<Box3Map | undefined | null | void> = this._onDidChangeTreeData.event;
    constructor(accountFunc: Function) {
        this.accountFunc = accountFunc;
    }
    getTreeItem(element: Box3Map): Box3Map | Thenable<Box3Map> {
        return element;
    }
    async getChildren(element?: Box3Map): Promise<Box3Map[]> {
        this.account = this.accountFunc();
        if (!this.account) { return []; }
        if (!element) {
            return await this.loadExtMaps();
        } else {
            return element.children;
        }
    }
    async loadExtMaps() {
        let extmaps: any[] = await this.account.getExtMaps();
        let box3maps = [];
        for (let m of extmaps) {
            let name = m.name;
            let mapId = m.id.toString();
            let editHash = m.editHash;
            let desc = m.describe;
            let subMaps = m.subMaps;
            if (subMaps.length > 1) {
                let children = [];
                for (let s of subMaps) {
                    children.push(new Box3Map(s.name, s.id.toString(), s.describe, s.editHash, [], vscode.TreeItemCollapsibleState.None));
                };
                box3maps.push(new Box3Map(name, mapId, desc, editHash, children, vscode.TreeItemCollapsibleState.Collapsed));
            } else {
                box3maps.push(new Box3Map(name, mapId, desc, editHash, [], vscode.TreeItemCollapsibleState.None));
            }
        }
        return box3maps;
    }
    refresh() {
        this._onDidChangeTreeData.fire();
    }
}

class Box3Map extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly mapId: string,
        public readonly mapDesc: string,
        public readonly editHash: string,
        public readonly children: Box3Map[] = [],
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
        this.tooltip = `${this.mapDesc}`;
        this.description = this.mapId;
        if (this.children.length===0) {
            this.command = {
                command: "submaptree.openMapInBrowser",
                title: "打开创作端",
                arguments: [this.editHash]
            };
        }
    }
    contextValue: string="submaptree-map";
}