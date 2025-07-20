# Change Log

## 0.2.2
- 兼容了 `developmentAll` 属性
- 更换了新的 json schema
- 重构了项目结构，如果你遇到bug了跟我说。
- 清理了大量屎山代码
- 现在`arenaless.importmap.jsonc`已经弃用，改为`arenaless.importmap.json`，原来的jsonc模式依然兼容但不再维护
- 更新了新建项目模板
- 模板添加了deno.json等的支持，这样再安装`Deno`插件的时候就会出现第三方库的提示
- 更换了 @NaHCO3-code（小苏打） 绘制的新logo

## 0.2.1
- 接入统计（实验性）

## 0.2.0
- 兼容了AP移除`ArenaPro.file.typescript.server/client.base`的修改

## 0.1.9
- 哦对了，漏了AP的一个更新没更，适配了AP`v0.4.1+`的`自定义编译文件`(dao3.config.json)
```
V0.4.1
📦 自定义编译文件：支持开发者自行定义编译后和上传的文件名称，满足多脚本的需要。
```

## 0.1.8
- 新增在线模板，可以迅速搭建Areact,daopy等的脚手架

## 0.1.7
- 重构了部分打包代码来支持跨端共享代码，有少量的性能提升。如果有bug请反馈（arenaless-bundler仓库或qq渠道）
- 支持了跨端共享脚本，详见[ArenaPro文档-跨端共享脚本](https://docs.box3lab.com/arenapro/guide/shares.html)
- 同步了新的ArenaPro脚手架，包含`shares`跨端共享脚本目录和一些dts

## 0.1.6
- 修复importMap的bug

## 0.1.5
- 上传速度恢复正常
- 现在支持`React JSX/TSX`来写UI了（AP兼容）！

## 0.1.4
- gateway被墙了，现在换了个地址-_-。

## 0.1.3
- 构建器现在更好地适配了tsconfig.json

## 0.1.2
- 支持手动同步.d.ts文件了

## 0.1.1
- 模板更新了client的`tsconfig.json`的配置
- 模板增加WebAssembly.d.ts
- 最低vsc支持版本降到1.75.0

## 0.1.0
- 跟进了AP📦 扩展地图列表：新增扩展地图列表树状图，点击一下可以快速进入附图。
- 切换到了新打包工具[ArenaLess-Bundler(开源)](https://github.com/Box3TRC/ArenaLess-Bundler)

## 0.0.15
- 修复了构建器的一些bug
- 跟进ArenaPro导入json文件的功能`import foo from "./bar.json"`

## 0.0.13
- 修复了一些CodeLens的输出
- 修复了没有`outputAndUpdate`字段引发的构建失败

## 0.0.12
- 修复了一些codelens的问题

## 0.0.11
- 优化登录系统，现在缓存了用户数据
- 登陆错误目前有输出
- 优化了 v0.0.10 的功能

## 0.0.10
- 增加了跟`ArenaPro`相似的`dao3.config.json`的`CodeLens`，可以进行`跳转创作端`,`选择编译输出文件名`等操作。
- 添加 `选择编译输出文件名`，适配ArenaPro`v0.4.1`的新功能
- 更新模板，增加了`outputAndUpdate`字段

## 0.0.8+0.0.9
- 修复了与ArenaPro共存时扫描node_modules和dist等文件夹引发的构建极其缓慢
- 更换Esbuild-wasm为Terser来实现压缩js代码
- 目前能把构建+上传时间控制在3s左右

## 0.0.7
- 更新了模板

## 0.0.6
- 现在可以远程储存库到 Github 了 

## 0.0.4 ~ 0.0.5
- 小修复

## 0.0.3
- ??? vscode把src放在.vscode-ignore里了，现在进行了修改，解决了资源文件的bug...

## 0.0.2
- 略微精简包体积

## 0.0.1
- 核心功能
    - `AL` 按钮
    - 创建项目
    - 登录神岛账号
    - 上传
    - 链接地图
    - 构建器
- 模块支持网络导入(`https://`,`npm:`,`jsr:`)
- importMap.arenaless.jsonc
- 菜鸡AIPlus
    - 侧边栏
    - 携带代码提问
