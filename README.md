# StudyFlow

Aplicação de gestão de estudos pessoal — organiza disciplinas, sessões de estudo, exames e planos de estudo, com sugestões e resumos automáticos por email.

## Stack

**Backend**
- FastAPI (Python)
- Firebase / Firestore (base de dados NoSQL)
- Autenticação por JWT
- Groq API (funcionalidades de IA)
- Resend (emails transacionais: boas-vindas, lembretes de exames, resumo semanal)

**Frontend**
- React + TypeScript
- Vite

## Estrutura do projeto

```
StudyFlow/
├── Backend/
│   ├── app/
│   │   ├── routers/        # Endpoints da API (auth, subjects, sessions, exams, plans, ai, export, notifications)
│   │   ├── services/       # Lógica de negócio
│   │   ├── repositories/   # Acesso a dados (Firestore)
│   │   ├── models/         # Modelos de domínio
│   │   ├── schemas/        # Schemas Pydantic (validação de request/response)
│   │   ├── core/           # Configuração, segurança, ligação ao Firebase
│   │   └── middlewares/    # Tratamento de erros
│   ├── main.py
│   ├── requirements.txt
│   └── .env.example
└── Frontend/
    ├── src/
    ├── package.json
    └── vite.config.ts
```

## Modelo de dados

Sete entidades principais: `USER`, `SUBJECT`, `STUDY_SESSION`, `EXAM`, `STUDY_PLAN`, `CHAT_HISTORY`, `SUGGESTION` (mais dois sub-documentos embutidos). Algumas decisões de modelação:

- Datas guardadas como strings ISO para permitir queries de intervalo lexicográficas no Firestore
- Desnormalização intencional em `STUDY_PLAN` para otimizar leituras
- Integridade referencial garantida na camada de serviço via Pydantic (o Firestore não a impõe nativamente)
- Chamadas de email implementadas como fire-and-forget assíncronas, para que falhas no envio nunca bloqueiem os fluxos principais da app

## Como correr localmente

### Backend

```bash
cd Backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Preenche o .env com as tuas chaves (Firebase, Groq, Resend)
# Coloca o teu serviceAccountKey.json nesta pasta (não é versionado)

uvicorn main:app --reload
```

### Frontend

```bash
cd Frontend
npm install

cp .env.example .env   # se aplicável
npm run dev
```

## Variáveis de ambiente

Ver `Backend/.env.example` para a lista completa. Nunca commitar `.env` nem `serviceAccountKey.json` — ambos estão no `.gitignore`.

## Licença

Projeto pessoal, desenvolvido para fins de demonstração e portfólio.
