
let atendenteAtual = "";
let carrinho = [];
let pedidos = [];

const formatarDinheiro = valor =>
  Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });

function escapar(texto) {
  return String(texto).replace(/[&<>"']/g, letra => ({
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

  atualizarCaixa();
}

function sairCaixa() {
  document.getElementById("caixa").hidden = true;
  document.getElementById("login").hidden = false;
}

function sair() {
  if (carrinho.length > 0) {
    if (!confirm("Deseja sair e perder o pedido atual?")) {
      return;
    }
  }

  atendenteAtual = "";
  carrinho = [];

  document.getElementById("atendente").value = "";
  document.getElementById("cliente").value = "";
  document.getElementById("sistema").hidden = true;
  document.getElementById("login").hidden = false;

  atualizarTela();
}

function adicionar(produto, preco) {
  const sabor = document.getElementById("sabor").value;

  const existente = carrinho.find(item =>
    item.produto === produto &&
    item.sabor === sabor
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

  const pedido = {
    numero: pedidos.length + 1,
    atendente: atendenteAtual,
    cliente: cliente || "Cliente não informado",
    itens: carrinho.map(item => ({ ...item })),
    total: calcularTotal(),
    data: new Date().toLocaleString("pt-BR"),
    status: "Pendente",
    pagamento: "",
    recebido: 0,
    troco: 0
  };

  pedidos.push(pedido);
  salvarDados();

  carrinho = [];
  document.getElementById("cliente").value = "";

  atualizarTela();

  alert(
    "Pedido nº " + pedido.numero +
    " registrado com sucesso!\n" +
    "Total: " + formatarDinheiro(pedido.total)
  );
}

function salvarDados() {
  localStorage.setItem(
    "caramell_pedidos",
    JSON.stringify(pedidos)
  );
}

function carregarDados() {
  try {
    pedidos = JSON.parse(
      localStorage.getItem("caramell_pedidos")
    ) || [];
  } catch (erro) {
    pedidos = [];
  }
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
      Situação: ${escapar(pedido.status)}
    </div>
  `).join("");
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

    const itens = pedido.itens.map(item => `
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

    return `
      <div class="pedido">
        <h3>Pedido nº ${pedido.numero}</h3>
        <p><strong>Cliente:</strong> ${escapar(pedido.cliente)}</p>
        <p><strong>Atendente:</strong> ${escapar(pedido.atendente)}</p>
        ${itens}
        <h3>Total: ${formatarDinheiro(pedido.total)}</h3>
        <p><strong>Status:</strong> ${escapar(pedido.status)}</p>
        ${pagamento}
      </div>
    `;
  }).join("");
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
    const campo = document.getElementById(
      "recebido-" + indice
    );

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
    "Pagamento confirmado!\n" +
    "Forma: " + forma + "\n" +
    "Troco: " + formatarDinheiro(troco)
  );
}

carregarDados();
atualizarTela();
