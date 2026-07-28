import fs from 'fs';

const file = 'src/app/api/[[...path]]/route.ts';
let content = fs.readFileSync(file, 'utf8');

// We will add imports for the services if not present
if (!content.includes('ProductService')) {
    content = content.replace(
        "import { CatalogImportService } from '@/services/catalogImportService';",
        "import { CatalogImportService } from '@/services/catalogImportService';\nimport { ProductService } from '@/services/ProductService';\nimport { CategoryService } from '@/services/CategoryService';\nimport { InventoryService } from '@/services/InventoryService';\nimport { CatalogService } from '@/services/CatalogService';\nimport { AttributeService } from '@/services/AttributeService';"
    );
}

// Write it back
fs.writeFileSync(file, content);
console.log('Imports added');
