
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
}

function sairCaixa() {
  document.getElementById("caixa").hidden = true;
  document.getElementById("login").hidden = false;
}

function sair() {
  if (carrinho.length > 0 &&
      !confirm("Deseja sair e perder o pedido atual?")) {
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
    (total, item) => total + item.preco * item.quantidade,
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

  const cliente = document.getElementById("cliente").value.trim();
  const telefone = document.getElementById("telefone").value.trim();

  const maiorNumero = pedidos.reduce(
    (maior, pedido) => Math.max(maior, Number(pedido.numero) || 0),
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

function salvarDados() {
  localStorage.setItem(CHAVE_PEDIDOS, JSON.stringify(pedidos));
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

function atualizarHistorico() {
  const area = document.getElementById("pedidos");
  if (!area) return;

  if (pedidos.length === 0) {
    area.innerHTML = "<p>Nenhum pedido registrado ainda.</p>";
    return;
  }

  area.innerHTML = pedidos.slice().reverse().map(pedido => `
    <div class="pedido">
      <strong>Pedido nº ${pedido.numero}</strong><br>
      Cliente: ${escapar(pedido.cliente)}<br>
      Atendente: ${escapar(pedido.atendente)}<br>
      Data: ${escapar(pedido.data)}<br>
      Total: <strong>${formatarDinheiro(pedido.total)}</strong><br>
      Pagamento: ${escapar(pedido.status)}<br>
      Produção: ${escapar(pedido.statusProducao)}
    </div>
  `).join("");
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

    if (pedido.statusProducao === "Recebido") {
      producao = `
        <p><strong>Produção:</strong> Pedido recebido</p>
        <button onclick="iniciarPreparo(${numeroReal})">
          Iniciar preparo
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
    } else if (pedido.statusProducao === "Pronto") {
      producao = `
        <p><strong>Produção:</strong> Pedido pronto</p>
        <p>Tempo de preparo: ${
          pedido.inicioPreparoEm && pedido.prontoEm
            ? formatarDuracaoFinal(
                pedido.inicioPreparoEm,
                pedido.prontoEm
              )
            : "Não registrado"
        }</p>
        <button onclick="abrirWhatsApp(${numeroReal}, 'pronto')">
          Avisar cliente: pedido pronto
        </button>
        <button onclick="marcarEntregue(${numeroReal})">
          Marcar como entregue
        </button>
      `;
    } else {
      producao = `
        <p><strong>Produção:</strong> Entregue</p>
        <p>Entrega registrada: ${escapar(pedido.entregueEm || "")}</p>
      `;
    }

    let mensagemRecebido = "";
    if (pedido.statusProducao === "Recebido") {
      mensagemRecebido = `
        <button onclick="abrirWhatsApp(${numeroReal}, 'recebido')">
          Enviar mensagem de recebimento
        </button>
      `;
    }

    let mensagemPreparo = "";
    if (pedido.statusProducao === "Em preparo") {
      mensagemPreparo = `
        <button onclick="abrirWhatsApp(${numeroReal}, 'preparo')">
          Avisar: pedido em preparo
        </button>
      `;
    }

    return `
      <div class="pedido">
        <h3>Pedido nº ${pedido.numero}</h3>
        <p><strong>Cliente:</strong> ${escapar(pedido.cliente)}</p>
        <p><strong>WhatsApp:</strong> ${escapar(pedido.telefone || "Não informado")}</p>
        <p><strong>Atendente:</strong> ${escapar(pedido.atendente)}</p>
        ${itens}
        <h3>Total: ${formatarDinheiro(pedido.total)}</h3>

        <hr>
        <h3>Acompanhamento da produção</h3>
        ${producao}
        ${mensagemRecebido}
        ${mensagemPreparo}

        <hr>
        <h3>Pagamento</h3>
        <p><strong>Status:</strong> ${escapar(pedido.status)}</p>
        ${pagamento}
      </div>
    `;
  }).join("");
}

function formatarDuracaoFinal(inicio, fim) {
  const segundos = Math.max(
    0,
    Math.floor((new Date(fim).getTime() - new Date(inicio).getTime()) / 1000)
  );

  const minutos = Math.floor(segundos / 60);
  const resto = segundos % 60;

  return minutos + " min " + resto + " s";
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
  pedido.entregueEm = new Date().toLocaleString("pt-BR");

  salvarDados();
  atualizarCaixa();
  atualizarHistorico();
}

function carregarMensagens() {
  try {
    const salvas = JSON.parse(localStorage.getItem(CHAVE_MENSAGENS));
    if (salvas) {
      mensagens = { ...mensagensPadrao, ...salvas };
    }
  } catch (erro) {
    mensagens = { ...mensagensPadrao };
  }
}

function carregarCamposMensagens() {
  carregarMensagens();

  document.getElementById("mensagemRecebido").value = mensagens.recebido;
  document.getElementById("mensagemPreparo").value = mensagens.preparo;
  document.getElementById("mensagemPronto").value = mensagens.pronto;
}

function salvarMensagens() {
  mensagens = {
    recebido: document.getElementById("mensagemRecebido").value.trim(),
    preparo: document.getElementById("mensagemPreparo").value.trim(),
    pronto: document.getElementById("mensagemPronto").value.trim()
  };

  if (!mensagens.recebido || !mensagens.preparo || !mensagens.pronto) {
    alert("Preencha as três mensagens antes de salvar.");
    return;
  }

  localStorage.setItem(CHAVE_MENSAGENS, JSON.stringify(mensagens));

  document.getElementById("avisoMensagens").textContent =
    "Mensagens salvas com sucesso!";
}


function normalizarWhatsApp(numero) {
  let telefone = String(numero || "").replace(/\D/g, "");

  // Remove o código do Brasil para validar o número nacional
  if (telefone.startsWith("55") &&
      (telefone.length === 12 || telefone.length === 13)) {
    telefone = telefone.substring(2);
  }

  // DDD + telefone: 10 ou 11 dígitos
  if (telefone.length !== 10 && telefone.length !== 11) {
    return "";
  }

  const ddd = Number(telefone.substring(0, 2));

  if (ddd < 11 || ddd > 99) {
    return "";
  }

  return "55" + telefone;
}

function abrirWhatsApp(indice, etapa) {
  const pedido = pedidos[indice];
  if (!pedido) return;

  let telefone = normalizarWhatsApp(pedido.telefone);

  // Se não houver telefone cadastrado, solicita o número do cliente
  if (!telefone) {
    const informado = prompt(
      "Digite o WhatsApp DO CLIENTE com DDD.\n" +
      "Exemplo: 73999999999"
    );

    if (!informado) {
      alert("Envio cancelado. Nenhum telefone foi informado.");
      return;
    }

    telefone = normalizarWhatsApp(informado);

    if (!telefone) {
      alert("Número inválido. Confira o DDD e o telefone do cliente.");
      return;
    }

    pedido.telefone = informado;
    salvarDados();
  }

  const textos = {
    recebido: mensagens.recebido,
    preparo: mensagens.preparo,
    pronto: mensagens.pronto
  };

  let texto = textos[etapa];

  if (!texto) {
    alert("Mensagem não encontrada.");
    return;
  }

  texto = texto
    .replaceAll("{cliente}", pedido.cliente || "cliente")
    .replaceAll("{pedido}", pedido.numero);

  const url = "https://wa.me/" + telefone +
    "?text=" + encodeURIComponent(texto);

  window.open(url, "_blank");
}


function finalizarPedido(indice) {
  const pedido = pedidos[indice];
  if (!pedido || pedido.status !== "Pendente") return;

  const forma = document.getElementById(
    "pagamento-" + indice
  ).value;

  let recebido = pedido.total;
  let troco = 0;

  if (forma === "Dinheiro") {
    const campo = document.getElementById("recebido-" + indice);
    recebido = Number(campo.value);

    if (!campo.value || !Number.isFinite(recebido)) {
      alert("Informe o valor recebido.");
      campo.focus();
      return;
    }

    if (recebido < pedido.total) {
      alert("O valor recebido é menor que o total do pedido.");
      campo.focus();
      return;
    }

    troco = recebido - pedido.total;
  }

  pedido.status = "Pago";
  pedido.pagamento = forma;
  pedido.recebido = recebido;
  pedido.troco = troco;

  salvarDados();
  atualizarCaixa();
  atualizarHistorico();

  alert(
    "Pagamento confirmado!\nForma: " + forma +
    "\nTroco: " + formatarDinheiro(troco)
  );
}

carregarDados();
carregarMensagens();
atualizarTela();

window.salvarMensagens = function () {
    const recebido = document.getElementById("mensagemRecebido");
    const preparo = document.getElementById("mensagemPreparo");
    const pronto = document.getElementById("mensagemPronto");
    const aviso = document.getElementById("avisoMensagens");

    if (!recebido || !preparo || !pronto) {
        alert("Não foi possível localizar os campos das mensagens.");
        return;
    }

    const novasMensagens = {
        recebido: recebido.value,
        preparo: preparo.value,
        pronto: pronto.value
    };

    try {
        localStorage.setItem(
            "caramell_mensagens",
            JSON.stringify(novasMensagens)
        );

        mensagens = novasMensagens;

        if (aviso) {
            aviso.textContent = "Mensagens salvas com sucesso!";
        }

        alert("Mensagens salvas com sucesso!");
    } catch (erro) {
        alert("Erro ao salvar as mensagens. Tente novamente.");
    }
};
