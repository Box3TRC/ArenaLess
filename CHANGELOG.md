# Change Log

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
