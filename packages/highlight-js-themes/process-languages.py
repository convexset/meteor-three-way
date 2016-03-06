import os

cwd = os.getcwd()

def relRecursiveList(path):
    for root, subFolders, files in os.walk(path):
        for fn in files:
            filename = os.path.join(root[len(cwd)+1:], fn)
            new_filename = os.path.join(root[len(cwd)+1:], "_" + fn)

            if root[len(cwd)+1:] == "highlight.js-v9.1.0/languages":
                if fn[0] != "_":
                    print new_filename
                    with open(filename, 'r') as f_in:
                        with open(new_filename, 'w') as f_out:
                            f_out.write('hljs.registerLanguage(\"' + fn.split('.').pop(0) + '\",')
                            f_out.write(f_in.read())
                            f_out.write(');')

relRecursiveList(cwd)