document.addEventListener('DOMContentLoaded', () => {
    const formCadastro = document.querySelector('.form-cadastro');
    const inputCpf = document.getElementById('cpf');
    const inputTelefone = document.getElementById('telefone');
    const inputNome = document.getElementById('nome');

    // ==========================================
    // 1. BLOQUEIO DE NÚMEROS NO NOME
    // ==========================================
    if (inputNome) {
        inputNome.addEventListener('input', function(e) {
            // A expressão /\d/g busca qualquer número (0-9) e substitui por vazio ""
            e.target.value = e.target.value.replace(/\d/g, "");
        });
    }

    // ==========================================
    // 2. MÁSCARA DO TELEFONE (Auto-formatação)
    // ==========================================
    if (inputTelefone) {
        inputTelefone.setAttribute('maxlength', '15'); // Trava no tamanho máximo de (00) 00000-0000
        
        inputTelefone.addEventListener('input', function(e) {
            let v = e.target.value.replace(/\D/g, ""); // Remove tudo o que não for número
            
            // Adiciona os parênteses e o espaço: (00) 0...
            v = v.replace(/^(\d{2})(\d)/g, "($1) $2");
            // Adiciona o traço nos últimos 4 dígitos: ...0000-0000
            v = v.replace(/(\d)(\d{4})$/, "$1-$2");
            
            e.target.value = v; // Devolve formatado para o input
        });
    }

    // ==========================================
    // 3. MÁSCARA DO CPF (Auto-formatação)
    // ==========================================
    if (inputCpf) {
        inputCpf.setAttribute('maxlength', '14'); 
        
        inputCpf.addEventListener('input', function(e) {
            let v = e.target.value.replace(/\D/g, ""); 
            
            v = v.replace(/(\d{3})(\d)/, "$1.$2");
            v = v.replace(/(\d{3})(\d)/, "$1.$2");
            v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
            
            e.target.value = v; 
        });
    }

    // ==========================================
    // 4. FUNÇÃO DE VALIDAÇÃO MATEMÁTICA DO CPF
    // ==========================================
    function validarCPF(cpf) {
        cpf = cpf.replace(/\D/g, ''); 

        if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false; 

        let soma = 0, resto;
        
        for (let i = 1; i <= 9; i++) soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
        resto = (soma * 10) % 11;
        if ((resto === 10) || (resto === 11)) resto = 0;
        if (resto !== parseInt(cpf.substring(9, 10))) return false;

        soma = 0;
        for (let i = 1; i <= 10; i++) soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
        resto = (soma * 10) % 11;
        if ((resto === 10) || (resto === 11)) resto = 0;
        if (resto !== parseInt(cpf.substring(10, 11))) return false;

        return true; 
    }

    // ==========================================
    // 5. ENVIO DO FORMULÁRIO
    // ==========================================
    if (formCadastro) {
        formCadastro.addEventListener('submit', async function(event) {
            event.preventDefault(); 

            // Captura todos os valores digitados
            const nome = document.getElementById('nome').value.trim();
            const telefone = document.getElementById('telefone').value.trim();
            const cpf = document.getElementById('cpf').value.trim();
            const email = document.getElementById('email').value.trim();
            const senha = document.getElementById('senha').value.trim();
            const confirmarSenha = document.getElementById('confirmar-senha').value.trim();

            // Validação 1: O CPF foi preenchido e é um CPF real?
            if (cpf === '' || !validarCPF(cpf)) {
                const msg = 'Por favor, insira um CPF válido.';
                if (typeof mostrarToast === 'function') mostrarToast(msg);
                else alert(msg);
                return;
            }

            // Validação 2: A senha tem no mínimo 8 caracteres?
            if (senha.length < 8) {
                const msg = 'A senha deve ter no mínimo 8 caracteres.';
                if (typeof mostrarToast === 'function') mostrarToast(msg);
                else alert(msg);
                return;
            }

            // Validação 3: As senhas coincidem?
            if (senha !== confirmarSenha) {
                const msg = 'As senhas não coincidem. Tente novamente.';
                if (typeof mostrarToast === 'function') mostrarToast(msg);
                else alert(msg);
                return;
            }

            // Envio dos dados para a API Node.js (MySQL)
            const API_BASE = (window.location.protocol === 'http:' && window.location.port === '3000') ? '' : 'http://localhost:3000';
            try {
                const resposta = await fetch(`${API_BASE}/api/cadastro`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        nome: nome,
                        email: email,
                        senha: senha,
                        cpf: cpf,
                        telefone: telefone !== '' ? telefone : null 
                    })
                });

                const dados = await resposta.json();

                if (resposta.ok) {
                    localStorage.setItem('usuarioLogado', 'true');
                    localStorage.setItem('emailUsuario', email);
                    localStorage.setItem('nomeUsuario', nome);

                    if (typeof mostrarToast === 'function') {
                        mostrarToast(`Bem-vindo(a) à família, ${nome.split(' ')[0]}! Criando sua conta...`);
                        setTimeout(() => { window.location.href = 'padaria-landinpage.html'; }, 2000);
                    } else {
                        alert('Cadastro realizado com sucesso!');
                        window.location.href = 'padaria-landinpage.html';
                    }
                } else {
                    alert(dados.erro || 'Erro ao realizar o cadastro.');
                }
            } catch (erro) {
                console.error("Erro ao conectar com o servidor:", erro);
                alert("Não foi possível conectar ao servidor. Certifique-se de que o back-end está rodando.");
            }
        });
    }
});
