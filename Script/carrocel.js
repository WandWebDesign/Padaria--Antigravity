/* =======================================================
   SISTEMA DE CARROSSEL DINIZ PREMIUM (v2.0)
   Funcionalidades: Responsivo, Snap CSS, Loop Infinito, Autoplay
======================================================= */

// Função para formatar moedas (reutilizável)
function formatarDiniz(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Inicializa todos os carrosséis na página
function inicializarCarrosseis() {
    const todosCarrosseis = document.querySelectorAll('.grid-produtos');

    todosCarrosseis.forEach(carousel => {
        const track = carousel.querySelector('.carrossel-conjunto');
        const antesBtn = carousel.querySelector('.botao-antes');
        const depoisBtn = carousel.querySelector('.botao-depois');
        
        // Proteção caso falte algum elemento no HTML
        if (!track || !antesBtn || !depoisBtn) return;

        // Configurações GOURMET
        let autoPlayInterval;
        const tempoAutoPlay = 4000; // 4 segundos entre as rolagens

        /* =========================================
           Lógica do Loop Infinito/Cíclico
        ========================================= */
        function rolar(direcao) {
            const itens = track.querySelectorAll('.card-produtos');
            if (itens.length === 0) return;

            // Pega a largura do primeiro item para saber exatamente quanto rolar (Responsivo!)
            const itemWidth = itens[0].offsetWidth; 
            const gap = 15; // Gap definido no CSS (precisa ser igual)
            const scrollStep = itemWidth + gap;

            const maxScroll = track.scrollWidth - track.clientWidth;
            const currentScroll = track.scrollLeft;

            if (direcao === 'proximo') {
                // Se chegou ao fim total, volta ao início instantaneamente (para o loop parecer fluido)
                if (currentScroll >= (maxScroll - 5)) { // "-5" para lidar com arredondamentos de pixels
                    track.scrollTo({ left: 0, behavior: 'smooth' });
                } else {
                    // Rola suavemente para o próximo item
                    track.scrollBy({ left: scrollStep, behavior: 'smooth' });
                }
            } else if (direcao === 'anterior') {
                // Se está no início total, vai para o fim instantaneamente
                if (currentScroll <= 5) {
                    track.scrollTo({ left: maxScroll, behavior: 'smooth' });
                } else {
                    // Rola para o item anterior
                    track.scrollBy({ left: -scrollStep, behavior: 'smooth' });
                }
            }
        }

        /* =========================================
           Eventos de Clique
        ========================================= */
        depoisBtn.addEventListener('click', () => {
            rolar('proximo');
            resetAutoPlay(); // Cliente clicou, paramos o autoplay por enquanto
        });

        antesBtn.addEventListener('click', () => {
            rolar('anterior');
            resetAutoPlay(); // Cliente clicou, paramos o autoplay por enquanto
        });

        /* =========================================
           Lógica de Autoplay Inteligente
        ========================================= */
        function startAutoPlay() {
            autoPlayInterval = setInterval(() => {
                rolar('proximo');
            }, tempoAutoPlay);
        }

        function stopAutoPlay() {
            clearInterval(autoPlayInterval);
        }

        function resetAutoPlay() {
            stopAutoPlay();
            startAutoPlay(); // Recomeça a contagem após a interação do cliente
        }

        // --- PAUSA AO PASSAR O RATO (MOUSE) ---
        // Se o cliente quer ler o produto, o carrossel não pode rolar sozinho!
        carousel.addEventListener('mouseenter', stopAutoPlay);
        carousel.addEventListener('mouseleave', startAutoPlay);

        // Inicializa o Autoplay
        startAutoPlay();
    });
}

// Executa assim que o HTML carregar
document.addEventListener('DOMContentLoaded', inicializarCarrosseis);
