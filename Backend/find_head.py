import os
import re

versions_dir = "alembic/versions"
revisions = {}
down_revisions = set()

for file in os.listdir(versions_dir):
    if not file.endswith(".py"): continue
    
    with open(os.path.join(versions_dir, file), "r", encoding="utf-8") as f:
        content = f.read()
        
    rev_match = re.search(r"revision\s*=\s*(?:'|\")([^'\"]+)(?:'|\")", content)
    down_rev_match = re.search(r"down_revision\s*=\s*(?:'|\")([^'\"]+)(?:'|\")", content)
    
    if rev_match:
        rev = rev_match.group(1)
        revisions[rev] = file
        
        if down_rev_match:
            down_rev = down_rev_match.group(1)
            down_revisions.add(down_rev)

heads = [rev for rev in revisions if rev not in down_revisions]
print("HEAD_REV:" + (heads[0] if heads else ""))
