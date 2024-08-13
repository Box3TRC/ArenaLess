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
    return data.code==200;
  }
}
// let account = new Dao3Account(
//   "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ0eXAiOiJBQ0NFU1NfVE9LRU4iLCJpc3MiOiJjb2RlX2F1dGhfc2VydmljZSIsInN1YiI6Ijc0IiwianRpIjoiNTdjMDcyNWYtYzA3NS00NWFlLWE5ZmItM2M1M2MxZWMwN2RkIiwiaWF0IjoxNzIxOTc1MDM1LCJjaWQiOjEsImFodCI6NTEyLCJ1c2giOiIzNjJkN2ZlM2Q4YjI1ODFiZmZhMzU5ZjBlZWRhNzEwNiJ9.qEj5oGHCm2Rbqcwf81jFCH10t-osjN7Ojsdjj821tyA",
//   "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36",
// );
// account.getUserData().then((data) => {
//   console.log(data);
//   account.getExtMaps().then((data) => {
//     console.log(data);
//   });
// });
