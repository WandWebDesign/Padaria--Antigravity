-- 1. Seleciona o banco da padaria
USE padaria;

-- 2. Verifica a contagem de produtos (O valor esperado deve ser 169!)
SELECT COUNT(*) AS total_produtos FROM produtos;

-- 3. Verifica se as 7 tabelas principais foram criadas
SHOW FULL TABLES WHERE Table_type = 'BASE TABLE';

-- 4. Verifica se as 4 Views do Power BI estão prontas
SHOW FULL TABLES WHERE Table_type = 'VIEW';
