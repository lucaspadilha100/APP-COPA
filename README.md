# Copa São Mateus Moreira ⚽🏐🏀🏊

App para acompanhar todos os jogos das modalidades em que a **Paróquia São Mateus Moreira (Parnamirim/RN)** participa na Copa.

- **Página pública** com jogos, horários, adversários e resultados
- **Painel admin** (login) para criar/editar jogos, placar, fases
- **Disparo de webhook n8n** para enviar mensagem padrão no grupo do WhatsApp ao salvar resultado
- **Modalidades**: Futsal M/F · Minicampo M · Basquete 3x3 M · Vôlei M/F · Natação (50m, 100m, 400m, Revezamento 4x50)

## Stack

- **Backend**: FastAPI + SQLAlchemy + JWT (Python)
- **Frontend**: React + Vite + TypeScript + TailwindCSS
- **Banco**: Postgres (Supabase) em produção · SQLite em dev
- **Deploy**: Vercel (front estático + Python serverless `/api/*`)

## Imagens da identidade visual

Coloque os seguintes arquivos em `frontend/public/`:

| Arquivo | Conteúdo |
|---|---|
| `segue-me.png` | Logo Segue-Me (selo amarelo) |
| `brasao.png` | Brasão da Paróquia |
| `moreirao.png` | Bandeirão "MOREIRÃO" (usado de fundo no header) |

Se os arquivos não existirem o app continua funcionando — só não exibe as imagens.

## Rodar local

### Backend

```bash
cd APP-COPA
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # ajuste as variáveis
# para SQLite local, deixe DATABASE_URL=sqlite:///./copa.db
uvicorn api.app.main:app --reload --port 8000
```

A API sobe em `http://localhost:8000/api/...`. Na primeira execução cria as tabelas, semeia as modalidades padrão e cria o admin definido em `ADMIN_USERNAME`/`ADMIN_PASSWORD`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Sobe em `http://localhost:5173` com proxy para a API em `:8000`.

## Deploy no Vercel

1. **Criar Postgres (Supabase)**
   - https://supabase.com → New Project
   - Pegar a **Connection String** (Settings → Database → URI). Exemplo:
     `postgresql://postgres.xxxx:senha@aws-...supabase.com:5432/postgres`

2. **Criar projeto no Vercel apontando para este repo**
   - Vercel detecta o `vercel.json`.
   - Em **Settings → Environment Variables**, adicione:
     - `DATABASE_URL` = string do Supabase
     - `JWT_SECRET` = uma string aleatória longa
     - `ADMIN_USERNAME` = ex. `admin`
     - `ADMIN_PASSWORD` = uma senha forte
     - `CORS_ORIGINS` = `*` (ou seu domínio)

3. **Deploy**: `vercel --prod` (ou push pra branch principal). Front e API ficam na mesma URL.

## Integração com o n8n (WhatsApp)

1. No n8n, crie um workflow com um **Webhook node** (método POST).
2. Copie a URL do webhook.
3. No app, vá em **Admin → Config → Webhook do n8n**, cole a URL e clique **Testar**.
4. O payload enviado ao disparar é:

```json
{
  "message": "texto formatado segundo o template",
  "game": {
    "id": 1, "modality": "Futsal Masculino", "phase": "Oitavas",
    "opponent": "Time X", "date": "2026-05-20", "time": "19:30",
    "home_score": 2, "away_score": 1, "status": "finished", "venue": "Ginásio Y"
  }
}
```

Para natação o payload usa `swim` no lugar de `game`.

5. No n8n, use o nó do WhatsApp (Evolution API / WhatsApp Business / Z-API etc.) para enviar `{{ $json.message }}` no grupo desejado.

## Templates de mensagem

Personalizáveis no painel **Admin → Config**. Placeholders disponíveis:

**Jogos:** `{modalidade}` `{fase}` `{data}` `{horario}` `{adversario}` `{placar_nos}` `{placar_eles}` `{status}` `{status_emoji}` `{local}` `{time_casa}` `{notas}`

**Natação:** `{distancia}` `{atleta}` `{fase}` `{bateria}` `{data}` `{horario}` `{tempo}` `{classificacao}`

## Fases por modalidade

Cada modalidade tem suas fases configuráveis (algumas começam direto nas quartas, outras só na semi). Edite em **Admin → Config → Fases por modalidade**.

## Segurança

- Senha do admin armazenada como hash bcrypt
- JWT com expiração de 7 dias
- Endpoints de leitura são **públicos**; mutações exigem token
- Webhook URL só é exposto para admin
