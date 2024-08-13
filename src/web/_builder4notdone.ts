// import {Compiler} from '@rainetian/esbuild-wasm-compiler'
// import * as JSON5 from "json5";

// const compiler = new Compiler({
//     getFileContent: path => {
//       const filePath = Object.keys(files).find(item=>item.startsWith(path))
//       const content = filePath ? files[filePath] : null
//       if (!content) {
//         throw new Error("File not found");
//       }
//       return content;
//     }
//   },{})
// export async function build(
//   fileList: Record<string, string>,
//   entry: string,
//   tsconfigRaw: string,
//   logger,
// ) {
//   // read paths
//   let aliases = [], tsconfig;
//   if (tsconfigRaw) {
//     tsconfig = JSON5.parse(tsconfigRaw).compilerOptions;
//     if (tsconfig.paths) {
//       for (let key in tsconfig.paths) {
//         if(!tsconfig.paths[key][0].endsWith(".ts")&&!tsconfig.paths[key][0].endsWith(".js")){
//             if(fileList[`${tsconfig.paths[key][0]}.ts`]){
//                 tsconfig.paths[key][0] = `${tsconfig.paths[key][0]}.ts`
//             }else if(fileList[`${tsconfig.paths[key][0]}.js`]){
//                 tsconfig.paths[key][0] = `${tsconfig.paths[key][0]}.js`
//             }
//         }
//         aliases.push({
//           find: key,
//           replacement: tsconfig.paths[key][0],
//         });
//       }
//     }
//   }
//   let newfileList = {};
//   // load tsconfig compilerOptions to interface CompilerOptions
//   for(let key in fileList){
//     if(key.startsWith("dist/"))continue;
//     newfileList[key] = ts.transpile(fileList[key],{target:ts.ScriptTarget.ESNext,paths:tsconfig?.paths})
//   }
//   //logger.info(`fileList:${JSON.stringify(newfileList)}`);
//   const rolled = await rollup({
//     input: [entry],
//     plugins: [
//       virtual({
//         ...newfileList,
//       }) as any,
//       alias({
//         entries: aliases,
//       }) as any,
//       {
//         name:"a",
//         resolveId(source, importer, options) {
//             logger.info(`resolveId:${source}`);
//             return source;
//         },
//       }
//     ],
//   });
//   // ts
//   const out = await rolled.generate({ format: "cjs" });
//   return out.output[0].code;
// }

// build(
//   a,
//   "src/App.ts",
//   a["tsconfig.json"],
//   console,
// ).then((code) => console.log(code));
