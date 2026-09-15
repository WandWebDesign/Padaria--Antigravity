/* =======================================================
   MENU SUSPENSO INTELIGENTE (Esconde no Scroll Down)
======================================================= */
document.addEventListener('DOMContentLoaded', () => {
    let ultimoScroll = 0;
    const menuCategorias = document.querySelector('.menu-categorias');

    if (menuCategorias) {
        window.addEventListener('scroll', () => {
            // Pega a posição atual do scroll na tela
            let scrollAtual = window.scrollY || document.documentElement.scrollTop;

            // Se o usuário rolou para baixo MAIS DE 100px (para não esconder logo no topo)
            if (scrollAtual > ultimoScroll && scrollAtual > 100) {
                // Rolar para Baixo: Adiciona a classe que sobe/esconde o menu
                menuCategorias.classList.add('esconder-menu');
            } 
            else {
                // Rolar para Cima: Remove a classe e o menu desce de volta suavemente
                menuCategorias.classList.remove('esconder-menu');
            }

            // Atualiza o último scroll (garante que não dê erro ao bater no topo da tela)
            ultimoScroll = scrollAtual <= 0 ? 0 : scrollAtual; 
        });
    }
});
