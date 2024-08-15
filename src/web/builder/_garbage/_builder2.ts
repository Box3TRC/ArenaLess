// import { rollup } from "./rollup-browser";
// import virtual from "./plugin-virtual";
// import alias from "./plugin-alias";
// import * as JSON5 from "json5";
// import ts from "rollup-plugin-ts"

// // now i need to write a bundler that works in the browser

// export async function build(
//   fileList: Record<string, string>,
//   entry: string,
//   tsconfigRaw: string,
//   logger?,
// ) {
//   // read paths
//   logger?.info(`fileList:${JSON.stringify(fileList)}`);
//   let aliases = [], tsconfig;
//   if (tsconfigRaw) {
//     tsconfig = JSON5.parse(tsconfigRaw).compilerOptions;
//     if (tsconfig.paths) {
//       for (let key in tsconfig.paths) {
//         aliases.push({
//           find: key,
//           replacement: tsconfig.paths[key][0],
//         });
//       }
//     }
//   }
//   const rolled = await rollup({
//     input: [entry],
//     plugins: [
//       virtual({
//         ...fileList,
//       }) as any,
//       alias({
//         entries: aliases,
//       }) as any,
//       ts({tsconfig})
//     ]
//   });
//   // ts
//   const out = await rolled.generate({ format: "cjs" });
//   return out.output[0].code;
// }
// // build(
// //   {
// //     "index.ts": "import {bar} from 'foo';console.log(bar())",
// //     "foobar.ts": "export function bar(){return 'bar';}",
// //   },
// //   "index.ts",
// //   JSON.stringify({ "compilerOptions": { paths: { "foo": ["foobar.ts"] } } }),
// //   console,
// // ).then((code) => console.log(code));
