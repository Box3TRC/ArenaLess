import { rollup } from "./rollup-browser";
import esbuild from "esbuild-wasm"
import virtual from "./plugin-virtual";
import alias from "./plugin-alias";
import * as JSON5 from "json5";
import ts from "typescript"
import path from "path-browserify"
// import tsconfigload from "tsconfig"
// import ts from "rollup-plugin-ts/dist/esm/index"

// now i need to write a bundler that works in the browser

// const a=

(async () => {
  try {
    esbuild.initialize({});
  } catch (e) {
    esbuild.initialize({
      wasmModule: await WebAssembly.compileStreaming(
        fetch("https://esm.sh/esbuild-wasm/esbuild.wasm"),
      ),
    });
  }
})();

export async function build(
  fileList: Record<string, string>,
  entry: string,
  tsconfigRaw: string,
  logger,
) {
  // read paths
  let aliases = [], tsconfig;
  if (tsconfigRaw) {
    tsconfig = JSON5.parse(tsconfigRaw).compilerOptions;
    if (tsconfig.paths) {
      for (let key in tsconfig.paths) {
        // prob suffix
        if(tsconfig.paths[key][0].startsWith("")){
            tsconfig.paths[key][0] = tsconfig.paths[key][0].slice(2)
        }
        if(!tsconfig.paths[key][0].endsWith(".ts")&&!tsconfig.paths[key][0].endsWith(".js")){
            if(fileList[`${tsconfig.paths[key][0]}.ts`]){
                tsconfig.paths[key][0] = `${tsconfig.paths[key][0]}.ts`
            }else if(fileList[`${tsconfig.paths[key][0]}.js`]){
                tsconfig.paths[key][0] = `${tsconfig.paths[key][0]}.js`
            }
        }
        aliases.push({
          find: key,
          replacement: tsconfig.paths[key][0],
        });
      }
    }
  }
  let newfileList = {};
  // load tsconfig compilerOptions to interface CompilerOptions
  for(let key in fileList){
    if(key.startsWith("dist/"))continue;
    newfileList[key] = ts.transpile(fileList[key],{target:ts.ScriptTarget.ESNext,paths:tsconfig?.paths})
    console.log(key)
}
  // logger.info(`fileList:${JSON.stringify(newfileList)}`);
  const rolled = await rollup({
    input: [entry],
    plugins: [
      virtual({
        ...newfileList,
      }) as any,
      alias({
        entries: aliases,
      }) as any,
      {
        name:"a",
        resolveId(source, importer, options) {
            // logger.info(`resolveId:${source} ${importer} ${JSON.stringify(options)}`);
            if(source.startsWith(".")){
                source = path.join(path.dirname(importer),source).trim().replace("\x00virtual:","");
            }
            // file prob
            if(!source.endsWith(".ts")&&!source.endsWith(".js")){
                if(newfileList[`${source}.ts`]){
                    source = `${source}.ts`
                    console.log("added ts")
                }else if(newfileList[`${source}.js`]){
                    source = `${source}.js`
                }
            }
            // logger.info(`resolveId solved:${source}`);
            return "\x00virtual:"+source;
        },
      },{
        name:"esbuild-minify",
        async renderChunk(code,chunk){
          return (await esbuild.transform(code, { minify: true, loader: "js" })).code;
        }
      }
    ],
  });
  // ts
  const out = await rolled.generate({ format: "cjs" });
  return out.output[0].code;
}
// build(
//   a,
//   "src/App.ts",
//   a["tsconfig.json"],
//   console,
// ).then((code) => console.log(code));
