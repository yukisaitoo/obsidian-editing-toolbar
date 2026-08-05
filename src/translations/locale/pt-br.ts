// Português (Brasil)

import type { en } from "../en";

const ui: Partial<Record<keyof typeof en, string>> = {
  dragCommandsHere: "Arraste aqui",
  add: "Adicionar",
  addSeparator: "Adicionar Separador",
  addSubmenu: "Adicionar Submenu",
  addCommandOntoEditingToolbar:
    "Adicione um comando na Barra de Ferramentas a partir da biblioteca de comandos do Obsidian. Para reordenar os comandos, arraste e solte os itens do comando. Para deletar, use o botão de deletar à direita do item do comando.",
  appearance: "Aparência",
  backgroundColor: "Cor de Fundo",
  calloutType: "Tipo de Callout",
  cancel: "Cancelar",
  changeCommandName: "Alterar Nome do Comando",
  chooseCommand: "Escolha um comando",
  chooseIcon2: "Escolha um ícone",
  chooseHowImportConfiguration: "Escolha como importar a configuração",
  closed: "Fechado",
  collapseState: "Estado de Colapso",
  default: "Padrão",
  configurationCopiedClipboard:
    "Configuração copiada para a área de transferência",
  configurationImportedSuccessfully: "Configuração importada com sucesso",
  confirm: "Confirmar",
  confirmDelete: "Confirmar Deleção?",
  content: "Conteúdo",
  copyClipboard: "Copiar para a área de transferência",
  customBackgroundColor: "Cor de Fundo Personalizada",
  customFontColor: "Cor de Texto Personalizada",
  customFontColors: "Cores de Fonte Personalizadas",
  customColors: "Cores Personalizadas",
  themeColors: "Cores do Tema",
  standardColors: "Cores Padrão",
  translucentColors: "Cores Translúcidas",
  highlighterColors: "Cores de Marca-Texto",
  delete: "Deletar",
  doWantContinue: "Deseja continuar?",
  editingToolbarCommands: "Comandos da Barra de Ferramentas",
  error: "Erro: ",
  export: "Exportar",
  exportConfiguration: "Exportar Configuração",
  exportToolbarConfigurationShareOthers:
    "Exportar sua configuração da barra de ferramentas para compartilhar com outros.",
  exportGenerateJsonConfigurationCan:
    "Exportar: Gerar uma configuração em formato JSON para salvar ou compartilhar.",
  failedCopyConfiguration: "Falha ao copiar configuração",
  fontColors: "Cores de Texto",
  general: "Geral",
  import: "Importar",
  importConfiguration: "Configuração de Importação",
  importMode: "Modo de Importação",
  importToolbarConfigurationJson:
    "Importar configuração da barra de ferramentas em formato JSON.",
  importExport: "Importar/Exportar",
  importPastePreviouslyExportedJson:
    "Importar: Colar uma configuração em formato JSON exportada anteriormente.",
  inputContent: "Digite o conteúdo",
  inputTitle: "Digite o título",
  insert: "Inserir",
  invalidImportDataFormat: "Formato de dados de importação inválido",
  loading: "Carregando...",
  more: "Mais",
  validConfigurationFoundImportData:
    "Nenhuma configuração válida encontrada nos dados de importação",
  open: "Abrir",
  optionalLeaveBlankDefaultTitle:
    "Opcional, deixe em branco para o título padrão",
  overwriteImport: "Sobrescrever Importação",
  overwriteModeReplaceSettingsImported:
    "Modo de Sobrescrever (Substituir configurações com as importadas)",
  pasteConfigurationHere: "Colar configuração aqui...",
  pleaseEnterNewName: "Por favor, digite um novo nome: ",
  pleasePasteConfigurationDataFirst:
    "Por favor coloque os dados da configuração primeiro",
  pleaseSelectTextFirst: "Por favor selecione o texto primeiro",
  renumberList: "Renumerar Lista",
  reset: "Reiniciar",
  setBackgroundColorToolbar: "Definir a cor de fundo da barra de ferramentas.",
  setColorToolbarIcon: "Definir a cor do ícone da barra de ferramentas.",
  setSizeToolbarIconPx:
    "Definir o tamanho do ícone da barra de ferramentas (px); padrão: 18px",
  commandAlreadyExists: "O comando {name} já existe",
  import3: "Esta importação irá:",
  title: "Título",
  toolbarBackgroundColor: "Cor de Fundo da Barra de Ferramentas",
  toolbarCommands: "Comandos da Barra de Ferramentas",
  toolbarIconColor: "Cor do Ícone da Barra de Ferramentas",
  toolbarIconSize: "Tamanho do Ícone da Barra de Ferramentas",
  toolbarPreviewHypotheticalCommandConfigurati:
    "Visualização da barra de ferramentas (com uma configuração de comandos hipotética).",
  updateImport: "Atualizar Importação",
  updateModeAddNewItems:
    "Modo de Atualização (Adicionar novos itens e atualizar os existentes)",
  updateGeneralSettings: "Atualizar configurações gerais",
  usageInstructions: "Instruções de Uso",
  verticalSplit: "Divisão Vertical",
  warningImportingConfigurationOverwriteCurren:
    "Aviso: A importação de configuração irá sobrescrever suas configurações atuais. Considere exportar sua configuração atual primeiro como backup.",
  warningOverwriteModeReplaceExisting:
    "Aviso: O modo de sobrescrever irá substituir todas as suas configurações atuais com as importadas.",
  warningUpdateModeAddNew:
    "Aviso: O modo de atualização irá adicionar novos itens e atualizar os existentes com base na configuração importada.",
  insert2: "para inserir",
  updateModeMergeImportedSettings:
    "ℹ️ O modo de atualização irá adicionar novos itens e atualizar os existentes com base na configuração importada.",
  overwriteModeReplaceExistingSettings:
    "⚠️ O modo de sobrescrever irá substituir todas as suas configurações atuais com as importadas.",
  setCustomBackground: "🎨 Definir Cor de Fundo Personalizada",
  setCustomFontColor: "🖌️ Definir Cor de Texto Personalizada",
};

export default ui;

export const commandNames: Record<string, string> = {
  "All commands": "Todos os Comandos",
};
