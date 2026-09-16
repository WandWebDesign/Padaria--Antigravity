const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, 'uploads');

(async () => {
    let conn;
    try {
        console.log("Conectando ao banco de dados...");
        conn = await mysql.createConnection({ 
            host: 'localhost', 
            user: 'root', 
            password: 'BKD123!WVPwvp', 
            database: 'padaria', 
            port: 3306 
        });

        // Garante que a pasta uploads existe
        if (!fs.existsSync(UPLOADS_DIR)) {
            fs.mkdirSync(UPLOADS_DIR, { recursive: true });
            console.log("Pasta uploads criada.");
        }

        console.log("Buscando imagens em Base64...");
        // Como o tipo atual é LONGTEXT e se chama imagem_base64
        const [rows] = await conn.query('SELECT codigo_produto, imagem_base64 FROM imagens_produtos WHERE imagem_base64 IS NOT NULL');
        
        console.log(`Encontradas ${rows.length} imagens para migrar.`);
        
        const migrados = [];

        for (const row of rows) {
            if (!row.imagem_base64.startsWith('data:image')) {
                // Já pode ser uma URL ou caminho vazio
                continue;
            }

            // Ex: "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
            const matches = row.imagem_base64.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
            
            if (matches && matches.length === 3) {
                let ext = matches[1];
                if (ext === 'jpeg') ext = 'jpg';
                const buffer = Buffer.from(matches[2], 'base64');
                const filename = `produto_${row.codigo_produto}_${Date.now()}.${ext}`;
                const filepath = path.join(UPLOADS_DIR, filename);
                
                fs.writeFileSync(filepath, buffer);
                migrados.push({ 
                    codigo: row.codigo_produto, 
                    url: `/uploads/${filename}` 
                });
                console.log(`Salva: ${filename}`);
            }
        }

        console.log("Alterando a coluna imagem_base64 para imagem_url (VARCHAR 255)...");
        // Precisamos apagar e recriar ou usar CHANGE. O MySQL aceita CHANGE para renomear e mudar tipo
        // Para não dar erro de truncamento se a coluna tiver muito dado, vamos dar um UPDATE pra null antes
        await conn.query("UPDATE imagens_produtos SET imagem_base64 = ''");
        await conn.query('ALTER TABLE imagens_produtos CHANGE imagem_base64 imagem_url VARCHAR(255)');

        console.log("Atualizando as URLs no banco...");
        for (const mig of migrados) {
            await conn.query('UPDATE imagens_produtos SET imagem_url = ? WHERE codigo_produto = ?', [mig.url, mig.codigo]);
        }
        
        console.log("Migração concluída com sucesso!");

    } catch (e) {
        console.error("Erro na migração:", e);
    } finally {
        if (conn) await conn.end();
    }
})();

