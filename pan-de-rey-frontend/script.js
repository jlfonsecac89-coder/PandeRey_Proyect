const fs = require('fs');
let content = fs.readFileSync('src/app/api/[[...path]]/route.ts', 'utf8');

const replacementGet = `export async function GET(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
    const requestId = crypto.randomUUID();
    const startTime = Date.now();
    const method = 'GET';
    const endpoint = request.url;
    let statusCode = 200;
    try {`;

const replacementPost = `export async function POST(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
    const requestId = crypto.randomUUID();
    const startTime = Date.now();
    const method = 'POST';
    const endpoint = request.url;
    let statusCode = 200;
    try {`;

content = content.replace(/export async function GET\(request: NextRequest, \{ params \}: \{ params: Promise<\{ path\?: string\[\] \}> \}\) \{/, replacementGet);
content = content.replace(/export async function POST\(request: NextRequest, \{ params \}: \{ params: Promise<\{ path\?: string\[\] \}> \}\) \{/, replacementPost);

const tryEndStr = `} catch (error: any) {
        statusCode = 500;
        logger.error('Unhandled API Exception', { requestId, method, endpoint, statusCode, error });
        return NextResponse.json({ error: 'Internal Server Error', requestId }, { status: 500 });
    } finally {
        const durationMs = Date.now() - startTime;
        logger.info('API Request completed', { requestId, method, endpoint, statusCode, durationMs });
    }`;

content = content.replace(/return NextResponse\.json\(\{ error: 'Endpoint no encontrado' \}, \{ status: 404 \}\);\n    \}/g, `return NextResponse.json({ error: 'Endpoint no encontrado' }, { status: 404 });\n    }\n    ${tryEndStr}\n}`);

fs.writeFileSync('src/app/api/[[...path]]/route.ts', content);
