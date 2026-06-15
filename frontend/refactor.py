import os
import re

directories = [
    r"c:\creativals-os\frontend\src\app\(dashboard)\users",
    r"c:\creativals-os\frontend\src\app\(dashboard)\projects",
    r"c:\creativals-os\frontend\src\app\(dashboard)\tasks",
    r"c:\creativals-os\frontend\src\app\(dashboard)\invoices",
    r"c:\creativals-os\frontend\src\app\(dashboard)\payroll",
    r"c:\creativals-os\frontend\src\app\(dashboard)\attendance",
    r"c:\creativals-os\frontend\src\app\(dashboard)\expenses",
    r"c:\creativals-os\frontend\src\app\(dashboard)\timesheets",
    r"c:\creativals-os\frontend\src\app\(dashboard)\clients",
    r"c:\creativals-os\frontend\src\app\(dashboard)\crm",
    r"c:\creativals-os\frontend\src\app\(dashboard)\quotes",
    r"c:\creativals-os\frontend\src\app\(dashboard)\settings"
]

def refactor_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    changed = False

    # 1. Add hooks imports if needed
    if 'useToast' not in content and 'alert(' in content:
        content = re.sub(r"import \{.*?\} from 'react';", r"\g<0>\nimport { useToast } from '@/hooks/useToast';", content, count=1)
        if 'useToast' not in content:
            content = content.replace("from 'react';", "from 'react';\nimport { useToast } from '@/hooks/useToast';")
        changed = True

    if 'useModal' not in content and ('confirm(' in content or 'prompt(' in content):
        if "from '@/providers/ModalProvider'" not in content:
            content = content.replace("from 'react';", "from 'react';\nimport { useModal } from '@/providers/ModalProvider';")
        changed = True

    if 'EmptyState' not in content and '<table' in content:
        if "from '@/components/ui/EmptyState'" not in content:
            content = content.replace("from 'react';", "from 'react';\nimport { EmptyState } from '@/components/ui/EmptyState';")
        changed = True

    if 'SkeletonTable' not in content and '<table' in content:
        if "from '@/components/ui/Skeleton'" not in content:
            content = content.replace("from 'react';", "from 'react';\nimport { SkeletonTable } from '@/components/ui/Skeleton';")
        changed = True

    # 2. Inject hooks
    if 'useToast()' not in content and 'alert(' in content:
        content = re.sub(r'(export default function \w+\(.*?\)\s*\{)', r'\1\n  const { showToast } = useToast();', content)
        changed = True

    if 'useModal()' not in content and ('confirm(' in content or 'prompt(' in content):
        content = re.sub(r'(export default function \w+\(.*?\)\s*\{)', r'\1\n  const { confirm, prompt } = useModal();', content)
        changed = True

    # 3. Replace alert()
    if 'alert(' in content:
        content = re.sub(r"alert\((.*?)\)", r"showToast(\1, 'info')", content)
        changed = True

    # 4. Replace confirm() inside onClick handlers or other functions
    # We'll use regex to find confirm('...') and replace it
    # We must also make the enclosing function async if it's an arrow function inside onClick
    def replace_confirm(match):
        pre = match.group(1) # onClick={() => { if(
        msg = match.group(2) # '...' or `...`
        post = match.group(3) # ))
        if 'onClick={' in pre:
            if 'async' not in pre:
                pre = pre.replace('() =>', 'async () =>').replace('(e) =>', 'async (e) =>')
        return f"{pre}await confirm({{ message: {msg}, variant: 'danger' }}){post}"

    if 'confirm(' in content:
        content = re.sub(r"(onClick=\{.*?if\s*\(\s*)confirm\((.*?)\)(\s*\))", replace_confirm, content)
        # Handle general confirm outside of onclick
        content = re.sub(r"(if\s*\(\s*)confirm\((.*?)\)(\s*\))", r"\1await confirm({ message: \2, variant: 'danger' })\3", content)
        changed = True

    # 5. Replace prompt()
    if 'prompt(' in content:
        # e.g. const note = prompt('...');
        content = re.sub(r"prompt\((.*?)\)", r"await prompt({ message: \1 })", content)
        changed = True

    # We need to make sure functions using await confirm/prompt are async
    # e.g. const handleApproveAction = (id: number, action: 'approve' | 'reject') => {
    # becomes async
    def add_async(match):
        decl = match.group(1)
        args = match.group(2)
        body = match.group(3)
        if 'await prompt' in body or 'await confirm' in body:
            if 'async' not in decl:
                return f"const {decl} = async ({args}) => {{{body}"
        return match.group(0)

    # Note: Regex for adding async to function definitions is tricky in Python for multiline
    # I'll just do manual fixing if compiler complains.

    if changed:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Refactored {filepath}")

for root_dir in directories:
    for dirpath, dirnames, filenames in os.walk(root_dir):
        for file in filenames:
            if file.endswith('.tsx') or file.endswith('.ts'):
                refactor_file(os.path.join(dirpath, file))
