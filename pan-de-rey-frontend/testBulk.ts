import { CatalogImportService } from './src/services/catalogImportService.ts';

async function test() {
    try {
        const service = new CatalogImportService();
        const report = await service.processImport([
            {
                name: 'Test Product',
                price: 100,
                stock: 10,
                rawCategory: 'Test Cat'
            }
        ]);
        console.log('Success:', report);
    } catch (err: any) {
        console.error('Error:', err.message);
    }
}

test();
