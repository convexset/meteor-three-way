import os

cwd = os.getcwd()

def relRecursiveList(path):
    ret = []
    for root, subFolders, files in os.walk(path):
        for fn in files:
            ret.append(os.path.join(root[len(cwd)+1:], fn))
    return ret

for f in relRecursiveList(os.getcwd()):
    print f