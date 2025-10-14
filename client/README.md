# 🔐 Maask E2EE Client# React + TypeScript + Vite

Cliente web React + TypeScript para demonstração completa da API de criptografia ponta a ponta (E2EE) da Maask.This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## ✨ Funcionalidades ImplementadasCurrently, two official plugins are available:

### 🔑 Autenticação- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh

- ✅ Registro de usuário- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

- ✅ Login com JWT

- ✅ Armazenamento seguro de tokens## React Compiler

### 🖥️ Gerenciamento de DispositivosThe React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

- ✅ Geração de par de chaves RSA-4096 por dispositivo

- ✅ Registro de dispositivo no servidor (apenas chave pública)## Expanding the ESLint configuration

- ✅ Setup inicial com geração de MDK (Master Decryption Key)

- ✅ Sincronização de MDK via Envelope EncryptionIf you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

- ✅ Autorização de novos dispositivos

- ✅ Revogação de dispositivos```js

- ✅ Listagem de dispositivos com statusexport default defineConfig([

  globalIgnores(['dist']),

### 📁 Gerenciamento de Arquivos com E2EE {

- ✅ Upload de arquivos com criptografia AES-256-GCM files: ['**/*.{ts,tsx}'],

- ✅ Download de arquivos com descriptografia automática extends: [

- ✅ Listagem de arquivos com metadados // Other configs...

- ✅ Progresso de upload em tempo real

- ✅ FEK (File Encryption Key) única por arquivo // Remove tseslint.configs.recommended and replace with this

- ✅ FEK criptografada com MDK antes de armazenar tseslint.configs.recommendedTypeChecked,

      // Alternatively, use this for stricter rules

## 🏗️ Arquitetura tseslint.configs.strictTypeChecked,

      // Optionally, add this for stylistic rules

```````tseslint.configs.stylisticTypeChecked,

client/

├── src/      // Other configs...

│   ├── components/          # Componentes React    ],

│   │   ├── Auth.tsx         # Login e Registro    languageOptions: {

│   │   ├── DeviceSetup.tsx  # Setup do dispositivo      parserOptions: {

│   │   ├── DeviceManager.tsx # Gerenciamento de dispositivos        project: ['./tsconfig.node.json', './tsconfig.app.json'],

│   │   └── FileManager.tsx  # Upload e Download de arquivos        tsconfigRootDir: import.meta.dirname,

│   ├── services/      },

│   │   └── api.ts           # Serviço de API (fetch)      // other options...

│   ├── utils/    },

│   │   ├── crypto.ts        # Funções de criptografia (Web Crypto API)  },

│   │   └── storage.ts       # Gerenciamento de localStorage])

│   ├── App.tsx              # App principal com navegação```

│   ├── main.tsx             # Entry point

│   └── index.css            # Estilos globaisYou can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

└── package.json

``````js

// eslint.config.js

## 🔒 Segurança Implementadaimport reactX from 'eslint-plugin-react-x'

import reactDom from 'eslint-plugin-react-dom'

### Criptografia

- **RSA-OAEP 4096 bits** para envelope encryptionexport default defineConfig([

- **AES-256-GCM** para criptografia de arquivos  globalIgnores(['dist']),

- **SHA-256** para hashing e fingerprints  {

    files: ['**/*.{ts,tsx}'],

### Armazenamento    extends: [

- **Chave privada**: localStorage (apenas no dispositivo)      // Other configs...

- **MDK**: **APENAS EM MEMÓRIA** (nunca persiste em disco)      // Enable lint rules for React

- **Tokens**: localStorage com refresh token      reactX.configs['recommended-typescript'],

- **FEK**: Criptografada com MDK antes de enviar ao servidor      // Enable lint rules for React DOM

      reactDom.configs.recommended,

## 🚀 Como Rodar    ],

    languageOptions: {

### Pré-requisitos      parserOptions: {

- Node.js 18+        project: ['./tsconfig.node.json', './tsconfig.app.json'],

- pnpm (ou npm/yarn)        tsconfigRootDir: import.meta.dirname,

- Backend da API rodando em `http://localhost:3000`      },

      // other options...

### Instalação e Execução    },

  },

```bash])

# Na pasta client```

cd client

# Instalar dependências (se necessário)
pnpm install

# Rodar em modo desenvolvimento
pnpm dev

# Acessar em: http://localhost:5173
```````

## 📖 Fluxo de Uso Completo

### 1️⃣ Primeiro Acesso

1. **Registrar**: Clique em "Não tem conta? Registre-se"
2. **Login**: Entre com suas credenciais
3. **Setup Dispositivo**: Clique em "Iniciar Setup Completo"
4. **Dashboard**: Acesso às abas Arquivos e Dispositivos

### 2️⃣ Upload de Arquivo

1. Aba "Arquivos" → "Selecionar Arquivo"
2. Sistema criptografa e faz upload automaticamente
3. Arquivo aparece na lista

### 3️⃣ Download de Arquivo

1. Clique em "Download" no arquivo desejado
2. Sistema descriptografa automaticamente
3. Arquivo é salvo no seu dispositivo

### 4️⃣ Adicionar Novo Dispositivo

**Novo Dispositivo:**

1. Faça login
2. Execute setup (ficará "Pendente")

**Dispositivo Autorizado:**

1. Aba "Dispositivos"
2. Clique em "Autorizar" no dispositivo pendente

**Novo Dispositivo (após autorização):**

1. Clique em "Apenas Recuperar MDK"
2. Pronto para usar!

### 5️⃣ Revogar Dispositivo

1. Aba "Dispositivos"
2. Clique em "Revogar"
3. Dispositivo perde acesso aos arquivos

## 🎨 Interface

- **Mensagens claras**: ✅ Sucesso | ❌ Erro | ℹ️ Info | ⏳ Progresso
- **Botões intuitivos**: Todas as ações são acessíveis via cliques
- **Feedback visual**: Progress bars, status badges, loading states

## 📝 Notas Importantes

- **MDK em memória**: Se recarregar a página, use "Recuperar MDK"
- **Limite de 500MB** por arquivo
- **CORS**: Certifique-se que o backend permite `http://localhost:5173`

## 🔍 Troubleshooting

**"MDK não encontrada"** → Clique em "Apenas Recuperar MDK"  
**"Erro 401"** → Token expirou, faça login novamente  
**"Erro ao descriptografar"** → Verifique se dispositivo tem envelope válido

## 🛠️ Tecnologias

- **React 19** + **TypeScript**
- **Vite** (build tool)
- **Web Crypto API** (criptografia nativa)
- **Fetch API** (requisições HTTP)
- **Zero dependências externas** para criptografia

---

**Projeto desenvolvido para o desafio back-end Maask** 🚀
