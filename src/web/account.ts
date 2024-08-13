/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from "vscode";
export class Dao3Account {
  token: string;
  userAgent: string;
  logger: vscode.LogOutputChannel;
  constructor(token, userAgent,logger) {
    this.token = token;
    this.userAgent = userAgent;
    this.logger = logger;
  }
  GETHeaders() {
    return {
      "Cookie": "authorization=" + this.token,
      "User-Agent": this.userAgent,
      "x-dao-ua": this.userAgent,
      "Referrer": "https://dao3.fun/",
      "Origin": "https://dao3.fun",
      "timestamp": Date.now().toString(),
      "Accept": "application/json, text/plain, */*",
      "Content-Type": "application/json;charset=UTF-8",
    };
  }
  POSTHeaders() {
    return {
      "Authorization": this.token,
      "Cookie":
        `HttpOnly; authorization=${this.token}; box-auth2=${this.token}`,
      "User-Agent": this.userAgent,
      "x-dao-ua": this.userAgent,
      "Referrer": "https://dao3.fun/",
      "Origin": "https://dao3.fun",
      "timestamp": Date.now().toString(),
      "Accept": "application/json, text/plain, */*",
      "Content-Type": "application/json;charset=UTF-8",
      // ""
    };
  }
  auth() {
    return {
      "token": this.token,
      "userAgent": this.userAgent,
    };
  }
  async getUserData() {
    let resp = await fetch(
      "https://dao3gateway.arenaless-server.trc.tobylai.fun/api/userData",
      {
        method: "POST",
        body: JSON.stringify({
          ...this.auth(),
        }),
      },
    );
    let data = await resp.json();
    if (data.data.userId) {
      return data.data;
    } else {
      return false;
    }
  }
  async getExtMaps() {
    let resp = await fetch(
      "https://dao3gateway.arenaless-server.trc.tobylai.fun/api/maps/extMaps",
      {
        method: "POST",
        body: JSON.stringify({
            ...this.auth()
        }),
      },
    );
    let data = await resp.json();
    // console.log(data)
    if (data.data.rows) {
      return data.data.rows;
    } else {
      return false;
    }
  }
  async uploadBuild(mapId:string,server_bundle:string,client_bundle:string){
    // /api/maps/uploadBuild
    let resp = await fetch(
      "https://dao3gateway.arenaless-server.trc.tobylai.fun/api/maps/uploadBuild",
      {
        method: "POST",
        body: JSON.stringify({
          ...this.auth(),
          mapId:mapId,
          server_bundle:server_bundle,
          client_bundle:client_bundle
        }),
      }
    );
    let data = await resp.json();
    this.logger.info(data);
    return data.code===200;
  }
}