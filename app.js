
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
      preco,
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
      total + item.preco * item.quantidade,
    0
  );
}


// ==========================================
// IMPRESSÃO DE COMANDAS - CARAMELL / RAWBT
// ==========================================



function gerarComanda(pedido) {
  const largura = 32;
  const linha = "-".repeat(largura);

  function centralizar(texto) {
    texto = String(texto);
    const espacos = Math.max(0, Math.floor((largura - texto.length) / 2));
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






async function imprimirPedido(pedido) {
  if (!pedido) {
    alert("Pedido não encontrado.");
    return;
  }

  try {
    const texto = gerarComanda(pedido);

    const base64 = btoa(
      unescape(encodeURIComponent(texto))
    );

    const url = "rawbt:base64," + base64;

    window.location.href = url;

  } catch (erro) {
    alert("Erro ao preparar impressão: " + erro.message);
  }
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

  document.getElementById("total").textContent =
    formatarDinheiro(calcularTotal());

  atualizarHistorico();
  atualizarCaixa();
}



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
    telefone: telefone,

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
  
function salvarDados() {
  localStorage.setItem(
    CHAVE_PEDIDOS,
    JSON.stringify(pedidos)
  );
}

function carregarDados() {
  try {
    pedidos = JSON.parse(
      localStorage.getItem(CHAVE_PEDIDOS)
    ) || [];
  } catch (erro) {
    pedidos = [];
  }

  pedidos.forEach(pedido => {
    if (!pedido.statusProducao) {
      pedido.statusProducao = "Recebido";
    }

    if (pedido.telefone === undefined) {
      pedido.telefone = "";
    }
  });
}





function formatarDuracao(inicio) {
  if (!inicio) return "Aguardando início";

  const segundos = Math.max(
    0,
    Math.floor((Date.now() - new Date(inicio).getTime()) / 1000)
  );

  const minutos = Math.floor(segundos / 60);
  const resto = segundos % 60;

  return minutos + " min " + resto + " s";
}

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
        ${item.quantidade}x ${escapar(item.produto)}
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

        <label>Valor recebido (para dinheiro)</label>

        <input
          id="recebido-${numeroReal}"
          type="number"
          min="0"
          step="0.01"
          placeholder="Ex.: 50,00"
        >

        <button onclick="finalizarPedido(${numeroReal})">
          Confirmar pagamento
        </button>
      `;
    } else {
      pagamento = `
        <p><strong>Pagamento:</strong> ${escapar(pedido.pagamento)}</p>
        <p><strong>Recebido:</strong> ${formatarDinheiro(pedido.recebido)}</p>
        <p><strong>Troco:</strong> ${formatarDinheiro(pedido.troco)}</p>
        <p>Pagamento confirmado.</p>
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

    <button onclick="iniciarPreparo(${numeroReal})">
      Iniciar preparo
    </button>
  `;


    

      mensagemRecebido = `
        <button onclick="abrirWhatsApp(${numeroReal}, 'recebido')">
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

        <button onclick="marcarPronto(${numeroReal})">
          Pedido pronto
        </button>
      `;

      mensagemPreparo = `
        <button onclick="abrirWhatsApp(${numeroReal}, 'preparo')">
          Avisar cliente: pedido em preparo
        </button>
      `;

    } else if (pedido.statusProducao === "Pronto") {
      producao = `
        <p><strong>Produção:</strong> Pedido pronto</p>

        <button onclick="marcarEntregue(${numeroReal})">
          Marcar como entregue
        </button>
      `;

      mensagemPronto = `
        <button onclick="abrirWhatsApp(${numeroReal}, 'pronto')">
          Avisar cliente: pedido pronto
        </button>
      `;

    } else {
      producao = `
        <p><strong>Produção:</strong> Entregue</p>
      `;
    }

    return `
      <div class="pedido">
        <h3>Pedido nº ${pedido.numero}</h3>

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

        <button onclick="salvarTelefonePedido(${numeroReal})">
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
      </div>
    `;
  }).join("");
}

function iniciarPreparo(indice) {
  const pedido = pedidos[indice];

  if (!pedido || pedido.statusProducao !== "Recebido") return;

  pedido.statusProducao = "Em preparo";
  pedido.inicioPreparoEm = new Date().toISOString();

  salvarDados();
  atualizarCaixa();
  atualizarHistorico();
}

function marcarPronto(indice) {
  const pedido = pedidos[indice];

  if (!pedido || pedido.statusProducao !== "Em preparo") return;

  pedido.statusProducao = "Pronto";
  pedido.prontoEm = new Date().toISOString();

  salvarDados();
  atualizarCaixa();
  atualizarHistorico();
}

function marcarEntregue(indice) {
  const pedido = pedidos[indice];

  if (!pedido || pedido.statusProducao !== "Pronto") return;

  pedido.statusProducao = "Entregue";
  pedido.entregueEm = new Date().toISOString();

  salvarDados();
  atualizarCaixa();
  atualizarHistorico();
}

function carregarMensagens() {
  try {
    const salvas = JSON.parse(
      localStorage.getItem(CHAVE_MENSAGENS)
    );

    mensagens = {
      ...mensagensPadrao,
      ...(salvas || {})
    };

  } catch (erro) {
    mensagens = { ...mensagensPadrao };
  }
}

function carregarCamposMensagens() {
  carregarMensagens();

  const recebido = document.getElementById("mensagemRecebido");
  const preparo = document.getElementById("mensagemPreparo");
  const pronto = document.getElementById("mensagemPronto");

  if (recebido) recebido.value = mensagens.recebido;
  if (preparo) preparo.value = mensagens.preparo;
  if (pronto) pronto.value = mensagens.pronto;
}

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

  if (!novasMensagens.recebido ||
      !novasMensagens.preparo ||
      !novasMensagens.pronto) {
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
    alert("Erro ao salvar as mensagens.");
  }
}

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

