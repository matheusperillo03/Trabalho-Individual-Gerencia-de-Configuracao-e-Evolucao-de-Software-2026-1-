# Trabalho Individual - Gerência de Configuração e Evolução de Software (2026-1)

Os conhecimentos de Gerência de Configuração e Evolução de Software (GCES) são fundamentais no ciclo de vida de um produto de software moderno. Este trabalho tem como objetivo exercitar os conceitos de automação, isolamento de ambiente, testes, segurança (DevSecOps) e deploy contínuo.

A aplicação base é o **mk.js**, um jogo de luta implementado com Backend em Node.js/Express e Frontend em HTML5 Canvas/JavaScript. O projeto original é considerado *deprecated* e possui dependências antigas; parte do desafio é modernizar o ambiente para que ele execute com versões estáveis atuais.

## Requisitos do Projeto

O trabalho está dividido em 10 etapas, cada uma valendo **1,0 ponto**. O foco é a implementação técnica aliada à correta documentação e histórico de commits.

### Critérios de Avaliação (10 Fases)

| Fase | Descrição Técnica | Nota por etapa |
|---|---|---|
| 1. **Containerização (DEV)** | Elaboração de `Dockerfile` para ambiente de desenvolvimento com suporte a hot-reload (mudanças no código refletidas imediatamente no container). | 0-10% |
| 2. **Docker Compose (DEV)** | Configuração de um `docker-compose.yml` que integre a aplicação e um banco de dados **Postgres**. Você deve implementar uma camada simples de persistência no código (ex: salvar histórico de lutas ou nomes de jogadores). | 10% - 20% |
| 3. **CI - Build & Lint** | Automação das etapas de Build e Lint (Front e Back) via GitHub Actions. O pipeline deve falhar se o lint encontrar erros. | 20% - 30% |
| 4. **CI - Testes Unitários** | Implementação de testes unitários funcionais. **Obrigatório:** Commits sequenciais demonstrando o teste quebrando no CI e, em seguida, passando após correção. | 30% - 40% |
| 5. **CI - Testes de Fuzzing** | Implementação de testes de Fuzzing para validar a resiliência das entradas do servidor (Back-end) contra dados inesperados. | 40% - 50% |
| 6. **Segurança - SAST & SCA** | Integração de ferramentas de análise estática de segurança (SAST) e verificação de vulnerabilidades em dependências (SCA - ex: Snyk ou npm audit). | 50% - 60% |
| 7. **Qualidade de Código** | Integração completa com o **SonarCloud** no pipeline de CI, garantindo métricas de qualidade e cobertura mínima. | 60% - 70% |
| 8. **Containerização (PROD)** | Elaboração de `Dockerfiles` otimizados para produção (multi-stage build, baseados em Alpine) e configuração do **Nginx** como servidor de arquivos estáticos. | 70% - 80% |
| 9. **Infraestrutura (K8s & Terraform)** | Criação de manifestos de **Kubernetes (K8s)** para orquestração da aplicação. Opcionalmente, utilize **Terraform** para provisionar a infraestrutura necessária. | 80% - 90% |
| 10. **CD & Segurança de Rede** | Deploy Contínuo com publicação de imagens e configuração de **HTTPS via Cert Manager**. O Nginx deve redirecionar porta 80 para 443 e não expor outras portas para fora da rede de containers. | 90% - 100% |

## Orientações Gerais

*   **Repositório:** O trabalho deve ser desenvolvido em um repositório pessoal no GitHub.
*   **Commits:** Devem ser atômicos e espaçados no tempo. Commits realizados todos juntos na data de entrega serão penalizados.
*   **Modernização:** É responsabilidade do aluno atualizar o `package.json` e as dependências do servidor para garantir compatibilidade com as versões mais recentes do Node.js.
*   **Documentação:** O `README.md` final deve conter o passo a passo de como subir o ambiente de desenvolvimento e como visualizar o ambiente de produção.

---

## Ambiente de Desenvolvimento

### Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado e em execução

### Subindo o ambiente

```bash
# Clone o repositório
git clone https://github.com/matheusperillo03/Trabalho-Individual-Gerencia-de-Configuracao-e-Evolucao-de-Software-2026-1-.git
cd Trabalho-Individual-Gerencia-de-Configuracao-e-Evolucao-de-Software-2026-1-

# Suba os containers (backend com hot-reload + Postgres)
docker compose up
```

O backend estará disponível em **http://localhost:3000**.

Qualquer alteração nos arquivos de `server/` é refletida automaticamente no container sem precisar reiniciá-lo (hot-reload via nodemon).

### Rodando os testes localmente

```bash
cd server
npm ci
npm test              # testes unitários e fuzzing
npm run lint          # lint
npm run test:coverage # cobertura de código
```

---

## Ambiente de Produção

### Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) com **Kubernetes habilitado** (Settings → Kubernetes → Enable Kubernetes)
- `kubectl` disponível no terminal (incluído no Docker Desktop)

### 1. Instalar nginx-ingress e cert-manager no cluster

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.10.1/deploy/static/provider/cloud/deploy.yaml

kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.14.5/cert-manager.yaml

# Aguardar os pods ficarem prontos
kubectl wait --namespace ingress-nginx --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller --timeout=120s

kubectl wait --namespace cert-manager --for=condition=ready pod \
  --selector=app.kubernetes.io/instance=cert-manager --timeout=120s
```

### 2. Aplicar os manifestos da aplicação

```bash
# Namespace, ConfigMap e ClusterIssuer
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/cert-manager/

# Secret com as credenciais (substitua os valores)
kubectl create secret generic mkjs-secret \
  --from-literal=POSTGRES_PASSWORD=<senha> \
  --from-literal=DATABASE_URL=postgresql://mkjs:<senha>@postgres:5432/mkjs \
  -n mkjs

# Secret para pull de imagens do GHCR
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=<seu-usuario-github> \
  --docker-password=<seu-token-github> \
  -n mkjs

# Restante dos manifestos (deployments, services, ingress, PVC)
kubectl apply -f k8s/
```

### 3. Acessar a aplicação

Aguarde todos os pods ficarem prontos:

```bash
kubectl get pods -n mkjs
```

Quando todos estiverem `Running`, acesse no navegador:

```
https://mkjs.127.0.0.1.nip.io
```

> O navegador exibirá um aviso de certificado (self-signed). Clique em **Avançado → Continuar** para prosseguir. O redirecionamento HTTP → HTTPS é feito automaticamente.

### Pipeline de CD (deploy automático)

Todo push na branch `main` que passe no CI dispara o pipeline de CD automaticamente:

1. **Build & Push** — imagens Docker publicadas no GHCR com tags `:latest` e `:<sha>`
2. **Deploy** — `kubectl apply` aplica os manifestos e `rollout restart` força o pull das novas imagens
3. **Verificação** — `kubectl rollout status` confirma que o deploy foi bem-sucedido

Para que o CD funcione, o repositório precisa dos seguintes secrets configurados em **Settings → Secrets and variables → Actions**:

| Secret | Descrição |
|--------|-----------|
| `POSTGRES_PASSWORD` | Senha do banco de dados |
| `DATABASE_URL` | String de conexão completa do Postgres |

E um **runner self-hosted** rodando na máquina com acesso ao cluster:

```bash
# Iniciar o runner (na pasta onde foi configurado)
cd ~/actions-runner && ./run.sh
```

---

## Notas Técnicas

### Fase 4 — Ciclo quebrado → passando no CI

O requisito da Fase 4 exige commits sequenciais demonstrando o teste quebrando no CI e depois passando após correção. Os commits relevantes são:

| Commit | Mensagem | Resultado no CI |
|--------|----------|-----------------|
| [`b37a21f`](../../commit/b37a21f) | `test: adicionar testes unitários para GameCollection e Game` | [❌ CI falha](../../actions/runs/26489388583) — bug em `createGame` retornava jogo errado |
| [`57d6b3e`](../../commit/57d6b3e) | `fix: corrigir verificação de jogo duplicado em GameCollection.createGame` | [✅ CI passa](../../actions/runs/26489488903) |

O bug estava em `games.js` linha 81: `this._games[game]` em vez de `this._games[id]`, fazendo `createGame` nunca detectar duplicatas corretamente.

### Fase 5 — Descoberta de segurança via Fuzzing

Os testes de fuzzing em `server/tests/games.fuzz.test.js` utilizam `fc.anything()` do fast-check, que gera entradas arbitrárias incluindo vetores de prototype pollution (`__proto__`, `constructor`, `toString`).

O fuzzing confirmou que `GameCollection` é imune a prototype pollution: o objeto `_games` é criado com `Object.create(null)` (`games.js`, linha 56), eliminando a cadeia de protótipo e impedindo que entradas maliciosas contaminem `Object.prototype`.

### Fase 10 — HTTPS local com nip.io e certificado self-signed

Em ambiente de produção real, o `ClusterIssuer` em `k8s/cert-manager/cluster-issuer.yaml` seria configurado com Let's Encrypt (ACME). Para ambiente local com Docker Desktop, não há domínio público registrado, tornando o desafio ACME inviável.

A solução adotada:
- **nip.io**: serviço DNS público que resolve `mkjs.127.0.0.1.nip.io` diretamente para `127.0.0.1`, dispensando configuração de `/etc/hosts`
- **Certificado self-signed**: emitido pelo cert-manager via `selfSigned: {}`, satisfazendo o requisito de HTTPS sem depender de infraestrutura externa

O nginx **não expõe a porta 443** — o TLS termina no nginx-ingress controller. O container nginx serve apenas HTTP interno (porta 80), e o redirecionamento 80→443 é feito pela annotation `nginx.ingress.kubernetes.io/ssl-redirect: "true"` no Ingress.

O pipeline de CD completo (build → push GHCR → deploy no cluster local) pode ser verificado no [histórico de execuções do GitHub Actions](../../actions/workflows/cd.yml). O runner self-hosted executa na (minha) máquina com acesso direto ao cluster Docker Desktop.

### Mutation Testing — por que e qual o score

Cobertura de linha (line coverage) é uma métrica enganosa: é possível atingir 100% de cobertura com testes que não verificam nada, basta chamar o código sem fazer nenhum `expect`. O problema é que esses testes passam mesmo quando o código está errado.

**Mutation testing** resolve isso invertendo a lógica: em vez de medir se o código foi executado pelos testes, ele mede se os testes são capazes de *detectar bugs*. A ferramenta ([Stryker](https://stryker-mutator.io/)) modifica automaticamente o código troca `>` por `>=`, remove condições, inverte booleanos e verifica se a suite de testes falha. Se um mutante "sobrevive" (os testes continuam passando com o código quebrado), os testes são fracos naquele ponto.

**Score obtido: 95.31%** — 61 de 64 mutantes eliminados.

Os 3 mutantes remanescentes estão nos blocos `catch` de `getGame` e `removeGame` em `games.js`. Esses blocos são código defensivo inalcançável, ou seja, acessar uma propriedade em um objeto JavaScript nunca lança exceção, então o caminho do `catch` nunca é executado. Não é um gap de testes, é código morto.

Para rodar localmente:

```bash
cd server
npm run test:mutation
```
