
let atendenteAtual = "";
let carrinho = [];
let pedidos = [];

const formatarDinheiro = valor =>
  valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });

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
  document.getElementById("sistema").hidden = false;

  atualizarTela();
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

  if (carrinho.length === 0) {
    area.innerHTML = "<p>Nenhum produto adicionado.</p>";
  } else {
    area.innerHTML = carrinho.map((item, indice) => `
      <div class="item">
        <div>
          <strong>${item.produto}</strong><br>
          ${item.sabor}<br>
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
    status: "Pendente"
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
      Cliente: ${pedido.cliente}<br>
      Atendente: ${pedido.atendente}<br>
      Data: ${pedido.data}<br>
      Total: <strong>${formatarDinheiro(pedido.total)}</strong><br>
      Situação: ${pedido.status}
    </div>
  `).join("");
}

carregarDados();
atualizarTela();
