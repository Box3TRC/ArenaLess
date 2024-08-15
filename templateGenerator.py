import gzip
import os
import fnmatch
import json

folder="../arenaless-templates/base"
output="../arenaless-templates/base.json.gzip"
tplFiles={}
ignoreGlobs=[
    "node_modules/*",
    "package-lock.json",
    "*/.log/*"
]
# get files, walk through folder and get files
for root, dirs, files in os.walk(folder):
    for file in files:
        file=os.path.relpath(os.path.join(root,file), folder).replace("\\","/")
        if any(fnmatch.fnmatch(file, glob) for glob in ignoreGlobs):
            # print("Ignored file: "+file)
            continue
        print("Added file: "+file)
        tplFiles[file]=open(os.path.join(folder,file), 'r',encoding="utf-8").read()
# print(tplFiles)
gzipped=gzip.compress(json.dumps(tplFiles).encode("utf-8"))
with open(output, 'wb')as fp:
    fp.write(gzipped)