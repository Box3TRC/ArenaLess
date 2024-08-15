// // import terser from '@rollup/plugin-terser';
// import { bundle } from "uniroll";
// import * as JSON5 from "json5";
// import * as esbuild from "esbuild-wasm";
// import { alias } from "./rollup-plugin-alias";
// // import importAlias from "rollup-plugin-import-alias";

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

// // import * as UglyfyJS from "./uglifyjs";
// // import minify from 'rollup-plugin-babel-minify';
// function minify(opt?) {
//   return {
//     name: "minify",
//     async renderChunk(code, chunk) {
//       return (await esbuild.transform(code, { minify: true, loader: "js" }))
//         .code;
//       // return UglyfyJS.minify(code).code;
//     },
//   };
// }

// export async function build(
//   fileList: any,
//   entry: string,
//   tsconfigraw: string,
//   logger?,
// ) {
//   let tsconfig = undefined;
//   let paths = [],paths2={};
//   if (tsconfigraw) {
//     tsconfig = JSON5.parse(tsconfigraw).compilerOptions;
//     tsconfig.baseUrl = tsconfig.rootDir = "/";
//     // make paths starts with / and delete ./
//     for (let path in tsconfig.paths) {
//       let pathcontent = (tsconfig.paths[path][0] as string).replace("./", "");
//       if (!pathcontent.startsWith("/")) {
//         pathcontent = "/" + pathcontent;
//       }
//       tsconfig.paths[path] = [pathcontent];
//       paths.push({ find: path, replacement: pathcontent });
//       paths2[path] = pathcontent;
//     }
//   }
//   logger?.info("paths", paths);
//   const bundled = await bundle({
//     files: fileList,
//     input: entry,
//     compilerOptions: tsconfig,
//     extraPlugins: [
//       alias({
//         entries: paths,
//       }),
//     ],
//   });
//   const out = await bundled.generate({
//     format: "cjs",
//     plugins: [
//       minify({}),
//       alias({
//         entries: paths,
//       }),
//     ],strict:true,freeze:true
//   });
//   logger?.info("out", out);
//   return out.output[0].code;
// }
