const mysql = require('mysql2/promise');

(async() => {
    try {
        const conn = await mysql.createConnection({ host: 'localhost', user: 'root', password: 'BKD123!WVPwvp', database: 'padaria', port: 3306 });
        
        console.log('Atualizando produtos de mercado para mercearia...');
        const [updateRes] = await conn.query('UPDATE produtos SET codigo_setor = 4 WHERE codigo_setor = 5');
        console.log('Linhas atualizadas:', updateRes.affectedRows);
        
        console.log('Deletando setor mercado (5)...');
        try {
            await conn.query('DELETE FROM setor WHERE codigo_setor = 5');
            console.log('Setor mercado deletado.');
        } catch(e) {
            console.log('Nao foi possivel deletar setor mercado:', e.message);
        }

        console.log('Limpando duplicatas de produtos (mesmo nome)...');
        const [delRes] = await conn.query(`
            DELETE p1 FROM produtos p1
            INNER JOIN produtos p2 
            WHERE p1.codigo_produto > p2.codigo_produto 
            AND p1.nome = p2.nome
        `);
        console.log('Duplicatas removidas:', delRes.affectedRows);
        
        const [prods] = await conn.query('SELECT p.codigo_produto, p.nome, s.nome as nome_setor, p.categoria FROM produtos p JOIN setor s ON p.codigo_setor = s.codigo_setor WHERE p.nome LIKE "%Biscoito%" OR p.nome LIKE "%Detergente%"');
        console.log('PRODUTOS (Biscoito/Detergente):', prods);
        
        await conn.end();
    } catch(e){
        console.error('DB ERROR:', e.message);
    }
})();
