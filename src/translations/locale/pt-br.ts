// Português (Brasil)

import type { CommandName } from "src/settings/defaultCommands";

import type { en } from "src/translations/en";

const ui: Partial<Record<keyof typeof en, string>> = {
  dragCommandsHere: "Arraste aqui",
  add: "Adicionar",
  addSeparator: "Adicionar Separador",
  addSubmenu: "Adicionar Submenu",
  addCommandOntoEditingToolbar:
    "Adicione um comando na Barra de Ferramentas a partir da biblioteca de comandos do Obsidian. Para reordenar os comandos, arraste e solte os itens do comando. Para deletar, use o botão de deletar à direita do item do comando.",
  appearance: "Aparência",
  calloutType: "Tipo de Callout",
  cancel: "Cancelar",
  changeCommandName: "Alterar Nome do Comando",
  chooseCommand: "Escolha um comando",
  chooseIcon: "Escolha um ícone",
  closed: "Fechado",
  collapseState: "Estado de Colapso",
  default: "Padrão",
  confirm: "Confirmar",
  confirmDelete: "Confirmar Deleção?",
  content: "Conteúdo",
  customBackgroundColor: "Cor de Fundo Personalizada",
  customFontColor: "Cor de Texto Personalizada",
  customFontColors: "Cores de Fonte Personalizadas",
  customColors: "Cores Personalizadas",
  themeColors: "Cores do Tema",
  standardColors: "Cores Padrão",
  translucentColors: "Cores Translúcidas",
  highlighterColors: "Cores de Marca-Texto",
  delete: "Deletar",
  editingToolbarCommands: "Comandos da Barra de Ferramentas",
  general: "Geral",
  inputContent: "Digite o conteúdo",
  inputTitle: "Digite o título",
  insert: "Inserir",
  more: "Mais",
  open: "Abrir",
  optionalLeaveBlankDefaultTitle:
    "Opcional, deixe em branco para o título padrão",
  pleaseEnterNewName: "Por favor, digite um novo nome: ",
  reset: "Reiniciar",
  setBackgroundColorToolbar: "Definir a cor de fundo da barra de ferramentas.",
  setColorToolbarIcon: "Definir a cor do ícone da barra de ferramentas.",
  setSizeToolbarIconPx:
    "Definir o tamanho do ícone da barra de ferramentas (px); padrão: 18px",
  commandAlreadyExists: "O comando {name} já existe",
  title: "Título",
  toolbarBackgroundColor: "Cor de Fundo da Barra de Ferramentas",
  toolbarCommands: "Comandos da Barra de Ferramentas",
  toolbarIconColor: "Cor do Ícone da Barra de Ferramentas",
  toolbarIconSize: "Tamanho do Ícone da Barra de Ferramentas",
  toolbarPreviewLabel:
    "Visualização da barra de ferramentas (com uma configuração de comandos hipotética).",
  toInsert: "para inserir",
  setCustomBackground: "🎨 Definir Cor de Fundo Personalizada",
  setCustomFontColor: "🖌️ Definir Cor de Texto Personalizada",
};

export default ui;

export const commandNames: Record<CommandName, string> = {
  "Toggle toolbar": "Alternar barra de ferramentas",

  "Undo edit": "Desfazer",
  "Redo edit": "Refazer",

  "Remove header level": "Remover nível de título",
  "Header 1": "Título 1",
  "Header 2": "Título 2",
  "Header 3": "Título 3",
  "Header 4": "Título 4",
  "Header 5": "Título 5",
  "Header 6": "Título 6",

  Underline: "Sublinhado",
  Superscript: "Sobrescrito",
  Subscript: "Subscrito",
  "Clear text formatting": "Limpar formatação",
  "Change font color": "Alterar cor do texto",
  "Change background color": "Alterar cor de fundo",

  "Justify text": "Justificar",
  "Align text left": "Alinhar à esquerda",
  "Center text": "Centralizar",
  "Align text right": "Alinhar à direita",

  Callout: "Callout",

  Headings: "Títulos",
  Insert: "Inserir",
  Lists: "Listas",
  Alignment: "Alinhamento",
  Submenu: "Submenu",
  "Vertical split": "Separador",
};
