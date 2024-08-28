/* eslint-disable @typescript-eslint/naming-convention */
import { build } from "./builder";

(async () => {
    let res = await build({
        
        "index.ts": `import foo from "./foo.json";
console.log(foo);`,
        "foo.json": `{"foo": {"bar":"bar"}}`
    },"index.ts","{}",console);
    console.log(res);
})();