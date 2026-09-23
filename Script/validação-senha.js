/* =======================================================
   VALIDAÇÃO E REDEFINIÇÃO REAL DE SENHA VIA API
======================================================= */
document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('.form-esqueceu');

    if (form) {
        form.addEventListener('submit', async (event) => {
            event.preventDefault();

            const email = document.getElementById('email').value.trim();
            const senha = document.getElementById('senha').value;
            const confirmarSenha = document.getElementById('confirmar-senha').value;
            const btnSubmit = form.querySelector('.btn-salvar');
            const msgStatus = document.getElementById('mensagem-status');

            function exibirMensagem(texto, isErro = false) {
                if (msgStatus) {
                    msgStatus.style.display = 'block';
                    msgStatus.style.backgroundColor = isErro ? '#ffe6e6' : '#e6f7ea';
                    msgStatus.style.color = isErro ? '#c0392b' : '#27ae60';
                    msgStatus.style.border = isErro ? '1px solid #e74c3c' : '1px solid #2ecc71';
                    msgStatus.innerText = texto;
                }
                if (typeof mostrarToast === 'function') {
                    mostrarToast(texto);
                } else if (isErro) {
                    alert(texto);
                }
            }

            if (!email) {
                exibirMensagem('Informe o seu e-mail cadastrado.', true);
                return;
            }

            // Validação 1: Tamanho mínimo
            if (senha.length < 8) {
                exibirMensagem('A senha deve ter no mínimo 8 caracteres.', true);
                return;
            }

            // Validação 2: Coincidência de senhas
            if (senha !== confirmarSenha) {
                exibirMensagem('As senhas não coincidem. Verifique novamente.', true);
                return;
            }

            // Estado de carregamento
            const textoOriginal = btnSubmit ? btnSubmit.innerText : 'Salvar Nova Senha';
            if (btnSubmit) {
                btnSubmit.disabled = true;
                btnSubmit.innerText = '⏳ Salvando no banco...';
                btnSubmit.style.cursor = 'not-allowed';
            }

            try {
                const resposta = await fetch('/api/redefinir-senha', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email.toLowerCase(), novaSenha: senha })
                });

                const dados = await resposta.json();

                if (!resposta.ok) {
                    throw new Error(dados.erro || 'Falha ao redefinir a senha.');
                }

                // Limpa qualquer sessão anterior do localStorage para permitir novo login limpo
                localStorage.removeItem('usuarioLogado');
                localStorage.removeItem('emailUsuario');
                localStorage.removeItem('tipoUsuario');

                exibirMensagem('✅ Senha alterada com sucesso! Redirecionando para o login...', false);

                setTimeout(() => {
                    window.location.href = 'padaria-login.html';
                }, 2200);

            } catch (erro) {
                exibirMensagem('❌ ' + erro.message, true);
                if (btnSubmit) {
                    btnSubmit.disabled = false;
                    btnSubmit.innerText = textoOriginal;
                    btnSubmit.style.cursor = 'pointer';
                }
            }
        });
    }
});
