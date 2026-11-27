
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

      <button type="button" onclick="abrirCaixaFinanceiro()">
        Abrir caixa
      </button>

      <hr>

      <h3>📚 Histórico de caixas anteriores</h3>

      ${gerarHistoricoCaixas()}
    `;

    return;
  }

  const resumo = resumoFinanceiroCaixa(caixaAtual);

  const historico = (caixaAtual.movimentacoes || [])
    .slice()
    .reverse()
    .map(movimento => {
      const valor = movimento.tipo === "Venda"
        ? movimento.totalCobrado
        : movimento.valor;

      return `
        <div class="pedido">
          <strong>${escapar(movimento.tipo)}</strong>
          <p>${escapar(movimento.categoria || "")}</p>
          <p>${escapar(movimento.descricao || ("Pedido nº " + (movimento.pedidoNumero || "")))}</p>
          <p><strong>${formatarDinheiro(valor)}</strong></p>
          <small>${new Date(movimento.data).toLocaleString("pt-BR")}</small>
        </div>
      `;
    }).join("");

  area.innerHTML = `
    <h2 class="secao-titulo">💰 Financeiro da Caramell</h2>

    <h3>🟢 Caixa aberto</h3>

    <p><strong>Responsável:</strong> ${escapar(caixaAtual.responsavel)}</p>

    <p><strong>Abertura:</strong>
      ${new Date(caixaAtual.aberturaEm).toLocaleString("pt-BR")}
    </p>

    <p><strong>Saldo inicial:</strong>
      ${formatarDinheiro(caixaAtual.saldoInicial)}
    </p>

    <div style="background:#713b28;color:white;padding:15px;border-radius:10px;margin:15px 0;">
      <p>Dinheiro esperado na gaveta</p>
      <h2>${formatarDinheiro(resumo.saldoFisico)}</h2>
    </div>

    <h3>📊 Resumo das vendas</h3>

    <p>Produtos: ${formatarDinheiro(resumo.produtos)}</p>
    <p>Juros: ${formatarDinheiro(resumo.juros)}</p>
    <p>Total cobrado: <strong>${formatarDinheiro(resumo.totalCobrado)}</strong></p>
    <p>Taxas da operadora: ${formatarDinheiro(resumo.taxas)}</p>
    <p>Valor líquido previsto: <strong>${formatarDinheiro(resumo.liquido)}</strong></p>

    <hr>

    <h3>💳 Formas de pagamento</h3>

    <p>Dinheiro: ${formatarDinheiro(resumo.dinheiro)}</p>
    <p>Pix: ${formatarDinheiro(resumo.pix)}</p>
    <p>Débito: ${formatarDinheiro(resumo.debito)}</p>
    <p>Crédito: ${formatarDinheiro(resumo.credito)}</p>

    <hr>

    <h3>📋 Movimentações do caixa</h3>

    ${historico || "<p>Nenhuma movimentação registrada.</p>"}

    <hr>

    <h3>🔒 Fechamento diário</h3>

    <p>Conte o dinheiro disponível na gaveta e informe abaixo.</p>

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

    ${gerarHistoricoCaixas()}
  `;
}

// ======================================================
// FIM DA PARTE 4
// ======================================================
