# Casa da Qualidade (QFD)

Editor online da **Casa da Qualidade**, a matriz central do **QFD (Desdobramento da Função Qualidade)**. Você monta o modelo no navegador, os cálculos são refeitos na hora e o resultado sai em PDF pronto para entregar.

![Tela do editor com o exemplo da garrafa térmica](docs/screenshot.png)

## O que dá para fazer

- **Requisitos do cliente** (o que o cliente deseja): adicionar, excluir, reordenar e dar a importância de cada um.
- **Características técnicas** (como atender): adicionar, excluir, reordenar e definir o sentido de melhoria (▲ maximizar, ▼ minimizar, ◆ valor-alvo).
- **Matriz de relacionamentos**: toque na célula da casa para alternar entre vazio → ◎ forte → ○ média → △ fraca.
- **Telhado (matriz de correlação)**: toque no losango para alternar entre ++ → + → − → −−.
- **Benchmarking competitivo**: quantos concorrentes quiser, com notas editáveis no painel ou direto na casa.
- **Escalas configuráveis**: pesos forte/média/fraca (padrão 9, 3 e 1), importância máxima e nota máxima do benchmarking.
- **Cálculos automáticos**: percentual de importância dos requisitos, importância absoluta e percentual de cada característica, ranking e pontuação ponderada dos concorrentes.
- **Análise automática**: pontos fortes e fracos de cada concorrente, melhor concorrente por requisito, lacunas de mercado, características prioritárias com justificativa e conflitos de projeto apontados pelo telhado.
- **Comentários livres** para cada etapa, que entram no PDF.
- **PDF** em A4 (padrão), A3, Carta ou Ofício: a casa em uma página (paisagem ou retrato) e as etapas em páginas retrato.
- **Salvar e abrir modelos em JSON**, exportar a casa em **SVG**, desfazer e refazer.
- Funciona no celular, com tema claro e escuro. Os dados ficam salvos no próprio navegador.

## Como usar

1. Abra a página (GitHub Pages ou o arquivo `index.html`).
2. Clique em **Exemplo** para ver o exercício da garrafa térmica ou em **Novo** para começar do zero.
3. Preencha requisitos, características e concorrentes no painel da esquerda.
4. Toque nas células da casa para marcar relacionamentos, correlações, importâncias e notas. Clique com o botão direito (ou segure Shift) para voltar um passo.
5. Clique em **Gerar PDF**, escolha o papel e as partes e, na janela de impressão, selecione **Salvar como PDF**.

Atalhos: `Ctrl+Z` desfazer · `Ctrl+Shift+Z` refazer · `Ctrl+S` salvar JSON · `Ctrl+P` gerar PDF.

Um PDF de exemplo está em [`docs/exemplo-garrafa-termica-A4.pdf`](docs/exemplo-garrafa-termica-A4.pdf).

## Como os números são calculados

| Etapa | Fórmula |
|---|---|
| % de importância do requisito | importância ÷ soma das importâncias × 100 |
| Importância da característica | Σ (importância do requisito × peso do relacionamento) |
| % da característica | importância da característica ÷ soma de todas × 100 |
| Pontuação do concorrente | Σ (importância do requisito × nota do concorrente) |

Empates no ranking dividem a mesma posição (1º, 2º, 2º, 4º).

## Publicar no GitHub Pages

O projeto é estático, sem build e sem dependências.

1. Crie um repositório (por exemplo `casa-da-qualidade`) e envie estes arquivos.
2. Em **Settings → Pages**, escolha **Deploy from a branch**, branch `main`, pasta `/ (root)`.
3. Em alguns minutos a página fica em `https://SEU-USUARIO.github.io/casa-da-qualidade/`.

Para rodar localmente, basta abrir `index.html` no navegador.

## Estrutura

```
index.html            página principal
css/style.css         visual da tela (tema claro e escuro)
css/print.css         visual do PDF
js/state.js           modelo de dados, exemplo, validação e salvamento
js/calc.js            cálculos do QFD
js/house.js           desenho da casa em SVG
js/analysis.js        textos e tabelas das etapas 1 a 9
js/editor.js          painel de edição
js/print.js           montagem das páginas do PDF
js/app.js             eventos, histórico, arquivos e janelas
examples/             modelos em JSON prontos para abrir
docs/                 captura de tela e PDF de exemplo
```

## Formato do JSON

```json
{
  "meta": { "title": "...", "subtitle": "...", "author": "..." },
  "scale": { "s": 9, "m": 3, "w": 1, "impMax": 5, "benchMax": 5 },
  "settings": { "topN": 3 },
  "reqs":  [{ "id": "r1", "name": "Manter a bebida quente", "imp": 5 }],
  "chars": [{ "id": "c1", "name": "Isolamento térmico", "dir": "up" }],
  "comps": [{ "id": "pa", "name": "Produto A" }],
  "rel":   { "r1": { "c1": "s" } },
  "corr":  { "c1|c6": "++" },
  "bench": { "r1": { "pa": 5 } },
  "notes": { "rel": "", "corr": "", "bench": "", "prio": "" }
}
```

`rel` usa `s` (forte), `m` (média) e `w` (fraca). `corr` usa `++`, `+`, `-` e `--`. `dir` aceita `up`, `down`, `target` e `none`.

## Licença

[MIT](LICENSE) © Eduardo Henrique Zuffo
