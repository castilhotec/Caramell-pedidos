
"use strict";

// ======================================================
// CARAMELL PEDIDOS - SISTEMA COMPLETO
// PARTE 1: BASE, LOGIN, PEDIDOS E ARMAZENAMENTO
// ======================================================

let atendenteAtual = "";
let carrinho = [];
let pedidos = [];

const CHAVE_PEDIDOS = "caramell_pedidos";
const CHAVE_MENSAGENS = "caramell_mensagens";

const mensagensPadrao = {
  recebido: "Olá, {cliente}! Boa tarde! 🍿 Seja bem-vindo à Caramell!\n\nRecebemos seu pedido nº {pedido}. Em instantes, um de nossos atendentes dará continuidade ao seu atendimento. ❤️",

  preparo: "Olá, {cliente}! 🍿\n\nSeu pedido nº {pedido} já está sendo preparado com muito carinho!\nAvisaremos assim que estiver prontinho. ❤️",

  pronto: "Olá, {cliente}! 😍\n\nTemos uma ótima notícia! Seu pedido nº {pedido} da Caramell está prontinho!\n\nPode vir retirar. Agradecemos pela preferência! ❤️"
};

let mensagens = { ...mensagensPadrao };

const formatarDinheiro = valor =>
  Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });

function escapar(texto) {
  return String(texto ?? "").replace(/[&<>"']/g, letra => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[letra]);
}

// ======================================================
// LOGIN E SAÍDA
// ======================================================

function entrar() {
  const campo = document.getElementById("atendente");
  const nome = campo.value.trim();

  if (!nome) {
    alert("Digite o nome do atendente.");
    campo.focus();
    return;
  }

  atendenteAtual = nome;

  document.getElementById("nomeAtendente").textContent = nome;
  document.getElementById("login").hidden = true;
  document.getElementById("caixa").hidden = true;
  document.getElementById("sistema").hidden = false;

  atualizarTela();
}

function entrarComoCaixa() {
  document.getElementById("login").hidden = true;
  document.getElementById("sistema").hidden = true;
  document.getElementById("caixa").hidden = false;

  carregarCamposMensagens();
  atualizarCaixa();

  if (!document.getElementById("botaoTesteRawBT")) {
    const botao = document.createElement("button");

    botao.id = "botaoTesteRawBT";
    botao.type = "button";
    botao.textContent = "TESTAR IMPRESSORA";
    botao.onclick = testarImpressaoRawBT;

    document.getElementById("pedidosCaixa").before(botao);
  }
}

function sairCaixa() {
  document.getElementById("caixa").hidden = true;
  document.getElementById("login").hidden = false;
}

function sair() {
  if (
    carrinho.length > 0 &&
    !confirm("Deseja sair e perder o pedido atual?")
  ) {
    return;
  }

  atendenteAtual = "";
  carrinho = [];

  document.getElementById("atendente").value = "";
  document.getElementById("cliente").value = "";
  document.getElementById("telefone").value = "";

  document.getElementById("sistema").hidden = true;
  document.getElementById("login").hidden = false;

  atualizarTela();
}

// ======================================================
// CARRINHO E PRODUTOS
// ======================================================

function adicionar(produto, preco) {
  const sabor = document.getElementById("sabor").value;

  const existente = carrinho.find(item =>
    item.produto === produto && item.sabor === sabor
  );

  if (existente) {
    existente.quantidade++;
  } else {
    carrinho.push({
      produto,
      sabor,
      preco: Number(preco),
      quantidade: 1
    });
  }

  atualizarTela();
}

function alterarQuantidade(indice, variacao) {
  if (!carrinho[indice]) return;

  carrinho[indice].quantidade += variacao;

  if (carrinho[indice].quantidade <= 0) {
    carrinho.splice(indice, 1);
  }

  atualizarTela();
}

function calcularTotal() {
  return carrinho.reduce(
    (total, item) =>
      total + Number(item.preco) * Number(item.quantidade),
    0
  );
}

function atualizarTela() {
  const area = document.getElementById("itens");

  if (!area) return;

  if (carrinho.length === 0) {
    area.innerHTML = "<p>Nenhum produto adicionado.</p>";
  } else {
    area.innerHTML = carrinho.map((item, indice) => `
      <div class="item">
        <div>
          <strong>${escapar(item.produto)}</strong><br>
          ${escapar(item.sabor)}<br>
          ${item.quantidade} x ${formatarDinheiro(item.preco)}
        </div>

        <div>
          <strong>${formatarDinheiro(item.preco * item.quantidade)}</strong><br>
          <button onclick="alterarQuantidade(${indice}, -1)">−</button>
          <button onclick="alterarQuantidade(${indice}, 1)">+</button>
        </div>
      </div>
    `).join("");
  }

  const total = document.getElementById("total");

  if (total) {
    total.textContent = formatarDinheiro(calcularTotal());
  }

  atualizarHistorico();
  atualizarCaixa();
}

// ======================================================
// REGISTRO DE PEDIDOS
// ======================================================

function enviarPedido() {
  if (!atendenteAtual) {
    alert("Faça login antes de registrar um pedido.");
    return;
  }

  if (carrinho.length === 0) {
    alert("Adicione pelo menos um produto.");
    return;
  }

  const cliente =
    document.getElementById("cliente").value.trim();

  const telefone =
    document.getElementById("telefone").value.trim();

  const maiorNumero = pedidos.reduce(
    (maior, pedido) =>
      Math.max(maior, Number(pedido.numero) || 0),
    0
  );

  const agora = new Date();

  const pedido = {
    numero: maiorNumero + 1,
    atendente: atendenteAtual,
    cliente: cliente || "Cliente não informado",
    telefone,

    itens: carrinho.map(item => ({ ...item })),

    total: calcularTotal(),
    data: agora.toLocaleString("pt-BR"),
    criadoEm: agora.toISOString(),

    status: "Pendente",
    statusProducao: "Recebido",

    inicioPreparoEm: null,
    prontoEm: null,
    entregueEm: null,

    pagamento: "",
    recebido: 0,
    troco: 0
  };

  pedidos.push(pedido);

  salvarDados();

  carrinho = [];

  document.getElementById("cliente").value = "";
  document.getElementById("telefone").value = "";

  atualizarTela();

  alert(
    "Pedido nº " + pedido.numero +
    " registrado com sucesso!\nTotal: " +
    formatarDinheiro(pedido.total)
  );
}

// ======================================================
// SALVAR E CARREGAR PEDIDOS
// ======================================================

function salvarDados() {
  try {
    localStorage.setItem(
      CHAVE_PEDIDOS,
      JSON.stringify(pedidos)
    );
  } catch (erro) {
    alert("Não foi possível salvar os pedidos: " + erro.message);
  }
}

function carregarDados() {
  try {
    const dados = JSON.parse(
      localStorage.getItem(CHAVE_PEDIDOS) || "[]"
    );

    pedidos = Array.isArray(dados) ? dados : [];

  } catch (erro) {
    alert("Erro ao carregar os pedidos salvos.");
    pedidos = [];
  }

  pedidos.forEach(pedido => {
    if (!pedido.status) {
      pedido.status = "Pendente";
    }

    if (!pedido.statusProducao) {
      pedido.statusProducao = "Recebido";
    }

    if (!Array.isArray(pedido.itens)) {
      pedido.itens = [];
    }

    if (pedido.telefone === undefined) {
      pedido.telefone = "";
    }

    if (pedido.recebido === undefined) {
      pedido.recebido = 0;
    }

    if (pedido.troco === undefined) {
      pedido.troco = 0;
    }
  });
}




// ======================================================
// CARAMELL PEDIDOS
// PARTE 2: HISTÓRICO, CAIXA E PAGAMENTO
// ======================================================

// ======================================================
// HISTÓRICO DE PEDIDOS
// ======================================================

function atualizarHistorico() {
  const area = document.getElementById("pedidos");

  if (!area) return;

  if (pedidos.length === 0) {
    area.innerHTML = "<p>Nenhum pedido registrado.</p>";
    return;
  }

  area.innerHTML = pedidos.slice().reverse().map(pedido => `
    <div class="pedido">
      <h3>Pedido nº ${escapar(pedido.numero)}</h3>

      <p><strong>Cliente:</strong> ${escapar(pedido.cliente)}</p>
      <p><strong>Data:</strong> ${escapar(pedido.data)}</p>
      <p><strong>Total:</strong> ${formatarDinheiro(pedido.total)}</p>
      <p><strong>Pagamento:</strong> ${escapar(pedido.status)}</p>
      <p><strong>Produção:</strong> ${escapar(pedido.statusProducao)}</p>
    </div>
  `).join("");
}

// ======================================================
// TEMPO DE PREPARO
// ======================================================

function formatarDuracao(inicio) {
  if (!inicio) return "Aguardando início";

  const dataInicio = new Date(inicio).getTime();

  if (!Number.isFinite(dataInicio)) {
    return "Tempo indisponível";
  }

  const segundos = Math.max(
    0,
    Math.floor((Date.now() - dataInicio) / 1000)
  );

  const minutos = Math.floor(segundos / 60);
  const resto = segundos % 60;

  return minutos + " min " + resto + " s";
}

// ======================================================
// ATUALIZAÇÃO DO CAIXA
// ======================================================

function atualizarCaixa() {
  const area = document.getElementById("pedidosCaixa");

  if (!area) return;

  if (pedidos.length === 0) {
    area.innerHTML = "<p>Nenhum pedido registrado.</p>";
    return;
  }

  area.innerHTML = pedidos.slice().reverse().map((pedido, indice) => {
    const numeroReal = pedidos.length - 1 - indice;

    const itens = (pedido.itens || []).map(item => `
      <p>
        ${Number(item.quantidade) || 0}x
        ${escapar(item.produto)}
        — ${escapar(item.sabor)}
      </p>
    `).join("");

    let pagamento = "";

    if (pedido.status === "Pendente") {
      pagamento = `
        <label>Forma de pagamento</label>

        <select id="pagamento-${numeroReal}">
          <option value="Pix">Pix</option>
          <option value="Dinheiro">Dinheiro</option>
          <option value="Débito">Cartão de débito</option>
          <option value="Crédito">Cartão de crédito</option>
        </select>

        <label>Valor recebido</label>

        <input
          id="recebido-${numeroReal}"
          type="number"
          min="0"
          step="0.01"
          placeholder="Ex.: 50,00"
        >

        <button type="button"
          onclick="finalizarPedido(${numeroReal})">
          Confirmar pagamento
        </button>
      `;
    } else {
      pagamento = `
        <p><strong>Forma:</strong> ${escapar(pedido.pagamento)}</p>
        <p><strong>Recebido:</strong> ${formatarDinheiro(pedido.recebido)}</p>
        <p><strong>Troco:</strong> ${formatarDinheiro(pedido.troco)}</p>
        <p><strong>Pagamento confirmado!</strong></p>
      `;
    }

    let producao = "";
    let mensagemRecebido = "";
    let mensagemPreparo = "";
    let mensagemPronto = "";

    if (pedido.status !== "Pago") {
      producao = `
        <p><strong>Produção:</strong> Aguardando pagamento</p>
        <p>O preparo será liberado após a confirmação do pagamento.</p>
      `;

    } else if (pedido.statusProducao === "Recebido") {
      producao = `
        <p><strong>Produção:</strong> Aguardando início do preparo</p>

        <button type="button"
          onclick="iniciarPreparo(${numeroReal})">
          Iniciar preparo
        </button>
      `;

      mensagemRecebido = `
        <button type="button"
          onclick="abrirWhatsApp(${numeroReal}, 'recebido')">
          Enviar mensagem de recebimento
        </button>
      `;

    } else if (pedido.statusProducao === "Em preparo") {
      producao = `
        <p><strong>Produção:</strong> Em preparo</p>

        <p>
          Tempo de preparo:
          <span id="tempo-preparo-${numeroReal}">
            ${formatarDuracao(pedido.inicioPreparoEm)}
          </span>
        </p>

        <button type="button"
          onclick="marcarPronto(${numeroReal})">
          Pedido pronto
        </button>
      `;

      mensagemPreparo = `
        <button type="button"
          onclick="abrirWhatsApp(${numeroReal}, 'preparo')">
          Avisar cliente: pedido em preparo
        </button>
      `;

    } else if (pedido.statusProducao === "Pronto") {
      producao = `
        <p><strong>Produção:</strong> Pedido pronto</p>

        <button type="button"
          onclick="marcarEntregue(${numeroReal})">
          Marcar como entregue
        </button>
      `;

      mensagemPronto = `
        <button type="button"
          onclick="abrirWhatsApp(${numeroReal}, 'pronto')">
          Avisar cliente: pedido pronto
        </button>
      `;

    } else {
      producao = `
        <p><strong>Produção:</strong> Entregue</p>
        <p>Pedido finalizado.</p>
      `;
    }

    return `
      <div class="pedido">

        <h3>Pedido nº ${escapar(pedido.numero)}</h3>

        <p>
          <strong>Cliente:</strong>
          ${escapar(pedido.cliente)}
        </p>

        <label>WhatsApp deste cliente:</label>

        <input
          type="tel"
          id="telefone-pedido-${numeroReal}"
          value="${escapar(pedido.telefone || "")}"
          placeholder="DDD + número"
          inputmode="tel"
          autocomplete="off"
        >

        <button type="button"
          onclick="salvarTelefonePedido(${numeroReal})">
          Salvar telefone do cliente
        </button>

        <p>
          <strong>Atendente:</strong>
          ${escapar(pedido.atendente)}
        </p>

        ${itens}

        <h3>Total: ${formatarDinheiro(pedido.total)}</h3>

        <hr>

        <h3>Acompanhamento da produção</h3>

        ${producao}
        ${mensagemRecebido}
        ${mensagemPreparo}
        ${mensagemPronto}

        <hr>

        <h3>Pagamento</h3>

        <p>
          <strong>Status:</strong>
          ${escapar(pedido.status)}
        </p>

        ${pagamento}

        <button type="button"
          onclick="imprimirPedido(pedidos[${numeroReal}])">
          Imprimir comanda
        </button>

      </div>
    `;
  }).join("");
}

// ======================================================
// CONFIRMAR PAGAMENTO
// ======================================================

function finalizarPedido(indice) {
  const pedido = pedidos[indice];

  if (!pedido) {
    alert("Pedido não encontrado.");
    return;
  }

  if (pedido.status === "Pago") {
    alert("Este pedido já foi pago.");
    return;
  }

  const campoForma = document.getElementById(
    "pagamento-" + indice
  );

  const campoRecebido = document.getElementById(
    "recebido-" + indice
  );

  if (!campoForma) {
    alert("Não foi possível localizar a forma de pagamento.");
    return;
  }

  const forma = campoForma.value;

  let recebido = Number(
    String(campoRecebido?.value || "").replace(",", ".")
  );

  let troco = 0;

  if (forma === "Dinheiro") {
    if (!campoRecebido || campoRecebido.value.trim() === "") {
      alert("Informe o valor recebido em dinheiro.");
      campoRecebido?.focus();
      return;
    }

    if (!Number.isFinite(recebido) || recebido < pedido.total) {
      alert("O valor recebido não pode ser menor que o total.");
      campoRecebido.focus();
      return;
    }

    troco = recebido - pedido.total;

  } else {
    recebido = pedido.total;
  }

  pedido.pagamento = forma;
  pedido.recebido = recebido;
  pedido.troco = troco;
  pedido.status = "Pago";

  if (!pedido.statusProducao) {
    pedido.statusProducao = "Recebido";
  }

  salvarDados();

  atualizarCaixa();
  atualizarHistorico();

  alert(
    "Pagamento confirmado!\n" +
    "Forma: " + forma +
    "\nTotal: " + formatarDinheiro(pedido.total) +
    "\nTroco: " + formatarDinheiro(troco)
  );

  imprimirPedido(pedido);
}




// ======================================================
// CARAMELL PEDIDOS
// PARTE 3: IMPRESSÃO, WHATSAPP E PRODUÇÃO
// ======================================================

// ======================================================
// IMPRESSÃO DE COMANDAS - RAWBT
// ======================================================

function gerarComanda(pedido) {
  const largura = 32;
  const linha = "-".repeat(largura);

  function centralizar(texto) {
    texto = String(texto);

    const espacos = Math.max(
      0,
      Math.floor((largura - texto.length) / 2)
    );

    return " ".repeat(espacos) + texto + "\n";
  }

  function quebrarTexto(texto, maximo = largura) {
    const palavras = String(texto).split(" ");
    const linhas = [];
    let atual = "";

    palavras.forEach(palavra => {
      if ((atual + " " + palavra).trim().length > maximo) {
        if (atual) linhas.push(atual);
        atual = palavra;
      } else {
        atual = (atual + " " + palavra).trim();
      }
    });

    if (atual) linhas.push(atual);

    return linhas.join("\n") + "\n";
  }

  let texto = "";

  texto += "\n";
  texto += centralizar("CARAMELL");
  texto += centralizar("PEDIDO DE VENDA");
  texto += linha + "\n";

  texto += "PEDIDO Nº: " + pedido.numero + "\n";
  texto += quebrarTexto("DATA: " + pedido.data);
  texto += quebrarTexto("CLIENTE: " + pedido.cliente);
  texto += quebrarTexto("ATENDENTE: " + pedido.atendente);

  texto += linha + "\n";
  texto += centralizar("PRODUTOS");
  texto += "\n";

  (pedido.itens || []).forEach(item => {
    texto += quebrarTexto(
      item.quantidade + "x " + item.produto
    );

    texto += quebrarTexto("Sabor: " + item.sabor);
    texto += "Unit.: " + formatarDinheiro(item.preco) + "\n";

    texto += "Total: " +
      formatarDinheiro(item.preco * item.quantidade) + "\n";

    texto += "\n";
  });

  texto += linha + "\n";
  texto += "TOTAL: " + formatarDinheiro(pedido.total) + "\n";
  texto += linha + "\n";

  texto += quebrarTexto(
    "PAGAMENTO: " + (pedido.pagamento || "Pendente")
  );

  if (pedido.status === "Pago") {
    texto += "RECEBIDO: " + formatarDinheiro(pedido.recebido) + "\n";
    texto += "TROCO: " + formatarDinheiro(pedido.troco) + "\n";
  }

  texto += linha + "\n";
  texto += centralizar("OBRIGADO PELA");
  texto += centralizar("PREFERENCIA!");
  texto += centralizar("CARAMELL");
  texto += "\n\n\n";

  return texto;
}

function imprimirPedido(pedido) {
  if (!pedido) {
    alert("Pedido não encontrado.");
    return;
  }

  try {
    const texto = gerarComanda(pedido);

    const base64 = btoa(
      unescape(encodeURIComponent(texto))
    );

    window.location.href = "rawbt:base64," + base64;

  } catch (erro) {
    alert("Erro ao preparar impressão: " + erro.message);
  }
}

function testarImpressaoRawBT() {
  const texto =
    "TESTE DE IMPRESSAO\n" +
    "CARAMELL\n" +
    "Impressora conectada!\n\n\n";

  const base64 = btoa(
    unescape(encodeURIComponent(texto))
  );

  window.location.href = "rawbt:base64," + base64;
}

// ======================================================
// WHATSAPP - MENSAGENS MANUAIS
// ======================================================

function normalizarWhatsApp(numero) {
  let telefone = String(numero || "").replace(/\D/g, "");

  if (
    telefone.startsWith("55") &&
    (telefone.length === 12 || telefone.length === 13)
  ) {
    telefone = telefone.substring(2);
  }

  if (telefone.length !== 10 && telefone.length !== 11) {
    return "";
  }

  const ddd = Number(telefone.substring(0, 2));

  if (ddd < 11 || ddd > 99) {
    return "";
  }

  return "55" + telefone;
}

function salvarTelefonePedido(indice) {
  const pedido = pedidos[indice];

  if (!pedido) {
    alert("Pedido não encontrado.");
    return;
  }

  const campo = document.getElementById(
    "telefone-pedido-" + indice
  );

  if (!campo) return;

  const telefone = campo.value.trim();

  if (!normalizarWhatsApp(telefone)) {
    alert("Informe um WhatsApp válido com DDD.");
    campo.focus();
    return;
  }

  pedido.telefone = telefone;

  salvarDados();
  atualizarCaixa();

  alert("Telefone atualizado com sucesso!");
}

function abrirWhatsApp(indice, tipo) {
  const pedido = pedidos[indice];

  if (!pedido) {
    alert("Pedido não encontrado.");
    return;
  }

  const telefone = normalizarWhatsApp(pedido.telefone);

  if (!telefone) {
    alert("Salve um número de WhatsApp válido para este cliente.");
    return;
  }

  const modelo = mensagens[tipo];

  if (!modelo) {
    alert("Modelo de mensagem não encontrado.");
    return;
  }

  const texto = modelo
    .replace(/\{cliente\}/g, pedido.cliente || "Cliente")
    .replace(/\{pedido\}/g, pedido.numero)
    .replace(/\{total\}/g, formatarDinheiro(pedido.total));

  const url =
    "https://wa.me/" +
    telefone +
    "?text=" +
    encodeURIComponent(texto);

  window.open(url, "_blank");
}

// ======================================================
// PRODUÇÃO - INICIAR PREPARO
// ======================================================

function iniciarPreparo(indice) {
  const pedido = pedidos[indice];

  if (!pedido) {
    alert("Pedido não encontrado.");
    return;
  }

  if (pedido.status !== "Pago") {
    alert("Confirme o pagamento antes de iniciar o preparo.");
    return;
  }

  if (pedido.statusProducao !== "Recebido") {
    alert("Este pedido não está aguardando início do preparo.");
    return;
  }

  pedido.statusProducao = "Em preparo";
  pedido.inicioPreparoEm = new Date().toISOString();

  salvarDados();

  atualizarCaixa();
  atualizarHistorico();
}

// ======================================================
// PRODUÇÃO - MARCAR PEDIDO PRONTO
// ======================================================

function marcarPronto(indice) {
  const pedido = pedidos[indice];

  if (!pedido) {
    alert("Pedido não encontrado.");
    return;
  }

  if (pedido.statusProducao !== "Em preparo") {
    alert("Este pedido não está em preparo.");
    return;
  }

  pedido.statusProducao = "Pronto";
  pedido.prontoEm = new Date().toISOString();

  salvarDados();

  atualizarCaixa();
  atualizarHistorico();
}

// ======================================================
// PRODUÇÃO - MARCAR COMO ENTREGUE
// ======================================================

function marcarEntregue(indice) {
  const pedido = pedidos[indice];

  if (!pedido) {
    alert("Pedido não encontrado.");
    return;
  }

  if (pedido.statusProducao !== "Pronto") {
    alert("O pedido precisa estar pronto antes da entrega.");
    return;
  }

  pedido.statusProducao = "Entregue";
  pedido.entregueEm = new Date().toISOString();

  salvarDados();

  atualizarCaixa();
  atualizarHistorico();
}

// ======================================================
// CRONÔMETRO DE PREPARO
// ======================================================

function atualizarCronometros() {
  pedidos.forEach((pedido, indice) => {
    if (pedido.statusProducao !== "Em preparo") {
      return;
    }

    const campo = document.getElementById(
      "tempo-preparo-" + indice
    );

    if (campo) {
      campo.textContent = formatarDuracao(
        pedido.inicioPreparoEm
      );
    }
  });
}



// ======================================================
// CARAMELL PEDIDOS
// PARTE 4: MENSAGENS E INICIALIZAÇÃO
// ======================================================

// ======================================================
// CARREGAR MENSAGENS SALVAS
// ======================================================

function carregarMensagens() {
  try {
    const salvas = JSON.parse(
      localStorage.getItem(CHAVE_MENSAGENS) || "{}"
    );

    mensagens = {
      ...mensagensPadrao,
      ...(salvas || {})
    };

  } catch (erro) {
    mensagens = { ...mensagensPadrao };
  }
}

// ======================================================
// PREENCHER CAMPOS DAS MENSAGENS
// ======================================================

function carregarCamposMensagens() {
  carregarMensagens();

  const recebido = document.getElementById("mensagemRecebido");
  const preparo = document.getElementById("mensagemPreparo");
  const pronto = document.getElementById("mensagemPronto");

  if (recebido) {
    recebido.value = mensagens.recebido;
  }

  if (preparo) {
    preparo.value = mensagens.preparo;
  }

  if (pronto) {
    pronto.value = mensagens.pronto;
  }
}

// ======================================================
// SALVAR MENSAGENS PERSONALIZADAS
// ======================================================

function salvarMensagens() {
  const recebido = document.getElementById("mensagemRecebido");
  const preparo = document.getElementById("mensagemPreparo");
  const pronto = document.getElementById("mensagemPronto");

  if (!recebido || !preparo || !pronto) {
    alert("Não foi possível localizar os campos das mensagens.");
    return;
  }

  const novasMensagens = {
    recebido: recebido.value.trim(),
    preparo: preparo.value.trim(),
    pronto: pronto.value.trim()
  };

  if (
    !novasMensagens.recebido ||
    !novasMensagens.preparo ||
    !novasMensagens.pronto
  ) {
    alert("Preencha as três mensagens antes de salvar.");
    return;
  }

  try {
    localStorage.setItem(
      CHAVE_MENSAGENS,
      JSON.stringify(novasMensagens)
    );

    mensagens = novasMensagens;

    const aviso = document.getElementById("avisoMensagens");

    if (aviso) {
      aviso.textContent = "Mensagens salvas com sucesso!";
    }

    alert("Mensagens salvas com sucesso!");

  } catch (erro) {
    alert("Erro ao salvar as mensagens: " + erro.message);
  }
}

// ======================================================
// INICIALIZAÇÃO DO SISTEMA
// ======================================================

function iniciarSistemaCaramell() {
  // Recupera os pedidos já registrados no navegador.
  carregarDados();

  // Recupera os modelos personalizados do WhatsApp.
  carregarMensagens();

  // Atualiza as telas.
  atualizarTela();
  atualizarHistorico();
  atualizarCaixa();

  // Atualiza o cronômetro de preparo a cada segundo.
  setInterval(atualizarCronometros, 1000);

  console.log("Sistema Caramell iniciado com sucesso!");
}

// ======================================================
// INICIAR QUANDO A PÁGINA ESTIVER PRONTA
// ======================================================

if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    iniciarSistemaCaramell
  );
} else {
  iniciarSistemaCaramell();
}

// ======================================================
// FIM DO APP.JS - CARAMELL PEDIDOS
// ======================================================



// ======================================================
// CARAMELL FINANCEIRO
// PARTE 1 - ESTRUTURA E ABERTURA DO CAIXA
// ======================================================

const CHAVE_CAIXAS = "caramell_caixas_v1";

let caixasCaramell = [];
let caixaAtual = null;

// ------------------------------------------------------
// CARREGAR CAIXAS SALVOS
// ------------------------------------------------------

function carregarCaixas() {
  try {
    const dados = JSON.parse(
      localStorage.getItem(CHAVE_CAIXAS) || "[]"
    );

    caixasCaramell = Array.isArray(dados) ? dados : [];

  } catch (erro) {
    caixasCaramell = [];
    alert("Erro ao carregar os dados financeiros.");
  }

  caixaAtual = caixasCaramell.find(
    caixa => caixa.status === "Aberto"
  ) || null;
}

// ------------------------------------------------------
// SALVAR CAIXAS
// ------------------------------------------------------

function salvarCaixas() {
  try {
    localStorage.setItem(
      CHAVE_CAIXAS,
      JSON.stringify(caixasCaramell)
    );

    return true;

  } catch (erro) {
    alert("Erro ao salvar o caixa: " + erro.message);
    return false;
  }
}

// ------------------------------------------------------
// DATA E IDENTIFICAÇÃO DO CAIXA
// ------------------------------------------------------

function dataAtualCaixa() {
  const agora = new Date();

  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

// ------------------------------------------------------
// ABERTURA DO CAIXA
// ------------------------------------------------------

function abrirCaixaFinanceiro() {
  if (caixaAtual && caixaAtual.status === "Aberto") {
    alert("Já existe um caixa aberto.");
    atualizarPainelFinanceiro();
    return;
  }

  const campo = document.getElementById("saldoInicialCaixa");

  if (!campo) {
    alert("Campo de saldo inicial não encontrado.");
    return;
  }

  const valor = Number(
    String(campo.value || "").replace(",", ".")
  );

  if (!Number.isFinite(valor) || valor < 0) {
    alert("Informe um saldo inicial válido.");
    campo.focus();
    return;
  }

  const agora = new Date();

  const novoCaixa = {
    id: "CX-" + agora.getTime(),
    data: dataAtualCaixa(),
    aberturaEm: agora.toISOString(),
    fechamentoEm: null,
    responsavel: atendenteAtual || "Operador do caixa",
    saldoInicial: valor,
    saldoContado: null,
    diferenca: null,
    status: "Aberto",
    movimentacoes: []
  };

  caixasCaramell.push(novoCaixa);

  if (!salvarCaixas()) {
    caixasCaramell.pop();
    return;
  }

  caixaAtual = novoCaixa;

  alert(
    "Caixa aberto com sucesso!\n" +
    "Saldo inicial: " + formatarDinheiro(valor)
  );

  atualizarPainelFinanceiro();
}

// ------------------------------------------------------
// SITUAÇÃO DO CAIXA
// ------------------------------------------------------

function atualizarPainelFinanceiro() {
  const area = document.getElementById("painelFinanceiro");

  if (!area) return;

  if (!caixaAtual) {
    area.innerHTML = `
      <h3>🔐 Abertura do caixa</h3>

      <p>Informe quanto existe em dinheiro na gaveta.</p>

      <label>Saldo inicial em dinheiro</label>

      <input
        id="saldoInicialCaixa"
        type="number"
        min="0"
        step="0.01"
        placeholder="Ex.: 100,00"
      >

      <button
        type="button"
        onclick="abrirCaixaFinanceiro()"
      >
        Abrir caixa
      </button>

      <p><strong>Status:</strong> Caixa fechado</p>
    `;

    return;
  }

  area.innerHTML = `
    <h3>🟢 Caixa aberto</h3>

    <p>
      <strong>Responsável:</strong>
      ${escapar(caixaAtual.responsavel)}
    </p>

    <p>
      <strong>Abertura:</strong>
      ${new Date(caixaAtual.aberturaEm).toLocaleString("pt-BR")}
    </p>

    <p>
      <strong>Saldo inicial:</strong>
      ${formatarDinheiro(caixaAtual.saldoInicial)}
    </p>

    <p>O controle de movimentações será ativado na próxima etapa.</p>
  `;
}

// ------------------------------------------------------
// INICIALIZAR MÓDULO FINANCEIRO
// ------------------------------------------------------

function iniciarFinanceiroCaramell() {
  carregarCaixas();
  atualizarPainelFinanceiro();
}

// ======================================================
// FIM DA PARTE 1




// ======================================================
// CARAMELL FINANCEIRO
// PARTE 2 - PAINEL E MOVIMENTAÇÕES MANUAIS
// ======================================================

// ------------------------------------------------------
// CRIAR ÁREA FINANCEIRA NO PAINEL DO CAIXA
// ------------------------------------------------------

function instalarPainelFinanceiro() {
  if (document.getElementById("painelFinanceiro")) return;

  const pedidosArea = document.getElementById("pedidosCaixa");

  if (!pedidosArea) return;

  const painel = document.createElement("div");

  painel.id = "painelFinanceiro";
  painel.style.cssText =
    "border:1px solid #d8c5b9;" +
    "border-radius:12px;" +
    "padding:15px;" +
    "margin:15px 0;" +
    "background:#fff8f1;";

  pedidosArea.before(painel);

  painel.innerHTML = `
    <h2 class="secao-titulo">💰 Financeiro da Caramell</h2>
  `;
}

// ------------------------------------------------------
// SOMAR MOVIMENTAÇÕES DE DINHEIRO
// ------------------------------------------------------

function calcularSaldoFisicoCaixa() {
  if (!caixaAtual) return 0;

  let saldo = Number(caixaAtual.saldoInicial) || 0;

  (caixaAtual.movimentacoes || []).forEach(movimento => {
    if (movimento.tipo === "Entrada") {
      saldo += Number(movimento.valor) || 0;
    }

    if (movimento.tipo === "Retirada") {
      saldo -= Number(movimento.valor) || 0;
    }

    // Vendas em dinheiro serão integradas na Parte 3.
  });

  return saldo;
}

// ------------------------------------------------------
// REGISTRAR ENTRADA OU RETIRADA
// ------------------------------------------------------

function registrarMovimentacaoFinanceira(tipo) {
  if (!caixaAtual || caixaAtual.status !== "Aberto") {
    alert("Abra o caixa antes de registrar movimentações.");
    return;
  }

  const campoValor = document.getElementById("valorMovimentacao");
  const campoDescricao = document.getElementById("descricaoMovimentacao");

  if (!campoValor || !campoDescricao) return;

  const valor = Number(
    String(campoValor.value || "").replace(",", ".")
  );

  const descricao = campoDescricao.value.trim();

  if (!Number.isFinite(valor) || valor <= 0) {
    alert("Informe um valor maior que zero.");
    campoValor.focus();
    return;
  }

  if (!descricao) {
    alert("Informe a descrição da movimentação.");
    campoDescricao.focus();
    return;
  }

  if (
    tipo === "Retirada" &&
    valor > calcularSaldoFisicoCaixa()
  ) {
    alert("O valor da retirada é maior que o dinheiro disponível na gaveta.");
    return;
  }

  const movimento = {
    id: "MOV-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
    tipo,
    categoria: "Movimentação manual",
    descricao,
    valor,
    data: new Date().toISOString()
  };

  caixaAtual.movimentacoes.push(movimento);

  if (!salvarCaixas()) {
    caixaAtual.movimentacoes.pop();
    return;
  }

  campoValor.value = "";
  campoDescricao.value = "";

  atualizarPainelFinanceiro();

  alert(
    tipo + " registrada com sucesso!\n" +
    "Valor: " + formatarDinheiro(valor)
  );
}

// ------------------------------------------------------
// ATUALIZAR PAINEL FINANCEIRO




function atualizarPainelFinanceiro() {
  const area = document.getElementById("painelFinanceiro");

  if (!area) return;

  // HISTÓRICO DE CAIXAS FECHADOS
  const historicoCaixas = gerarHistoricoCaixas();

  // TELA DE ABERTURA
  if (!caixaAtual) {
    area.innerHTML = `
      <h2 class="secao-titulo">💰 Financeiro da Caramell</h2>

      <h3>🔐 Abertura do caixa</h3>

      <p>Informe quanto existe em dinheiro na gaveta.</p>

      <label>Saldo inicial em dinheiro</label>

      <input
        id="saldoInicialCaixa"
        type="number"
        min="0"
        step="0.01"
        placeholder="Ex.: 100,00"
      >

      <button
        type="button"
        onclick="abrirCaixaFinanceiro()"
      >
        Abrir caixa
      </button>

      <p><strong>Status:</strong> Caixa fechado</p>

      <hr>

      ${historicoCaixas}
    `;

    return;
  }

  // RESUMO FINANCEIRO DO CAIXA ATUAL
  const resumo = resumoFinanceiroCaixa(caixaAtual);

  const saldo = calcularSaldoFisicoCaixa();

  // HISTÓRICO DE MOVIMENTAÇÕES
  const historico = (caixaAtual.movimentacoes || [])
    .slice()
    .reverse()
    .map(movimento => {

      const ehVenda = movimento.tipo === "Venda";

      const descricao = ehVenda
        ? "Pedido #" + (movimento.pedidoNumero || "") +
          " - " + (movimento.cliente || "")
        : movimento.descricao || movimento.categoria || "Movimentação";

      const valor = ehVenda
        ? movimento.totalCobrado
        : movimento.valor;

      const data = movimento.data
        ? new Date(movimento.data).toLocaleString("pt-BR")
        : "";

      return `
        <div class="pedido">
          <strong>${escapar(movimento.tipo)}</strong>

          <p>${escapar(descricao)}</p>

          ${
            ehVenda
              ? `<p>Pagamento: ${escapar(movimento.formaPagamento || "")}</p>`
              : ""
          }

          <p><strong>${formatarDinheiro(valor || 0)}</strong></p>

          <small>${data}</small>
        </div>
      `;
    }).join("");

  area.innerHTML = `
    <h2 class="secao-titulo">💰 Financeiro da Caramell</h2>

    <h3>🟢 Caixa aberto</h3>

    <p>
      <strong>Responsável:</strong>
      ${escapar(caixaAtual.responsavel || "")}
    </p>

    <p>
      <strong>Abertura:</strong>
      ${new Date(caixaAtual.aberturaEm).toLocaleString("pt-BR")}
    </p>

    <p>
      <strong>Saldo inicial:</strong>
      ${formatarDinheiro(caixaAtual.saldoInicial)}
    </p>

    <hr>

    <h3>📊 Resumo das vendas</h3>

    <div class="pedido">
      <p>Faturamento bruto</p>
      <h2>${formatarDinheiro(resumo.totalCobrado)}</h2>

      <p>
        Valor dos produtos:
        <strong>${formatarDinheiro(resumo.produtos)}</strong>
      </p>

      <p>
        Juros cobrados:
        <strong>${formatarDinheiro(resumo.juros)}</strong>
      </p>
    </div>

    <h3>💳 Formas de pagamento</h3>

    <div class="pedido">
      <p>
        Dinheiro:
        <strong>${formatarDinheiro(resumo.dinheiro)}</strong>
      </p>

      <p>
        Pix:
        <strong>${formatarDinheiro(resumo.pix)}</strong>
      </p>

      <p>
        Débito:
        <strong>${formatarDinheiro(resumo.debito)}</strong>
      </p>

      <p>
        Crédito:
        <strong>${formatarDinheiro(resumo.credito)}</strong>
      </p>
    </div>

    <h3>📉 Taxas e resultado</h3>

    <div class="pedido">
      <p>
        Taxas das operadoras:
        <strong>${formatarDinheiro(resumo.taxas)}</strong>
      </p>

      <p>
        Líquido previsto:
        <strong>${formatarDinheiro(resumo.liquido)}</strong>
      </p>
    </div>

    <hr>

    <h3>💵 Controle do dinheiro físico</h3>

    <div style="
      background:#713b28;
      color:white;
      padding:15px;
      border-radius:10px;
      margin:15px 0;
    ">
      <p>Dinheiro esperado na gaveta</p>
      <h2>${formatarDinheiro(saldo)}</h2>
    </div>

    <p>
      Saldo inicial:
      <strong>${formatarDinheiro(caixaAtual.saldoInicial)}</strong>
    </p>

    <p>
      Vendas em dinheiro:
      <strong>${formatarDinheiro(resumo.dinheiro)}</strong>
    </p>

    <p>
      Entradas adicionais:
      <strong>${formatarDinheiro(resumo.entradas)}</strong>
    </p>

    <p>
      Retiradas:
      <strong>${formatarDinheiro(resumo.retiradas)}</strong>
    </p>

    <hr>

    <h3>➕ Registrar entrada ou retirada</h3>

    <label>Valor</label>

    <input
      id="valorMovimentacao"
      type="number"
      min="0.01"
      step="0.01"
      placeholder="Ex.: 50,00"
    >

    <label>Descrição</label>

    <input
      id="descricaoMovimentacao"
      type="text"
      placeholder="Ex.: Reposição de dinheiro"
    >

    <button
      type="button"
      onclick="registrarMovimentacaoFinanceira('Entrada')"
    >
      Registrar entrada
    </button>

    <button
      type="button"
      class="botao-secundario"
      onclick="registrarMovimentacaoFinanceira('Retirada')"
    >
      Registrar retirada
    </button>

    <hr>

    <h3>🔒 Fechamento do caixa</h3>

    <p>
      Confira o dinheiro físico existente na gaveta.
    </p>

    <label>Dinheiro contado no fechamento</label>

    <input
      id="valorContadoCaixa"
      type="number"
      min="0"
      step="0.01"
      placeholder="Informe o valor contado"
    >

    <button
      type="button"
      onclick="fecharCaixaFinanceiro()"
    >
      Fechar caixa
    </button>

    <hr>

    <h3>📋 Histórico de movimentações</h3>

    ${historico || "<p>Nenhuma movimentação registrada.</p>"}

    <hr>

    ${historicoCaixas}
  `;
}








    

// ------------------------------------------------------
// CONECTAR PAINEL AO LOGIN DO CAIXA
// ------------------------------------------------------

const entrarComoCaixaOriginal = entrarComoCaixa;

entrarComoCaixa = function() {
  entrarComoCaixaOriginal();

  instalarPainelFinanceiro();
  iniciarFinanceiroCaramell();
};

// ======================================================
// FIM DA PARTE 2
// ======================================================

// ======================================================



// ======================================================
// CARAMELL FINANCEIRO
// PARTE 3 - PAGAMENTOS, JUROS E TAXAS
// ======================================================

// ------------------------------------------------------
// CONVERTER VALORES
// ------------------------------------------------------

function valorFinanceiro(campoId) {
  const campo = document.getElementById(campoId);

  if (!campo) return 0;

  return Number(
    String(campo.value || "0").replace(",", ".")
  );
}

// ------------------------------------------------------
// INSERIR CAMPOS DE CARTÃO NOS PEDIDOS
// ------------------------------------------------------

function instalarCamposPagamento() {
  pedidos.forEach((pedido, indice) => {
    if (pedido.status !== "Pendente") return;

    const forma = document.getElementById(
      "pagamento-" + indice
    );

    if (!forma) return;

    forma.onchange = function() {
      atualizarCamposPagamento(indice);
    };

    if (document.getElementById("dados-cartao-" + indice)) {
      return;
    }

    forma.insertAdjacentHTML("afterend", `
      <div id="dados-cartao-${indice}">

        <div id="parcelamento-area-${indice}" hidden>
          <label>Quantidade de parcelas</label>

          <select id="parcelas-${indice}">
            <option value="1">À vista (1x)</option>
            <option value="2">2 vezes</option>
            <option value="3">3 vezes</option>
            <option value="4">4 vezes</option>
            <option value="5">5 vezes</option>
            <option value="6">6 vezes</option>
            <option value="7">7 vezes</option>
            <option value="8">8 vezes</option>
            <option value="9">9 vezes</option>
            <option value="10">10 vezes</option>
            <option value="11">11 vezes</option>
            <option value="12">12 vezes</option>
          </select>
        </div>

        <div id="juros-area-${indice}" hidden>
          <label>Juros cobrados do cliente (R$)</label>

          <input
            id="juros-${indice}"
            type="number"
            min="0"
            step="0.01"
            value="0"
            placeholder="Ex.: 5,00"
            oninput="atualizarResumoPagamento(${indice})"
          >
        </div>

        <div id="taxa-area-${indice}" hidden>
          <label>Taxa da operadora (R$)</label>

          <input
            id="taxa-${indice}"
            type="number"
            min="0"
            step="0.01"
            value="0"
            placeholder="Ex.: 3,00"
            oninput="atualizarResumoPagamento(${indice})"
          >
        </div>

        <div
          id="resumo-pagamento-${indice}"
          style="background:#fff8f1;padding:10px;border-radius:8px;margin:10px 0;"
        ></div>

      </div>
    `);

    atualizarCamposPagamento(indice);
  });
}

// ------------------------------------------------------
// MOSTRAR CAMPOS CONFORME A FORMA DE PAGAMENTO
// ------------------------------------------------------

function atualizarCamposPagamento(indice) {
  const forma = document.getElementById(
    "pagamento-" + indice
  );

  if (!forma) return;

  const metodo = forma.value;

  const parcelamento = document.getElementById(
    "parcelamento-area-" + indice
  );

  const juros = document.getElementById(
    "juros-area-" + indice
  );

  const taxa = document.getElementById(
    "taxa-area-" + indice
  );

  if (!parcelamento || !juros || !taxa) return;

  parcelamento.hidden = metodo !== "Crédito";
  juros.hidden = metodo !== "Crédito";
  taxa.hidden = metodo !== "Crédito" && metodo !== "Débito";

  atualizarResumoPagamento(indice);
}

// ------------------------------------------------------
// RESUMO DO PAGAMENTO
// ------------------------------------------------------

function atualizarResumoPagamento(indice) {
  const pedido = pedidos[indice];

  if (!pedido) return;

  const forma = document.getElementById(
    "pagamento-" + indice
  );

  const resumo = document.getElementById(
    "resumo-pagamento-" + indice
  );

  if (!forma || !resumo) return;

  const metodo = forma.value;

  const juros = metodo === "Crédito"
    ? valorFinanceiro("juros-" + indice)
    : 0;

  const taxa = (
    metodo === "Crédito" || metodo === "Débito"
  )
    ? valorFinanceiro("taxa-" + indice)
    : 0;

  const totalCobrado = Number(pedido.total) + juros;
  const liquido = totalCobrado - taxa;

  resumo.innerHTML = `
    <p>Produtos: <strong>${formatarDinheiro(pedido.total)}</strong></p>
    <p>Juros: <strong>${formatarDinheiro(juros)}</strong></p>
    <p>Total cobrado: <strong>${formatarDinheiro(totalCobrado)}</strong></p>
    <p>Taxa da operadora: <strong>${formatarDinheiro(taxa)}</strong></p>
    <p>Valor líquido previsto: <strong>${formatarDinheiro(liquido)}</strong></p>
  `;
}

// ------------------------------------------------------
// ATUALIZAR O SALDO FÍSICO DA GAVETA
// ------------------------------------------------------

function calcularSaldoFisicoCaixa() {
  if (!caixaAtual) return 0;

  let saldo = Number(caixaAtual.saldoInicial) || 0;

  (caixaAtual.movimentacoes || []).forEach(movimento => {

    if (movimento.tipo === "Entrada") {
      saldo += Number(movimento.valor) || 0;
    }

    if (movimento.tipo === "Retirada") {
      saldo -= Number(movimento.valor) || 0;
    }

    if (movimento.tipo === "Venda") {
      saldo += Number(movimento.valorDinheiroGaveta) || 0;
    }

  });

  return saldo;
}

// ------------------------------------------------------
// ATUALIZAR A TELA DE PAGAMENTOS AUTOMATICAMENTE
// ------------------------------------------------------

const atualizarCaixaParte2 = atualizarCaixa;

atualizarCaixa = function() {
  atualizarCaixaParte2();
  instalarCamposPagamento();
};

// ------------------------------------------------------
// CONFIRMAR PAGAMENTO E LANÇAR NO FINANCEIRO
// ------------------------------------------------------

function finalizarPedido(indice) {
  const pedido = pedidos[indice];

  if (!pedido) {
    alert("Pedido não encontrado.");
    return;
  }

  if (pedido.status === "Pago") {
    alert("Este pedido já foi pago.");
    return;
  }

  if (!caixaAtual || caixaAtual.status !== "Aberto") {
    alert("Abra o caixa financeiro antes de confirmar pagamentos.");
    return;
  }

  const campoForma = document.getElementById(
    "pagamento-" + indice
  );

  const campoRecebido = document.getElementById(
    "recebido-" + indice
  );

  if (!campoForma) {
    alert("Forma de pagamento não encontrada.");
    return;
  }

  const forma = campoForma.value;

  let juros = 0;
  let taxa = 0;
  let parcelas = 1;
  let recebido = 0;
  let troco = 0;

  if (forma === "Dinheiro") {
    if (!campoRecebido || campoRecebido.value.trim() === "") {
      alert("Informe o valor recebido em dinheiro.");
      campoRecebido?.focus();
      return;
    }

    recebido = Number(
      String(campoRecebido.value).replace(",", ".")
    );

    if (!Number.isFinite(recebido) || recebido < pedido.total) {
      alert("O valor recebido não pode ser menor que o total.");
      campoRecebido.focus();
      return;
    }

    troco = recebido - Number(pedido.total);

  } else if (forma === "Crédito") {

    juros = valorFinanceiro("juros-" + indice);
    taxa = valorFinanceiro("taxa-" + indice);

    const campoParcelas = document.getElementById(
      "parcelas-" + indice
    );

    parcelas = Number(campoParcelas?.value || 1);

  } else if (forma === "Débito") {

    taxa = valorFinanceiro("taxa-" + indice);

  }

  if (
    !Number.isFinite(juros) ||
    !Number.isFinite(taxa) ||
    juros < 0 ||
    taxa < 0
  ) {
    alert("Confira os valores de juros e taxa.");
    return;
  }

  if (forma !== "Crédito" && juros !== 0) {
    alert("Juros de parcelamento são registrados somente no crédito.");
    return;
  }

  if (
    forma === "Crédito" &&
    (!Number.isInteger(parcelas) || parcelas < 1 || parcelas > 12)
  ) {
    alert("Informe uma quantidade válida de parcelas.");
    return;
  }

  const totalCobrado = Number(pedido.total) + juros;
  const valorLiquido = totalCobrado - taxa;

  if (taxa > totalCobrado) {
    alert("A taxa não pode ser maior que o valor cobrado.");
    return;
  }

  if (forma !== "Dinheiro") {
    recebido = totalCobrado;
  }

  const movimento = {
    id: "VENDA-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
    tipo: "Venda",
    categoria: "Venda de pedido",
    pedidoNumero: pedido.numero,
    cliente: pedido.cliente,
    formaPagamento: forma,
    valorProdutos: Number(pedido.total),
    juros,
    parcelas,
    totalCobrado,
    taxaOperadora: taxa,
    valorLiquido,
    valorDinheiroGaveta: forma === "Dinheiro"
      ? Number(pedido.total)
      : 0,
    data: new Date().toISOString()
  };

  pedido.pagamento = forma;
  pedido.recebido = recebido;
  pedido.troco = troco;
  pedido.juros = juros;
  pedido.parcelas = parcelas;
  pedido.taxaOperadora = taxa;
  pedido.totalCobrado = totalCobrado;
  pedido.valorLiquido = valorLiquido;
  pedido.status = "Pago";
  pedido.movimentoCaixaId = movimento.id;

  if (!pedido.statusProducao) {
    pedido.statusProducao = "Recebido";
  }

  caixaAtual.movimentacoes.push(movimento);

  if (!salvarCaixas()) {
    caixaAtual.movimentacoes.pop();

    pedido.status = "Pendente";
    pedido.pagamento = "";
    pedido.movimentoCaixaId = null;

    alert("Não foi possível salvar o movimento financeiro.");
    return;
  }

  salvarDados();

  atualizarCaixa();
  atualizarHistorico();
  atualizarPainelFinanceiro();

  alert(
    "Pagamento confirmado!\n\n" +
    "Forma: " + forma +
    "\nProdutos: " + formatarDinheiro(pedido.total) +
    "\nJuros: " + formatarDinheiro(juros) +
    "\nTotal cobrado: " + formatarDinheiro(totalCobrado) +
    "\nTaxa: " + formatarDinheiro(taxa) +
    "\nLíquido previsto: " + formatarDinheiro(valorLiquido) +
    "\nTroco: " + formatarDinheiro(troco)
  );

  imprimirPedido(pedido);
}

// ======================================================
// FIM DA PARTE 3
// ======================================================




// ======================================================
// CARAMELL FINANCEIRO
// PARTE 4 - FECHAMENTO E RELATÓRIOS
// ======================================================

// ------------------------------------------------------
// CALCULAR SALDO FÍSICO DE QUALQUER CAIXA
// ------------------------------------------------------

function calcularSaldoDoCaixa(caixa) {
  if (!caixa) return 0;

  let saldo = Number(caixa.saldoInicial) || 0;

  (caixa.movimentacoes || []).forEach(movimento => {
    if (movimento.tipo === "Entrada") {
      saldo += Number(movimento.valor) || 0;
    }

    if (movimento.tipo === "Retirada") {
      saldo -= Number(movimento.valor) || 0;
    }

    if (movimento.tipo === "Venda") {
      saldo += Number(movimento.valorDinheiroGaveta) || 0;
    }
  });

  return saldo;
}

// ------------------------------------------------------
// RESUMO FINANCEIRO DE UM CAIXA
// ------------------------------------------------------

function resumoFinanceiroCaixa(caixa) {
  const movimentos = caixa.movimentacoes || [];

  const vendas = movimentos.filter(
    movimento => movimento.tipo === "Venda"
  );

  const resumo = {
    produtos: 0,
    juros: 0,
    totalCobrado: 0,
    taxas: 0,
    liquido: 0,
    dinheiro: 0,
    pix: 0,
    debito: 0,
    credito: 0,
    parcelas: {},
    entradas: 0,
    retiradas: 0,
    saldoFisico: calcularSaldoDoCaixa(caixa)
  };

  vendas.forEach(venda => {
    resumo.produtos += Number(venda.valorProdutos) || 0;
    resumo.juros += Number(venda.juros) || 0;
    resumo.totalCobrado += Number(venda.totalCobrado) || 0;
    resumo.taxas += Number(venda.taxaOperadora) || 0;
    resumo.liquido += Number(venda.valorLiquido) || 0;

    if (venda.formaPagamento === "Dinheiro") {
      resumo.dinheiro += Number(venda.totalCobrado) || 0;
    }

    if (venda.formaPagamento === "Pix") {
      resumo.pix += Number(venda.valorLiquido) || 0;
    }

    if (venda.formaPagamento === "Débito") {
      resumo.debito += Number(venda.valorLiquido) || 0;
    }

    if (venda.formaPagamento === "Crédito") {
      resumo.credito += Number(venda.valorLiquido) || 0;

      const quantidade = Number(venda.parcelas) || 1;

      resumo.parcelas[quantidade] =
        (resumo.parcelas[quantidade] || 0) + 1;
    }
  });

  movimentos.forEach(movimento => {
    if (movimento.tipo === "Entrada") {
      resumo.entradas += Number(movimento.valor) || 0;
    }

    if (movimento.tipo === "Retirada") {
      resumo.retiradas += Number(movimento.valor) || 0;
    }
  });

  return resumo;
}

// ------------------------------------------------------
// FECHAR CAIXA
// ------------------------------------------------------

function fecharCaixaFinanceiro() {
  if (!caixaAtual || caixaAtual.status !== "Aberto") {
    alert("Não existe um caixa aberto.");
    return;
  }

  const campo = document.getElementById("valorContadoCaixa");

  if (!campo || campo.value.trim() === "") {
    alert("Informe quanto dinheiro foi contado na gaveta.");
    campo?.focus();
    return;
  }

  const contado = Number(
    String(campo.value).replace(",", ".")
  );

  if (!Number.isFinite(contado) || contado < 0) {
    alert("Informe um valor contado válido.");
    campo.focus();
    return;
  }

  const esperado = calcularSaldoFisicoCaixa();
  const diferenca = contado - esperado;

  const confirmacao = confirm(
    "CONFIRMAR FECHAMENTO DO CAIXA?\n\n" +
    "Saldo esperado: " + formatarDinheiro(esperado) + "\n" +
    "Dinheiro contado: " + formatarDinheiro(contado) + "\n" +
    "Diferença: " + formatarDinheiro(diferenca) + "\n\n" +
    "Deseja realmente fechar?"
  );

  if (!confirmacao) return;

  const caixaFechado = caixaAtual;

  caixaFechado.fechamentoEm = new Date().toISOString();
  caixaFechado.saldoEsperado = esperado;
  caixaFechado.saldoContado = contado;
  caixaFechado.diferenca = diferenca;
  caixaFechado.status = "Fechado";

  caixaFechado.resumo = resumoFinanceiroCaixa(caixaFechado);

  if (!salvarCaixas()) {
    caixaFechado.status = "Aberto";
    caixaFechado.fechamentoEm = null;
    caixaFechado.saldoContado = null;
    caixaFechado.saldoEsperado = null;
    caixaFechado.diferenca = null;
    delete caixaFechado.resumo;
    return;
  }

  caixaAtual = null;

  alert(
    "CAIXA FECHADO COM SUCESSO!\n\n" +
    "Saldo esperado: " + formatarDinheiro(esperado) + "\n" +
    "Valor contado: " + formatarDinheiro(contado) + "\n" +
    "Diferença: " + formatarDinheiro(diferenca)
  );

  atualizarPainelFinanceiro();
}

// ------------------------------------------------------
// RELATÓRIO DE UM CAIXA
// ------------------------------------------------------

function gerarRelatorioCaixa(caixa) {
  const resumo = resumoFinanceiroCaixa(caixa);

  const parcelas = Object.keys(resumo.parcelas)
    .sort((a, b) => Number(a) - Number(b))
    .map(quantidade => `
      <p>
        ${quantidade}x:
        ${resumo.parcelas[quantidade]} venda(s)
      </p>
    `).join("");

  return `
    <div class="pedido">

      <h3>Resumo financeiro</h3>

      <p>Produtos: <strong>${formatarDinheiro(resumo.produtos)}</strong></p>

      <p>Juros cobrados: <strong>${formatarDinheiro(resumo.juros)}</strong></p>

      <p>Total cobrado: <strong>${formatarDinheiro(resumo.totalCobrado)}</strong></p>

      <p>Taxas da operadora: <strong>${formatarDinheiro(resumo.taxas)}</strong></p>

      <p>Valor líquido previsto: <strong>${formatarDinheiro(resumo.liquido)}</strong></p>

      <hr>

      <h4>Vendas por pagamento</h4>

      <p>Dinheiro: ${formatarDinheiro(resumo.dinheiro)}</p>
      <p>Pix: ${formatarDinheiro(resumo.pix)}</p>
      <p>Débito líquido: ${formatarDinheiro(resumo.debito)}</p>
      <p>Crédito líquido: ${formatarDinheiro(resumo.credito)}</p>

      ${parcelas ? "<h4>Parcelamentos</h4>" + parcelas : ""}

      <hr>

      <h4>Movimentações de dinheiro</h4>

      <p>Entradas adicionais: ${formatarDinheiro(resumo.entradas)}</p>
      <p>Retiradas: ${formatarDinheiro(resumo.retiradas)}</p>
      <p>Saldo físico esperado: <strong>${formatarDinheiro(resumo.saldoFisico)}</strong></p>

      ${caixa.status === "Fechado" ? `
        <hr>
        <h4>Conferência do fechamento</h4>

        <p>Saldo esperado: ${formatarDinheiro(caixa.saldoEsperado)}</p>
        <p>Valor contado: ${formatarDinheiro(caixa.saldoContado)}</p>
        <p>Diferença:
          <strong>${formatarDinheiro(caixa.diferenca)}</strong>
        </p>
      ` : ""}

    </div>
  `;
}

// ------------------------------------------------------
// HISTÓRICO DOS CAIXAS FECHADOS
// ------------------------------------------------------

function gerarHistoricoCaixas() {
  const fechados = caixasCaramell
    .filter(caixa => caixa.status === "Fechado")
    .slice()
    .reverse();

  if (fechados.length === 0) {
    return "<p>Nenhum caixa fechado ainda.</p>";
  }

  return fechados.map(caixa => `
    <details class="pedido">
      <summary>
        <strong>
          Caixa ${escapar(caixa.id)}
        </strong>
        <br>
        ${new Date(caixa.aberturaEm).toLocaleDateString("pt-BR")}
        — ${escapar(caixa.responsavel)}
      </summary>

      <p>
        <strong>Fechamento:</strong>
        ${new Date(caixa.fechamentoEm).toLocaleString("pt-BR")}
      </p>

      ${gerarRelatorioCaixa(caixa)}
    </details>
  `).join("");
}

// ------------------------------------------------------
// PAINEL FINANCEIRO COMPLETO
// ------------------------------------------------------

function atualizarPainelFinanceiro() {
  const area = document.getElementById("painelFinanceiro");

  if (!area) return;

  const historicoCaixas = gerarHistoricoCaixas();

  // ABERTURA DO CAIXA
  if (!caixaAtual) {
    area.innerHTML = `
      <h2 class="secao-titulo">💰 Financeiro da Caramell</h2>

      <h3>🔐 Abertura do caixa</h3>

      <p>Informe quanto existe em dinheiro na gaveta.</p>

      <label>Saldo inicial em dinheiro</label>

      <input
        id="saldoInicialCaixa"
        type="number"
        min="0"
        step="0.01"
        placeholder="Ex.: 100.00"
      >

      <button
        type="button"
        onclick="abrirCaixaFinanceiro()"
      >
        Abrir caixa
      </button>

      <hr>

      <h3>📚 Histórico de caixas anteriores</h3>

      ${historicoCaixas}
    `;

    return;
  }

  // RESUMO FINANCEIRO
  const resumo = resumoFinanceiroCaixa(caixaAtual);

  const historico = (caixaAtual.movimentacoes || [])
    .slice()
    .reverse()
    .map(movimento => {

      const ehVenda = movimento.tipo === "Venda";

      const valor = ehVenda
        ? movimento.totalCobrado
        : movimento.valor;

      const descricao = ehVenda
        ? "Pedido nº " + (movimento.pedidoNumero || "")
        : movimento.descricao || movimento.categoria || "";

      return `
        <div class="pedido">
          <strong>${escapar(movimento.tipo)}</strong>

          <p>${escapar(descricao)}</p>

          ${
            ehVenda
              ? `<p>Cliente: ${escapar(movimento.cliente || "")}</p>
                 <p>Pagamento: ${escapar(movimento.formaPagamento || "")}</p>`
              : ""
          }

          <p>
            <strong>${formatarDinheiro(valor || 0)}</strong>
          </p>

          <small>
            ${movimento.data
              ? new Date(movimento.data).toLocaleString("pt-BR")
              : ""}
          </small>
        </div>
      `;
    }).join("");

  area.innerHTML = `
    <h2 class="secao-titulo">💰 Financeiro da Caramell</h2>

    <h3>🟢 Caixa aberto</h3>

    <p>
      <strong>Responsável:</strong>
      ${escapar(caixaAtual.responsavel || "")}
    </p>

    <p>
      <strong>Abertura:</strong>
      ${new Date(caixaAtual.aberturaEm).toLocaleString("pt-BR")}
    </p>

    <p>
      <strong>Saldo inicial:</strong>
      ${formatarDinheiro(caixaAtual.saldoInicial)}
    </p>

    <hr>

    <h3>📊 Faturamento bruto</h3>

    <div class="pedido">
      <p>Valor dos produtos</p>
      <h3>${formatarDinheiro(resumo.produtos)}</h3>

      <p>Juros cobrados</p>
      <h3>${formatarDinheiro(resumo.juros)}</h3>

      <hr>

      <p><strong>Total vendido no dia</strong></p>

      <h2 style="color:#713b28 !important;">
        ${formatarDinheiro(resumo.totalCobrado)}
      </h2>
    </div>

    <h3>💳 Formas de pagamento</h3>

    <div class="pedido">
      <p>
        Dinheiro:
        <strong>${formatarDinheiro(resumo.dinheiro)}</strong>
      </p>

      <p>
        Pix:
        <strong>${formatarDinheiro(resumo.pix)}</strong>
      </p>

      <p>
        Débito:
        <strong>${formatarDinheiro(resumo.debito)}</strong>
      </p>

      <p>
        Crédito:
        <strong>${formatarDinheiro(resumo.credito)}</strong>
      </p>
    </div>

    <h3>📉 Taxas e resultado previsto</h3>

    <div class="pedido">
      <p>
        Taxas das operadoras:
        <strong>${formatarDinheiro(resumo.taxas)}</strong>
      </p>

      <p>
        Líquido previsto:
        <strong>${formatarDinheiro(resumo.liquido)}</strong>
      </p>
    </div>

    <hr>

    <h3>💵 Controle do dinheiro físico</h3>

    <div style="
      background:#713b28;
      color:white;
      padding:15px;
      border-radius:10px;
      margin:15px 0;
    ">
      <p style="color:white;">Dinheiro esperado na gaveta</p>

      <h2 style="color:white !important;">
        ${formatarDinheiro(resumo.saldoFisico)}
      </h2>
    </div>

    <div class="pedido">
      <p>
        Saldo inicial:
        <strong>${formatarDinheiro(caixaAtual.saldoInicial)}</strong>
      </p>

      <p>
        Vendas em dinheiro:
        <strong>${formatarDinheiro(resumo.dinheiro)}</strong>
      </p>

      <p>
        Entradas adicionais:
        <strong>${formatarDinheiro(resumo.entradas)}</strong>
      </p>

      <p>
        Retiradas:
        <strong>${formatarDinheiro(resumo.retiradas)}</strong>
      </p>
    </div>

    <hr>

    <h3>➕ Registrar entrada ou retirada</h3>

    <label>Valor</label>

    <input
      id="valorMovimentacao"
      type="number"
      min="0.01"
      step="0.01"
      placeholder="Ex.: 50.00"
    >

    <label>Descrição</label>

    <input
      id="descricaoMovimentacao"
      type="text"
      placeholder="Ex.: Reposição de dinheiro"
    >

    <button
      type="button"
      onclick="registrarMovimentacaoFinanceira('Entrada')"
    >
      Registrar entrada
    </button>

    <button
      type="button"
      class="botao-secundario"
      onclick="registrarMovimentacaoFinanceira('Retirada')"
    >
      Registrar retirada
    </button>

    <hr>

    <h3>📋 Movimentações do caixa</h3>

    ${historico || "<p>Nenhuma movimentação registrada.</p>"}

    <hr>

    <h3>🔒 Fechamento diário</h3>

    <p>
      Conte o dinheiro disponível na gaveta e informe abaixo.
    </p>

    <label>Dinheiro contado (R$)</label>

    <input
      id="valorContadoCaixa"
      type="number"
      min="0"
      step="0.01"
      placeholder="Ex.: 250.00"
    >

    <button
      type="button"
      onclick="fecharCaixaFinanceiro()"
      style="background:#28743a;"
    >
      Fechar caixa do dia
    </button>

    <hr>

    <h3>📚 Histórico de caixas anteriores</h3>

    ${historicoCaixas}
  `;
}


// ======================================================
// FIM DA PARTE 4
// ======================================================






// ======================================================
// CARAMELL - MODO DE TESTES E MODO OFICIAL
// PARTE 1 - SEPARAÇÃO E ARMAZENAMENTO
// ======================================================

let ambienteCaramell = "teste";

const CHAVE_AMBIENTE_CARAMELL = "caramell_ambiente";
const CHAVE_MIGRACAO_CARAMELL = "caramell_ambientes_migrados_v1";

function chavePedidosAmbiente() {
  return ambienteCaramell === "oficial"
    ? "caramell_pedidos_oficial"
    : "caramell_pedidos_teste";
}

function chaveCaixasAmbiente() {
  return ambienteCaramell === "oficial"
    ? "caramell_caixas_oficial_v1"
    : "caramell_caixas_teste_v1";
}

// ------------------------------------------------------
// PREPARAR OS DOIS AMBIENTES
// ------------------------------------------------------

function prepararAmbientesCaramell() {
  try {
    // Os dados antigos serão preservados no ambiente de testes.
    if (
      localStorage.getItem(CHAVE_MIGRACAO_CARAMELL) !== "sim"
    ) {
      const pedidosAntigos = localStorage.getItem("caramell_pedidos");
      const caixasAntigos = localStorage.getItem("caramell_caixas_v1");

      if (
        localStorage.getItem("caramell_pedidos_teste") === null
      ) {
        localStorage.setItem(
          "caramell_pedidos_teste",
          pedidosAntigos || "[]"
        );
      }

      if (
        localStorage.getItem("caramell_caixas_teste_v1") === null
      ) {
        localStorage.setItem(
          "caramell_caixas_teste_v1",
          caixasAntigos || "[]"
        );
      }

      localStorage.setItem(
        "caramell_pedidos_oficial",
        localStorage.getItem("caramell_pedidos_oficial") || "[]"
      );

      localStorage.setItem(
        "caramell_caixas_oficial_v1",
        localStorage.getItem("caramell_caixas_oficial_v1") || "[]"
      );

      localStorage.setItem(CHAVE_MIGRACAO_CARAMELL, "sim");
    }

    ambienteCaramell =
      localStorage.getItem(CHAVE_AMBIENTE_CARAMELL) || "teste";

    if (
      ambienteCaramell !== "teste" &&
      ambienteCaramell !== "oficial"
    ) {
      ambienteCaramell = "teste";
    }

    localStorage.setItem(
      CHAVE_AMBIENTE_CARAMELL,
      ambienteCaramell
    );

  } catch (erro) {
    ambienteCaramell = "teste";

    alert(
      "Não foi possível preparar os ambientes. " +
      "Os dados antigos foram preservados.\n" +
      erro.message
    );
  }
}

// ------------------------------------------------------
// SUBSTITUIR O SALVAMENTO DE PEDIDOS
// ------------------------------------------------------

salvarDados = function() {
  try {
    localStorage.setItem(
      chavePedidosAmbiente(),
      JSON.stringify(pedidos)
    );

    return true;

  } catch (erro) {
    alert("Erro ao salvar pedidos: " + erro.message);
    return false;
  }
};

// ------------------------------------------------------
// SUBSTITUIR O CARREGAMENTO DE PEDIDOS
// ------------------------------------------------------

carregarDados = function() {
  try {
    const dados = JSON.parse(
      localStorage.getItem(chavePedidosAmbiente()) || "[]"
    );

    pedidos = Array.isArray(dados) ? dados : [];

    pedidos.forEach(pedido => {
      if (!pedido.status) pedido.status = "Pendente";
      if (!pedido.statusProducao) pedido.statusProducao = "Recebido";
      if (!Array.isArray(pedido.itens)) pedido.itens = [];
      if (pedido.telefone === undefined) pedido.telefone = "";
      if (pedido.recebido === undefined) pedido.recebido = 0;
      if (pedido.troco === undefined) pedido.troco = 0;

      pedido.ambiente = pedido.ambiente || ambienteCaramell;
    });

  } catch (erro) {
    pedidos = [];
    alert("Erro ao carregar pedidos: " + erro.message);
  }
};

// ------------------------------------------------------
// SUBSTITUIR O SALVAMENTO DOS CAIXAS
// ------------------------------------------------------

salvarCaixas = function() {
  try {
    localStorage.setItem(
      chaveCaixasAmbiente(),
      JSON.stringify(caixasCaramell)
    );

    return true;

  } catch (erro) {
    alert("Erro ao salvar o caixa: " + erro.message);
    return false;
  }
};

// ------------------------------------------------------
// SUBSTITUIR O CARREGAMENTO DOS CAIXAS
// ------------------------------------------------------

carregarCaixas = function() {
  try {
    const dados = JSON.parse(
      localStorage.getItem(chaveCaixasAmbiente()) || "[]"
    );

    caixasCaramell = Array.isArray(dados) ? dados : [];

    caixaAtual = caixasCaramell.find(
      caixa => caixa.status === "Aberto"
    ) || null;

  } catch (erro) {
    caixasCaramell = [];
    caixaAtual = null;

    alert("Erro ao carregar os dados financeiros: " + erro.message);
  }
};

// ======================================================
// FIM DA PARTE 1 - AMBIENTES
//======================================================




// ======================================================
// CARAMELL - MODO DE TESTES E MODO OFICIAL
// PARTE 2 - IDENTIFICAÇÃO E TROCA DE AMBIENTE
// ======================================================

// ------------------------------------------------------
// NOME DO AMBIENTE ATUAL
// ------------------------------------------------------

function nomeAmbienteCaramell() {
  return ambienteCaramell === "oficial"
    ? "MODO OFICIAL"
    : "MODO DE TESTES";
}

// ------------------------------------------------------
// CONTROLES VISUAIS DOS AMBIENTES
// ------------------------------------------------------

function instalarControlesAmbiente() {
  const painel = document.getElementById("painelFinanceiro");

  if (!painel) return;

  const existente = document.getElementById(
    "controlesAmbienteCaramell"
  );

  if (existente) existente.remove();

  const controles = document.createElement("div");

  controles.id = "controlesAmbienteCaramell";

  controles.style.cssText = `
    padding: 14px;
    margin-bottom: 16px;
    border: 2px solid #713b28;
    border-radius: 12px;
    background: #fff8f1;
    color: #542b20;
  `;

  const titulo = document.createElement("h3");

  titulo.textContent = nomeAmbienteCaramell();

  titulo.style.cssText = `
    margin: 0 0 10px;
    font-size: 18px;
    font-weight: bold;
  `;

  const descricao = document.createElement("p");

  descricao.textContent =
    ambienteCaramell === "teste"
      ? "Os pedidos e movimentações deste ambiente são apenas testes."
      : "Você está no ambiente oficial. Os registros ficam separados dos testes.";

  descricao.style.cssText = `
    margin: 0 0 12px;
    font-size: 13px;
  `;

  const botao = document.createElement("button");

  botao.type = "button";

  botao.textContent =
    ambienteCaramell === "teste"
      ? "Entrar no Modo Oficial"
      : "Voltar ao Modo de Testes";

  botao.style.cssText = `
    width: 100%;
    padding: 12px;
    border: none;
    border-radius: 8px;
    background: #713b28;
    color: white;
    font-weight: bold;
    font-size: 14px;
    cursor: pointer;
  `;

  botao.onclick = alternarAmbienteCaramell;

  controles.appendChild(titulo);
  controles.appendChild(descricao);
  controles.appendChild(botao);

  painel.insertBefore(controles, painel.firstChild);
}

// ------------------------------------------------------
// ALTERNAR ENTRE TESTES E OFICIAL
// ------------------------------------------------------

function alternarAmbienteCaramell() {

  // Não permitir troca com caixa aberto.
  if (caixaAtual && caixaAtual.status === "Aberto") {
    alert(
      "Para trocar de ambiente, primeiro feche o caixa atual."
    );
    return;
  }

  // Não permitir troca com produtos no carrinho.
  if (carrinho.length > 0) {
    alert(
      "Existe um pedido em andamento no carrinho.\n\n" +
      "Finalize ou limpe o carrinho antes de trocar de ambiente."
    );
    return;
  }

  const novoAmbiente =
    ambienteCaramell === "teste"
      ? "oficial"
      : "teste";

  const nomeNovo =
    novoAmbiente === "oficial"
      ? "MODO OFICIAL"
      : "MODO DE TESTES";

  const confirmou = confirm(
    "Você está no " + nomeAmbienteCaramell() + ".\n\n" +
    "Deseja realmente trocar para " + nomeNovo + "?\n\n" +
    "Os pedidos e dados financeiros permanecerão separados."
  );

  if (!confirmou) return;

  try {
    ambienteCaramell = novoAmbiente;

    localStorage.setItem(
      CHAVE_AMBIENTE_CARAMELL,
      ambienteCaramell
    );

    // Carregar somente os pedidos do novo ambiente.
    carregarDados();

    // Carregar somente o caixa do novo ambiente.
    carregarCaixas();

    // Atualizar as telas.
    atualizarTela();
    atualizarHistorico();
    atualizarCaixa();
    atualizarPainelFinanceiro();

    alert("Ambiente alterado para " + nomeNovo + ".");

  } catch (erro) {
    alert(
      "Não foi possível trocar de ambiente.\n" +
      erro.message
    );
  }
}

// ------------------------------------------------------
// ATUALIZAR OS CONTROLES SEM ALTERAR O FINANCEIRO
// ------------------------------------------------------

const atualizarPainelFinanceiroAmbienteOriginal =
  atualizarPainelFinanceiro;

atualizarPainelFinanceiro = function() {

  atualizarPainelFinanceiroAmbienteOriginal();

  instalarControlesAmbiente();
};

// ======================================================
// FIM DA PARTE 2 - TROCA DE AMBIENTE
// ======================================================


// ======================================================
// CARAMELL - MODO DE TESTES E MODO OFICIAL
// PARTE 3 - BACKUP E LIMPEZA DOS TESTES
// ======================================================

// ------------------------------------------------------
// EXPORTAR BACKUP DOS DADOS DE TESTE
// ------------------------------------------------------

function exportarBackupTestesCaramell() {

  try {
    const pedidosTeste = JSON.parse(
      localStorage.getItem("caramell_pedidos_teste") || "[]"
    );

    const caixasTeste = JSON.parse(
      localStorage.getItem("caramell_caixas_teste_v1") || "[]"
    );

    const backup = {
      sistema: "Caramell Pedidos",
      tipo: "Backup dos dados de teste",
      ambiente: "teste",
      criadoEm: new Date().toISOString(),
      pedidos: pedidosTeste,
      caixas: caixasTeste
    };

    const conteudo = JSON.stringify(backup, null, 2);

    const nomeArquivo =
      "backup-caramell-testes-" +
      new Date().toISOString().replace(/[:.]/g, "-") +
      ".json";

    // Criar arquivo para download.
    const arquivo = new Blob(
      [conteudo],
      { type: "application/json" }
    );

    const endereco = URL.createObjectURL(arquivo);

    const link = document.createElement("a");

    link.href = endereco;
    link.download = nomeArquivo;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Guardar também uma cópia no armazenamento local.
    const chaveBackup =
      "caramell_backup_testes_" + Date.now();

    localStorage.setItem(chaveBackup, conteudo);

    URL.revokeObjectURL(endereco);

    alert(
      "Backup dos testes criado!\n\n" +
      "Arquivo: " + nomeArquivo + "\n\n" +
      "Também foi guardada uma cópia no armazenamento do aplicativo."
    );

    return true;

  } catch (erro) {

    alert(
      "Não foi possível criar o backup.\n\n" +
      "Nenhum dado de teste foi apagado.\n\n" +
      erro.message
    );

    return false;
  }
}

// ------------------------------------------------------
// VERIFICAR SE EXISTE CAIXA DE TESTE ABERTO
// ------------------------------------------------------

function existeCaixaTesteAberto() {

  try {
    const caixas = JSON.parse(
      localStorage.getItem("caramell_caixas_teste_v1") || "[]"
    );

    return Array.isArray(caixas) &&
      caixas.some(caixa => caixa.status === "Aberto");

  } catch (erro) {
    alert("Não foi possível verificar os caixas de teste.");
    return true;
  }
}

// ------------------------------------------------------
// LIMPAR SOMENTE OS DADOS DO MODO DE TESTES
// ------------------------------------------------------

function limparDadosTesteCaramell() {

  if (existeCaixaTesteAberto()) {
    alert(
      "Existe um caixa de teste aberto.\n\n" +
      "Feche o caixa antes de limpar os dados."
    );
    return;
  }

  const primeiraConfirmacao = confirm(
    "ATENÇÃO!\n\n" +
    "Você está prestes a apagar os pedidos e caixas do MODO DE TESTES.\n\n" +
    "Antes disso, será criado um backup.\n\n" +
    "Os dados do MODO OFICIAL NÃO serão apagados.\n\n" +
    "Deseja continuar?"
  );

  if (!primeiraConfirmacao) return;

  // Criar o backup antes de apagar.
  const backupCriado = exportarBackupTestesCaramell();

  if (!backupCriado) {
    alert(
      "A limpeza foi cancelada porque o backup não foi concluído."
    );
    return;
  }

  const segundaConfirmacao = confirm(
    "CONFIRMAÇÃO FINAL\n\n" +
    "Deseja realmente apagar todos os pedidos e movimentações de teste?\n\n" +
    "O backup já foi criado."
  );

  if (!segundaConfirmacao) {
    alert(
      "Limpeza cancelada. Seus dados de teste foram preservados."
    );
    return;
  }

  try {

    // Remover exclusivamente as chaves de teste.
    localStorage.removeItem("caramell_pedidos_teste");
    localStorage.removeItem("caramell_caixas_teste_v1");

    // Se estiver no ambiente de testes, atualizar a memória.
    if (ambienteCaramell === "teste") {

      pedidos = [];
      caixasCaramell = [];
      caixaAtual = null;

      atualizarTela();
      atualizarHistorico();
      atualizarCaixa();
      atualizarPainelFinanceiro();
    }

    alert(
      "Dados de teste apagados com sucesso!\n\n" +
      "O backup foi preservado.\n\n" +
      "Os dados do MODO OFICIAL não foram alterados."
    );

  } catch (erro) {

    alert(
      "Ocorreu um erro durante a limpeza.\n" +
      erro.message
    );
  }
}

// ======================================================
// FIM DA PARTE 3 - BACKUP E LIMPEZA
// ======================================================


// ======================================================
// CARAMELL - MODO DE TESTES E MODO OFICIAL
// PARTE 4 - INTEGRAÇÃO FINAL
// ======================================================

// ------------------------------------------------------
// BOTÕES DE BACKUP E LIMPEZA
// ------------------------------------------------------

function instalarBotoesTesteCaramell() {

  const painel = document.getElementById("painelFinanceiro");

  if (!painel) return;

  const existente = document.getElementById(
    "acoesTesteCaramell"
  );

  if (existente) existente.remove();

  // Os controles de limpeza aparecem somente no modo de testes.
  if (ambienteCaramell !== "teste") return;

  const area = document.createElement("div");

  area.id = "acoesTesteCaramell";

  area.style.cssText = `
    margin-top: 18px;
    padding: 14px;
    border: 1px solid #d6b69f;
    border-radius: 10px;
    background: #fff8f1;
  `;

  const titulo = document.createElement("h3");

  titulo.textContent = "GERENCIAMENTO DOS TESTES";

  titulo.style.cssText = `
    margin: 0 0 8px;
    color: #542b20;
    font-size: 16px;
  `;

  const descricao = document.createElement("p");

  descricao.textContent =
    "Faça uma cópia de segurança antes de limpar os registros fictícios.";

  descricao.style.cssText = `
    margin: 0 0 12px;
    font-size: 13px;
    color: #542b20;
  `;

  const botaoBackup = document.createElement("button");

  botaoBackup.type = "button";
  botaoBackup.textContent = "Exportar backup dos testes";

  botaoBackup.style.cssText = `
    display: block;
    width: 100%;
    padding: 12px;
    margin-bottom: 10px;
    border: none;
    border-radius: 8px;
    background: #713b28;
    color: white;
    font-weight: bold;
    cursor: pointer;
  `;

  botaoBackup.onclick = exportarBackupTestesCaramell;

  const botaoLimpar = document.createElement("button");

  botaoLimpar.type = "button";
  botaoLimpar.textContent = "Limpar dados de teste";

  botaoLimpar.style.cssText = `
    display: block;
    width: 100%;
    padding: 12px;
    border: 1px solid #a33;
    border-radius: 8px;
    background: #fff;
    color: #a33;
    font-weight: bold;
    cursor: pointer;
  `;

  botaoLimpar.onclick = limparDadosTesteCaramell;

  area.appendChild(titulo);
  area.appendChild(descricao);
  area.appendChild(botaoBackup);
  area.appendChild(botaoLimpar);

  painel.appendChild(area);
}

// ------------------------------------------------------
// INTEGRAR OS BOTÕES AO PAINEL FINANCEIRO
// ------------------------------------------------------

const atualizarPainelFinanceiroComAmbiente =
  atualizarPainelFinanceiro;

atualizarPainelFinanceiro = function() {

  atualizarPainelFinanceiroComAmbiente();

  instalarControlesAmbiente();
  instalarBotoesTesteCaramell();
};

// ------------------------------------------------------
// PREPARAR O AMBIENTE ANTES DE USAR OS DADOS
// ------------------------------------------------------

function inicializarAmbientesCaramell() {

  prepararAmbientesCaramell();

  // Carregar somente os pedidos do ambiente selecionado.
  carregarDados();

  // Carregar somente os caixas do ambiente selecionado.
  carregarCaixas();

  // Atualizar as telas com os dados corretos.
  atualizarTela();
  atualizarHistorico();
  atualizarCaixa();

  if (document.getElementById("painelFinanceiro")) {
    atualizarPainelFinanceiro();
  }

  console.log(
    "Caramell iniciado em: " + nomeAmbienteCaramell()
  );
}

// Executar a preparação final dos ambientes.
inicializarAmbientesCaramell();

// ======================================================
// FIM DA PARTE 4
// MODO DE TESTES E MODO OFICIAL
// ======================================================



  
