const fs = require('fs');
const path = require('path');

const directories = [
    "c:\\creativals-os\\frontend\\src\\app\\(dashboard)\\users",
    "c:\\creativals-os\\frontend\\src\\app\\(dashboard)\\projects",
    "c:\\creativals-os\\frontend\\src\\app\\(dashboard)\\tasks",
    "c:\\creativals-os\\frontend\\src\\app\\(dashboard)\\invoices",
    "c:\\creativals-os\\frontend\\src\\app\\(dashboard)\\payroll",
    "c:\\creativals-os\\frontend\\src\\app\\(dashboard)\\attendance",
    "c:\\creativals-os\\frontend\\src\\app\\(dashboard)\\expenses",
    "c:\\creativals-os\\frontend\\src\\app\\(dashboard)\\timesheets",
    "c:\\creativals-os\\frontend\\src\\app\\(dashboard)\\clients",
    "c:\\creativals-os\\frontend\\src\\app\\(dashboard)\\crm",
    "c:\\creativals-os\\frontend\\src\\app\\(dashboard)\\quotes",
    "c:\\creativals-os\\frontend\\src\\app\\(dashboard)\\settings"
];

function refactorFile(filepath) {
    let content = fs.readFileSync(filepath, 'utf8');
    let changed = false;

    if (!content.includes('useToast') && content.includes('alert(')) {
        content = content.replace(/import \{.*?\} from 'react';/, `$& \nimport { useToast } from '@/hooks/useToast';`);
        changed = true;
    }

    if (!content.includes('useModal') && (content.includes('confirm(') || content.includes('prompt('))) {
        content = content.replace(/import \{.*?\} from 'react';/, `$& \nimport { useModal } from '@/providers/ModalProvider';`);
        changed = true;
    }

    if (!content.includes('EmptyState') && content.includes('<table')) {
        content = content.replace(/import \{.*?\} from 'react';/, `$& \nimport { EmptyState } from '@/components/ui/EmptyState';`);
        changed = true;
    }

    if (!content.includes('SkeletonTable') && content.includes('<table')) {
        content = content.replace(/import \{.*?\} from 'react';/, `$& \nimport { SkeletonTable } from '@/components/ui/Skeleton';`);
        changed = true;
    }

    if (!content.includes('useToast()') && content.includes('alert(')) {
        content = content.replace(/(export default function \w+\(.*?\)\s*\{)/, `$1\n  const { showToast } = useToast();`);
        changed = true;
    }

    if (!content.includes('useModal()') && (content.includes('confirm(') || content.includes('prompt('))) {
        content = content.replace(/(export default function \w+\(.*?\)\s*\{)/, `$1\n  const { confirm, prompt } = useModal();`);
        changed = true;
    }

    if (content.includes('alert(')) {
        content = content.replace(/alert\((.*?)\)/g, "showToast($1, 'info')");
        changed = true;
    }

    if (content.includes('confirm(')) {
        content = content.replace(/(onClick=\{)(.*?)(\s*if\s*\(\s*)confirm\((.*?)\)(\s*\))/g, (match, p1, p2, p3, p4, p5) => {
            let func = p2;
            if (!func.includes('async')) {
                func = func.replace('() =>', 'async () =>').replace('(e) =>', 'async (e) =>');
            }
            return `${p1}${func}${p3}await confirm({ message: ${p4}, variant: 'danger' })${p5}`;
        });
        content = content.replace(/(if\s*\(\s*)confirm\((.*?)\)(\s*\))/g, "$1await confirm({ message: $2, variant: 'danger' })$3");
        changed = true;
    }

    if (content.includes('prompt(')) {
        content = content.replace(/prompt\((.*?)\)/g, "await prompt({ message: $1 })");
        changed = true;
    }

    // Attempt to make functions async if they contain await confirm or await prompt
    content = content.replace(/const\s+(\w+)\s*=\s*\((.*?)\)\s*=>\s*\{([\s\S]*?)\}/g, (match, p1, p2, p3) => {
        if ((p3.includes('await confirm') || p3.includes('await prompt')) && !match.includes('async')) {
            return `const ${p1} = async (${p2}) => {${p3}}`;
        }
        return match;
    });

    if (changed) {
        fs.writeFileSync(filepath, content, 'utf8');
        console.log(`Refactored ${filepath}`);
    }
}

function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filepath = path.join(dir, file);
        if (fs.statSync(filepath).isDirectory()) {
            walk(filepath);
        } else if (filepath.endsWith('.tsx') || filepath.endsWith('.ts')) {
            refactorFile(filepath);
        }
    }
}

for (const dir of directories) {
    walk(dir);
}
