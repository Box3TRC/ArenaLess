import { rollup } from "./rollup-browser";
import virtual from "./plugin-virtual";
import alias from "./plugin-alias";
import * as JSON5 from "json5";
import ts from "typescript";
import path from "path-browserify";
// import { minify } from "terser";
let minifyTerser;
(async()=>{
  minifyTerser=(await import("terser")).minify;
})();

// now i need to write a bundler that works in the browser


// (async () => {
//   try {
//     esbuild.initialize({});
//   } catch (e) {
//     esbuild.initialize({
//       wasmModule: await WebAssembly.compileStreaming(
//         fetch("https://esm.sh/esbuild-wasm/esbuild.wasm"),
//       ),
//     });
//   }
// })();

async function toTypeScriptAPIReadable(tsconfig: any) {
  let res: ts.CompilerOptions = {};
  for (let key in tsconfig) {
    if (
      !["target", "moduleResolution", "module", "baseUrl", "rootDir"].includes(
        key,
      )
    ) {
      res[key] = tsconfig[key];
    }
  }
  return res;
}

export async function build(
  fileList: Record<string, string>,
  entry: string,
  tsconfigRaw: string,
  logger,
  dao3config?: any,
  format: "es" | "cjs" = "cjs",
  importMap?: string | undefined,
  developmentMode: boolean = false,
) {
  // read paths
  let aliases = [], tsconfig:any={};
  if (tsconfigRaw) {
    try {
      tsconfig = JSON5.parse(tsconfigRaw).compilerOptions||tsconfig;
    } catch (e) {
      throw new Error(`tsconfig读取出错！${e}`);
    }
    if (tsconfig.paths) {
      for (let key in tsconfig.paths) {
        // prob suffix
        if (tsconfig.paths[key][0].startsWith("")) {
          tsconfig.paths[key][0] = tsconfig.paths[key][0].slice(2);
        }
        if (
          !tsconfig.paths[key][0].endsWith(".ts") &&
          !tsconfig.paths[key][0].endsWith(".js")
        ) {
          if (fileList[`${tsconfig.paths[key][0]}.ts`]) {
            tsconfig.paths[key][0] = `${tsconfig.paths[key][0]}.ts`;
          } else if (fileList[`${tsconfig.paths[key][0]}.js`]) {
            tsconfig.paths[key][0] = `${tsconfig.paths[key][0]}.js`;
          }
        }
        aliases.push({
          find: key,
          replacement: tsconfig.paths[key][0],
        });
      }
    }
  }
  if (importMap) {
    let importMapJSON: any;
    try {
      importMapJSON = JSON5.parse(importMap);
      // add to alias
      for(let key in importMapJSON.imports){
        aliases.push({
          find: key,
          replacement: importMapJSON.imports[key],
        });
      }
    } catch (e) {
      throw new Error(`importMap读取出错！${e}`);
    }
  }

  let newfileList = {};
  // load tsconfig compilerOptions to interface CompilerOptions
  let compilerOptions = await toTypeScriptAPIReadable(tsconfig);
  Object.assign(compilerOptions, {
    target: ts.ScriptTarget.ESNext,
    paths: tsconfig.paths,
  });
  for (let key in fileList) {
    if (key.startsWith("dist/") || key.startsWith(".log/")) {continue;}
    if(!key.endsWith(".ts")){
      newfileList[key] = fileList[key];
      continue;
    }
    newfileList[key] = ts.transpile(fileList[key], compilerOptions);
  }
  // logger.info(`fileList:${JSON.stringify(newfileList)}`);
  const rolled = await rollup({
    input: [entry],
    plugins: [
      alias({
        entries: aliases,
      }) as any,
      virtual({
        ...newfileList,
      }) as any,
      {
        name:"specifier-resolver",
        resolveId(source,importer){
          if(source.startsWith(".")){return;}
          if(source.startsWith("\x00virtual:")){return;}
          if(source.startsWith("http://") || source.startsWith("https://")){return;}
          let regex=/^([a-zA-Z0-9_]+):(.+)$/;
          if(!regex.test(source)){return;}
          let res=source.match(regex);
          let specifier=res[1],arg=res[2];
          if(specifier==="npm"){
            return `https://esm.sh/${arg}`;
          }else if(specifier==="jsr"){
            return `https://esm.sh/jsr/${arg}`;
          }
          return;
        }
      },
      {
        name: "url-resolver",
        resolveId(source, importer) {
          if (!dao3config?.ArenaLess?.experimental?.allowUrlImport === false) {
            logger.error(
              "url import is not allowed! fallback to file system. (Please set ArenaLess.experimental.allowUrlImport to true in dao3.config.json)[default true]",
            );
            return;
          }
          if (
            source[0] !== "." &&
            (source.startsWith("/") || source.startsWith("http://") ||
              source.startsWith("https://"))
          ) {
            try {
              new URL(source);
              // If it is a valid URL, return it
              return source;
            } catch {
              // Otherwise make it external
              try {
                new URL(source, importer);
                // If it is a valid URL, return it
                return new URL(source, importer).href;
              } catch {
                // Otherwise make it external
                return;
              }
            }
          }
        },
        async load(id) {
          const response = await fetch(id);
          return response.text();
        },
      },
      {
        name: "virtual-resolver",
        resolveId(source, importer, options) {
          // logger.info(`resolveId:${source} ${importer} ${JSON.stringify(options)}`);
          if (source.startsWith(".")) {
            source = path.join(path.dirname(importer), source).trim().replace(
              "\x00virtual:",
              "",
            );
          }
          // file prob
          if (source.split(".").length===1) {
            if (newfileList[`${source}.ts`]) {
              source = `${source}.ts`;
              console.log("added ts");
            } else if (newfileList[`${source}.js`]) {
              source = `${source}.js`;
            }
          }
          // logger.info(`resolveId solved:${source}`);
          return "\x00virtual:" + source;
        },
      },
      {
        name: "json-loader",
        transform(code, id) {
            if(id.endsWith(".json")){
              return {code: `export default ${JSON.stringify(JSON.parse(code))}`};
            }else{
              return null;
            }
        },
      },
      // {
      //   name: "esbuild-minify",
      //   async renderChunk(code, chunk) {
      //     return (await esbuild.transform(code, { minify: true, loader: "js" }))
      //       .code;
      //   },
      // },
      {
        name:"terser-minify",
        async renderChunk(code,chunk){
          if(developmentMode){return;}
          return (await minifyTerser(code, {})).code;
        }
      }
      // terser({})
    ],
  });
  // ts
  const out = await rolled.generate({ format: format });
  return out.output[0].code;
}
// build(
//   a,
//   "src/App.ts",
//   a["tsconfig.json"],
//   console,
// ).then((code) => console.log(code));
