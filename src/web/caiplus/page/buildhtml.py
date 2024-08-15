import os

inp="index.html"
out="index.dist.html"
with open(inp,"r",encoding="utf-8")as fp:
    html=fp.read()

html=html.replace("%assets%","assets").replace("%nonce%","17389hnqyoisy287n7nd7832oHnp")

# bundle script src -> <script>{code}</script>
# bundle link -> <style>{code}</style>
import re
# script=re.compile(r"<script src=\"(.*?)\"></script>")
# link=re.compile(r"<link rel=\"stylesheet\" href=\"(.*?)\">")
# match only one ""
script=re.compile(r"<script src=\"(.*?)\" nonce=\"17389hnqyoisy287n7nd7832oHnp\"></script>")
link=re.compile(r"<link rel=\"stylesheet\" href=\"(.*?)\">")
for m in script.finditer(html):
    with open(m.group(1),"r",encoding="utf-8")as fp:
        html=html.replace(m.group(0),"<script>%s</script>"%fp.read())
        print("bundle script:",m.group(1))

for m in link.finditer(html):
    with open(m.group(1),"r",encoding="utf-8")as fp:
        html=html.replace(m.group(0),"<style>%s</style>"%fp.read())
        print("bundle link:",m.group(1))

with open(out,"w",encoding="utf-8") as fp:
    fp.write(html)