require('dotenv').config();
const { verificarEstadoLocal } = require('./src/main/services/licenciaService');

async function main() {
    const estado = await verificarEstadoLocal();
    console.log("Returned:", estado);
}

main().catch(console.error);
